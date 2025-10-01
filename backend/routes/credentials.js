const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const router = express.Router();

// POST /api/credentials - store api_id/api_hash
router.post('/', (req, res) => {
  const { name, api_id, api_hash, owner } = req.body;
  const id = uuidv4();
  
  if (!api_id || !api_hash) {
    return res.status(400).json({ success: false, error: 'API ID and API hash are required' });
  }
  
  const sql = 'INSERT INTO api_credentials (id, name, api_id, api_hash, owner, is_active) VALUES (?, ?, ?, ?, ?, ?)';
  db.run(sql, [id, name, api_id, api_hash, owner, 1], function(err) {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    res.status(201).json({ success: true, data: { id, name, api_id, api_hash, owner, is_active: 1 } });
  });
});

// GET /api/credentials - list credentials
router.get('/', (req, res) => {
  const sql = 'SELECT id, name, api_id, api_hash, owner, is_active FROM api_credentials ORDER BY name ASC';
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true, data: rows });
  });
});

// GET /api/credentials/active - get the active credential (if any)
router.get('/active', (req, res) => {
  const sql = 'SELECT id, name, api_id, api_hash, owner, is_active FROM api_credentials WHERE is_active = 1 LIMIT 1';
  db.get(sql, [], (err, row) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true, data: row || null });
  });
});

// PUT /api/credentials/:id/activate - set a credential as active (and deactivate others)
router.put('/:id/activate', (req, res) => {
  const { id } = req.params;
  db.serialize(() => {
    db.run('UPDATE api_credentials SET is_active = 0', [], function(err) {
      if (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
      db.run('UPDATE api_credentials SET is_active = 1 WHERE id = ?', [id], function(err2) {
        if (err2) {
          return res.status(500).json({ success: false, error: err2.message });
        }
        return res.json({ success: true });
      });
    });
  });
});

module.exports = router;