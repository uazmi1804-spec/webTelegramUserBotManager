const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const router = express.Router();

// POST /api/project-messages - add message to project (with file_id)
router.post('/', (req, res) => {
  const { project_id, file_id } = req.body;
  const message_id = uuidv4();
  
  console.log('[Project Messages] Adding message:', { project_id, file_id });
  
  if (!project_id || !file_id) {
    console.error('[Project Messages] Missing required fields');
    return res.status(400).json({ success: false, error: 'Project ID and file ID are required' });
  }
  
  // Get file info to determine message type
  const getFileSql = 'SELECT file_type, filename FROM files WHERE id = ?';
  db.get(getFileSql, [file_id], (err, file) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    if (!file) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }
    
    const message_type = file.file_type; // 'text', 'photo', 'video', etc.
    const content_ref = file_id;
    
    const sql = 'INSERT INTO project_messages (id, project_id, message_type, content_ref, caption) VALUES (?, ?, ?, ?, ?)';
    db.run(sql, [message_id, project_id, message_type, content_ref, null], function(insertErr) {
      if (insertErr) {
        console.error('[Project Messages] Insert error:', insertErr.message);
        return res.status(500).json({ success: false, error: insertErr.message });
      }
      console.log('[Project Messages] Message added successfully:', message_id);
      res.status(201).json({ 
        success: true, 
        data: { 
          id: message_id, 
          project_id, 
          message_type, 
          content_ref,
          file_id
        } 
      });
    });
  });
});

// POST /api/projects/:id/messages - add message to project
router.post('/:id/messages', (req, res) => {
  const { id } = req.params; // project id
  const { message_type, content_ref, caption } = req.body;
  const message_id = uuidv4();
  
  if (!message_type || !content_ref) {
    return res.status(400).json({ success: false, error: 'Message type and content reference are required' });
  }
  
  const sql = 'INSERT INTO project_messages (id, project_id, message_type, content_ref, caption) VALUES (?, ?, ?, ?, ?)';
  db.run(sql, [message_id, id, message_type, content_ref, caption], function(err) {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    res.status(201).json({ 
      success: true, 
      data: { 
        id: message_id, 
        project_id: id, 
        message_type, 
        content_ref, 
        caption 
      } 
    });
  });
});

// GET /api/projects/:id/messages - get messages for project
router.get('/:id/messages', (req, res) => {
  const { id } = req.params; // project id
  
  const sql = 'SELECT * FROM project_messages WHERE project_id = ?';
  db.all(sql, [id], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true, data: rows });
  });
});

// DELETE /api/projects/:id/messages/:message_id - remove message from project
router.delete('/:id/messages/:message_id', (req, res) => {
  const { id, message_id } = req.params; // project id and message id
  
  const sql = 'DELETE FROM project_messages WHERE id = ? AND project_id = ?';
  db.run(sql, [message_id, id], function(err) {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ success: false, error: 'Message not found for this project' });
    }
    res.json({ success: true, message: 'Message removed from project successfully' });
  });
});

module.exports = router;