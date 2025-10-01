const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const router = express.Router();

// POST /api/projects/:id/targets - add target channel to project
router.post('/:id/targets', (req, res) => {
  const { id } = req.params; // project id
  const { channel_id, priority } = req.body;
  const target_id = uuidv4();
  
  if (!channel_id) {
    return res.status(400).json({ success: false, error: 'Channel ID is required' });
  }
  
  const sql = 'INSERT INTO project_targets (id, project_id, channel_id, priority) VALUES (?, ?, ?, ?)';
  db.run(sql, [target_id, id, channel_id, priority || 0], function(err) {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    res.status(201).json({ 
      success: true, 
      data: { 
        id: target_id, 
        project_id: id, 
        channel_id, 
        priority: priority || 0 
      } 
    });
  });
});

// GET /api/projects/:id/targets - get target channels for project
router.get('/:id/targets', (req, res) => {
  const { id } = req.params; // project id
  
  const sql = 'SELECT * FROM project_targets WHERE project_id = ? ORDER BY priority DESC';
  db.all(sql, [id], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true, data: rows });
  });
});

// DELETE /api/projects/:id/targets/:target_id - remove target channel from project
router.delete('/:id/targets/:target_id', (req, res) => {
  const { id, target_id } = req.params; // project id and target id
  
  const sql = 'DELETE FROM project_targets WHERE id = ? AND project_id = ?';
  db.run(sql, [target_id, id], function(err) {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ success: false, error: 'Target not found' });
    }
    res.json({ success: true, message: 'Target removed successfully' });
  });
});

module.exports = router;