const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const router = express.Router();

// POST /api/projects/:id/delays - set delay configuration for project
router.post('/:id/delays', (req, res) => {
  const { id } = req.params; // project id
  const { delay_between_channels_ms, delay_between_sessions_ms, jitter_min_ms, jitter_max_ms } = req.body;
  const delay_id = uuidv4();
  
  const sql = 'INSERT INTO delays (id, project_id, delay_between_channels_ms, delay_between_sessions_ms, jitter_min_ms, jitter_max_ms) VALUES (?, ?, ?, ?, ?, ?)';
  db.run(sql, [delay_id, id, delay_between_channels_ms, delay_between_sessions_ms, jitter_min_ms, jitter_max_ms], function(err) {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    res.status(201).json({ 
      success: true, 
      data: { 
        id: delay_id, 
        project_id: id, 
        delay_between_channels_ms, 
        delay_between_sessions_ms, 
        jitter_min_ms, 
        jitter_max_ms 
      } 
    });
  });
});

// GET /api/projects/:id/delays - get delay configuration for project
router.get('/:id/delays', (req, res) => {
  const { id } = req.params; // project id
  
  const sql = 'SELECT * FROM delays WHERE project_id = ?';
  db.get(sql, [id], (err, row) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    if (!row) {
      return res.json({ success: true, data: null });
    }
    res.json({ success: true, data: row });
  });
});

// PUT /api/projects/:id/delays - update delay configuration for project
router.put('/:id/delays', (req, res) => {
  const { id } = req.params; // project id
  const { delay_between_channels_ms, delay_between_sessions_ms, jitter_min_ms, jitter_max_ms } = req.body;
  
  const sql = 'UPDATE delays SET delay_between_channels_ms = ?, delay_between_sessions_ms = ?, jitter_min_ms = ?, jitter_max_ms = ? WHERE project_id = ?';
  db.run(sql, [delay_between_channels_ms, delay_between_sessions_ms, jitter_min_ms, jitter_max_ms, id], function(err) {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ success: false, error: 'Delay configuration not found for this project' });
    }
    res.json({ success: true, message: 'Delay configuration updated successfully' });
  });
});

module.exports = router;