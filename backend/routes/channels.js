const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const { cleanupProjectsWithNoTargets } = require('../utils/projectCleanup');
const router = express.Router();

// POST /api/channels - add channel
router.post('/', (req, res) => {
  const { username } = req.body;
  const id = uuidv4();
  
  if (!username) {
    return res.status(400).json({ success: false, error: 'Username is required' });
  }
  
  const sql = 'INSERT INTO channels (id, username) VALUES (?, ?)';
  db.run(sql, [id, username], function(err) {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    res.status(201).json({ success: true, data: { id, username } });
  });
});

// POST /api/channels/bulk - add multiple channels from text (optimized)
router.post('/bulk', (req, res) => {
  const { usernames } = req.body;
  
  if (!usernames || !Array.isArray(usernames)) {
    return res.status(400).json({ success: false, error: 'Usernames array is required' });
  }
  
  const validUsernames = usernames
    .map(u => u.trim())
    .filter(u => u.length > 0)
    .map(u => u.startsWith('@') ? u : '@' + u);
  
  if (validUsernames.length === 0) {
    return res.status(400).json({ success: false, error: 'No valid usernames provided' });
  }
  
  // Use batch insert for better performance
  const results = [];
  const errors = [];
  
  // Prepare batch insert
  const placeholders = validUsernames.map(() => '(?, ?)').join(', ');
  const sql = `INSERT INTO channels (id, username) VALUES ${placeholders}`;
  
  const values = [];
  const channelData = [];
  
  validUsernames.forEach(username => {
    const id = uuidv4();
    values.push(id, username);
    channelData.push({ id, username });
  });
  
  // Execute batch insert
  db.run(sql, values, function(err) {
    if (err) {
      // If batch fails, fall back to individual inserts
      console.log('Batch insert failed, falling back to individual inserts');
      
      let completed = 0;
      validUsernames.forEach((username, index) => {
        const id = uuidv4();
        const singleSql = 'INSERT INTO channels (id, username) VALUES (?, ?)';
        db.run(singleSql, [id, username], function(singleErr) {
          if (singleErr) {
            // Check if it's a duplicate
            if (singleErr.message.includes('UNIQUE')) {
              errors.push({ username, error: 'Already exists' });
            } else {
              errors.push({ username, error: singleErr.message });
            }
          } else {
            results.push({ id, username });
          }
          
          completed++;
          if (completed === validUsernames.length) {
            sendResponse();
          }
        });
      });
    } else {
      // Batch insert successful
      results.push(...channelData);
      sendResponse();
    }
  });
  
  const sendResponse = () => {
    if (errors.length > 0) {
      res.status(207).json({ 
        success: true, 
        data: results,
        errors: errors,
        message: `Added ${results.length} channels, ${errors.length} failed`
      });
    } else {
      res.status(201).json({ success: true, data: results });
    }
  };
});

// GET /api/channels - get all channels
router.get('/', (req, res) => {
  const sql = 'SELECT id, username FROM channels ORDER BY id';
  
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true, data: rows });
  });
});

// DELETE /api/channels/:id - delete channel
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  // First, check if channel exists and get info
  const checkSql = 'SELECT id, username FROM channels WHERE id = ?';
  db.get(checkSql, [id], (err, channel) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    if (!channel) {
      return res.status(404).json({ success: false, error: 'Channel not found' });
    }
    
    // Delete from category_channels (will cascade automatically, but explicit for clarity)
    const deleteCategoryChannelsSql = 'DELETE FROM category_channels WHERE channel_id = ?';
    db.run(deleteCategoryChannelsSql, [id], (catErr) => {
      if (catErr) {
        console.error('Error deleting category_channels:', catErr);
      }
      
      // Find affected projects before deleting targets
      const findProjectsSql = 'SELECT DISTINCT project_id FROM project_targets WHERE channel_id = ?';
      db.all(findProjectsSql, [id], async (projErr, projectRefs) => {
        if (projErr) {
          console.error('Error finding projects:', projErr);
        }
        
        // Delete from project_targets (important: remove orphaned targets)
        const deleteProjectTargetsSql = 'DELETE FROM project_targets WHERE channel_id = ?';
        db.run(deleteProjectTargetsSql, [id], async (targetErr) => {
          if (targetErr) {
            console.error('Error deleting project_targets:', targetErr);
          }
          
          // Check and delete projects with no targets left
          let deletedProjects = [];
          if (projectRefs && projectRefs.length > 0) {
            try {
              const cleanup = await cleanupProjectsWithNoTargets();
              deletedProjects = cleanup.deleted || [];
            } catch (cleanupErr) {
              console.error('Error cleaning up projects:', cleanupErr);
            }
          }
          
          // Finally, delete the channel itself
          const deleteChannelSql = 'DELETE FROM channels WHERE id = ?';
          db.run(deleteChannelSql, [id], function(deleteErr) {
            if (deleteErr) {
              return res.status(500).json({ success: false, error: deleteErr.message });
            }
            
            res.json({ 
              success: true, 
              message: `Channel "${channel.username}" deleted successfully`,
              details: {
                channel_deleted: true,
                categories_cleaned: true,
                projects_affected: projectRefs ? projectRefs.length : 0,
                projects_deleted: deletedProjects.length,
                deleted_projects: deletedProjects
              }
            });
          });
        });
      });
    });
  });
});

module.exports = router;