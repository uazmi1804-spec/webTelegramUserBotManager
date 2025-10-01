const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const router = express.Router();

// GET /api/sessions - list sessions
router.get('/', (req, res) => {
  const sql = 'SELECT id, name, first_name, last_name, username, login_at FROM sessions ORDER BY created_at DESC';
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true, data: rows });
  });
});

// POST /api/sessions - create session (manual add via existing flow)
router.post('/', (req, res) => {
  const { name, session_string } = req.body;
  const id = uuidv4();
  if (!session_string) {
    return res.status(400).json({ success: false, error: 'Session string is required' });
  }
  const sql = 'INSERT INTO sessions (id, name, session_string, is_active) VALUES (?, ?, ?, 1)';
  db.run(sql, [id, name, session_string], function(err) {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    res.status(201).json({ success: true, data: { id, name } });
  });
});

// POST /api/sessions/register_string - register session using session_string directly
router.post('/register_string', async (req, res) => {
  const axios = require('axios');
  const { api_id, api_hash, session_string } = req.body;
  
  if (!api_id || !api_hash || !session_string) {
    return res.status(400).json({ success: false, error: 'api_id, api_hash, and session_string are required' });
  }
  
  try {
    // Call python service to register session with session_string
    const pyRes = await axios.post(
      `${process.env.PYTHON_SERVICE_URL || 'http://localhost:8000'}/register_session_string`,
      { api_id, api_hash, session_string },
      { headers: { 'x-internal-secret': process.env.INTERNAL_SECRET } }
    );

    if (!pyRes.data?.success) {
      return res.status(400).json({ success: false, error: 'Failed to register session' });
    }

    const me = pyRes.data.data;
    const exported_session_string = pyRes.data.session_string;

    const id = uuidv4();
    const name = `${me.first_name || ''} ${me.last_name || ''}`.trim() || me.username || 'Telegram User';
    const currentTime = new Date().toISOString();
    const sql = `INSERT INTO sessions (id, name, session_string, tg_id, first_name, last_name, username, phone_number, login_at, is_active)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`;
    db.run(sql, [id, name, exported_session_string, me.id || null, me.first_name || null, me.last_name || null, me.username || null, me.phone_number || null, currentTime], function(err) {
      if (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
      return res.status(201).json({ success: true, data: { id, first_name: me.first_name, last_name: me.last_name, username: me.username } });
    });
  } catch (e) {
    const msg = e.response?.data?.detail || e.message;
    return res.status(400).json({ success: false, error: msg });
  }
});

// POST /api/sessions/phone/send_code - send login code to phone
router.post('/phone/send_code', async (req, res) => {
  try {
    const internalRes = await require('axios').post(
      `${process.env.PYTHON_SERVICE_URL || 'http://localhost:8000'}/export_session`,
      req.body,
      { headers: { 'x-internal-secret': process.env.INTERNAL_SECRET } }
    );
    return res.json(internalRes.data);
  } catch (e) {
    const msg = e.response?.data?.detail || e.message;
    return res.status(400).json({ success: false, error: msg });
  }
});

// POST /api/sessions/phone/complete - complete auth with code (and optional password)
router.post('/phone/complete', async (req, res) => {
  const axios = require('axios');
  const { session_id, phone_code, password, api_id, api_hash } = req.body;
  try {
    // call python complete_auth; it may need password - we forward it
    const pyRes = await axios.post(
      `${process.env.PYTHON_SERVICE_URL || 'http://localhost:8000'}/complete_auth`,
      { session_id, phone_code, password, api_id, api_hash },
      { headers: { 'x-internal-secret': process.env.INTERNAL_SECRET } }
    );

    if (!pyRes.data?.success) {
      return res.status(400).json({ success: false, error: 'Failed to complete authentication' });
    }

    const session_string = pyRes.data.session_string;
    // fetch user info to store
    const meRes = await axios.get(
      `${process.env.PYTHON_SERVICE_URL || 'http://localhost:8000'}/get_me`,
      {
        headers: { 'x-internal-secret': process.env.INTERNAL_SECRET },
        params: { session_string }
      }
    );
    const me = meRes.data?.data || {};

    const id = uuidv4();
    const name = `${me.first_name || ''} ${me.last_name || ''}`.trim() || me.username || 'Telegram User';
    const currentTime = new Date().toISOString();
    const sql = `INSERT INTO sessions (id, name, session_string, tg_id, first_name, last_name, username, phone_number, login_at, is_active)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`;
    db.run(sql, [id, name, session_string, me.id || null, me.first_name || null, me.last_name || null, me.username || null, me.phone_number || null, currentTime], function(err) {
      if (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
      return res.status(201).json({ success: true, data: { id, first_name: me.first_name, last_name: me.last_name, username: me.username } });
    });
  } catch (e) {
    const msg = e.response?.data?.detail || e.message;
    return res.status(400).json({ success: false, error: msg });
  }
});

// PUT /api/sessions/:id - update session
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, is_active } = req.body;
  
  const sql = 'UPDATE sessions SET name = ?, is_active = ?, updated_at = datetime("now") WHERE id = ?';
  db.run(sql, [name, is_active, id], function(err) {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    res.json({ success: true, data: { id, name, is_active } });
  });
});

// PUT /api/sessions/:id/update_data - update session data using session_string
router.put('/:id/update_data', async (req, res) => {
  const axios = require('axios');
  const { id } = req.params;
  const { api_id, api_hash } = req.body;
  
  try {
    // Get session from database
    const getSessionSql = 'SELECT session_string FROM sessions WHERE id = ?';
    db.get(getSessionSql, [id], async (err, session) => {
      if (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
      if (!session) {
        return res.status(404).json({ success: false, error: 'Session not found' });
      }
      
      try {
        // Call python service to get updated user info
        const pyRes = await axios.post(
          `${process.env.PYTHON_SERVICE_URL || 'http://localhost:8000'}/register_session_string`,
          { api_id, api_hash, session_string: session.session_string },
          { headers: { 'x-internal-secret': process.env.INTERNAL_SECRET } }
        );

        if (!pyRes.data?.success) {
          return res.status(400).json({ success: false, error: 'Failed to update session data' });
        }

        const me = pyRes.data.data;
        const exported_session_string = pyRes.data.session_string;

        // Update session in database
        const name = `${me.first_name || ''} ${me.last_name || ''}`.trim() || me.username || 'Telegram User';
        const currentTime = new Date().toISOString();
        const updateSql = `UPDATE sessions SET name = ?, session_string = ?, tg_id = ?, first_name = ?, last_name = ?, username = ?, phone_number = ?, login_at = ?, updated_at = ? WHERE id = ?`;
        db.run(updateSql, [name, exported_session_string, me.id || null, me.first_name || null, me.last_name || null, me.username || null, me.phone_number || null, currentTime, currentTime, id], function(err) {
          if (err) {
            return res.status(500).json({ success: false, error: err.message });
          }
          return res.json({ success: true, data: { id, first_name: me.first_name, last_name: me.last_name, username: me.username } });
        });
      } catch (e) {
        const msg = e.response?.data?.detail || e.message;
        return res.status(400).json({ success: false, error: msg });
      }
    });
  } catch (e) {
    const msg = e.response?.data?.detail || e.message;
    return res.status(400).json({ success: false, error: msg });
  }
});


// DELETE /api/sessions/:id - delete session
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  const sql = 'DELETE FROM sessions WHERE id = ?';
  db.run(sql, [id], function(err) {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    res.json({ success: true, message: 'Session deleted successfully' });
  });
});

module.exports = router;