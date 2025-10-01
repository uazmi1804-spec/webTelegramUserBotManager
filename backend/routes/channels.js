const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
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

// POST /api/channels/bulk - add multiple channels from text
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
  
  const sql = 'INSERT INTO channels (id, username) VALUES (?, ?)';
  const results = [];
  let completed = 0;
  let errors = [];
  
  validUsernames.forEach((username, index) => {
    const id = uuidv4();
    db.run(sql, [id, username], function(err) {
      if (err) {
        errors.push({ username, error: err.message });
      } else {
        results.push({ id, username });
      }
      
      completed++;
      if (completed === validUsernames.length) {
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
      }
    });
  });
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
  
  const sql = 'DELETE FROM channels WHERE id = ?';
  db.run(sql, [id], function(err) {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ success: false, error: 'Channel not found' });
    }
    res.json({ success: true, message: 'Channel deleted successfully' });
  });
});

module.exports = router;