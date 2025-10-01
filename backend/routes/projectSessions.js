const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const router = express.Router();

// POST /api/project-sessions - bulk add sessions to project
router.post('/', (req, res) => {
  const { project_id, session_ids, selection_mode } = req.body;
  
  if (!project_id || !session_ids || !Array.isArray(session_ids)) {
    return res.status(400).json({ success: false, error: 'Project ID and session IDs array are required' });
  }
  
  if (session_ids.length === 0) {
    return res.json({ success: true, data: [] });
  }
  
  const mode = selection_mode || 'random'; // Default to random
  
  const insertPromises = session_ids.map(session_id => {
    return new Promise((resolve, reject) => {
      const project_session_id = uuidv4();
      const sql = 'INSERT INTO project_sessions (id, project_id, session_id, selection_mode) VALUES (?, ?, ?, ?)';
      db.run(sql, [project_session_id, project_id, session_id, mode], function(err) {
        if (err) reject(err);
        else resolve({ id: project_session_id, project_id, session_id, selection_mode: mode });
      });
    });
  });
  
  Promise.all(insertPromises)
    .then(results => res.status(201).json({ success: true, data: results }))
    .catch(err => res.status(500).json({ success: false, error: err.message }));
});

// POST /api/projects/:id/sessions - add session to project
router.post('/:id/sessions', (req, res) => {
  const { id } = req.params; // project id
  const { session_id, selection_mode } = req.body;
  const project_session_id = uuidv4();
  
  if (!session_id) {
    return res.status(400).json({ success: false, error: 'Session ID is required' });
  }
  
  const sql = 'INSERT INTO project_sessions (id, project_id, session_id, selection_mode) VALUES (?, ?, ?, ?)';
  db.run(sql, [project_session_id, id, session_id, selection_mode || 'manual'], function(err) {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    res.status(201).json({ 
      success: true, 
      data: { 
        id: project_session_id, 
        project_id: id, 
        session_id, 
        selection_mode: selection_mode || 'manual' 
      } 
    });
  });
});

// GET /api/projects/:id/sessions - get sessions for project
router.get('/:id/sessions', (req, res) => {
  const { id } = req.params; // project id
  
  const sql = 'SELECT * FROM project_sessions WHERE project_id = ?';
  db.all(sql, [id], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true, data: rows });
  });
});

// DELETE /api/projects/:id/sessions/:session_id - remove session from project
router.delete('/:id/sessions/:session_id', (req, res) => {
  const { id, session_id } = req.params; // project id and session id
  
  const sql = 'DELETE FROM project_sessions WHERE session_id = ? AND project_id = ?';
  db.run(sql, [session_id, id], function(err) {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ success: false, error: 'Session not found for this project' });
    }
    res.json({ success: true, message: 'Session removed from project successfully' });
  });
});

module.exports = router;