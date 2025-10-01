const express = require('express');
const axios = require('axios');
const router = express.Router();

// Configuration to communicate with Python service
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

// Middleware to authenticate internal requests
const authenticateInternal = (req, res, next) => {
  const secret = req.headers['x-internal-secret'];
  if (secret !== process.env.INTERNAL_SECRET) {
    return res.status(403).json({ success: false, error: 'Forbidden: Invalid internal secret' });
  }
  next();
};

// Apply authentication middleware to all internal routes
router.use(authenticateInternal);

// POST /internal/pyrogram/export_session
router.post('/pyrogram/export_session', async (req, res) => {
  try {
    const response = await axios.post(`${PYTHON_SERVICE_URL}/export_session`, req.body);
    res.json(response.data);
  } catch (error) {
    console.error('Error calling Python export_session:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /internal/pyrogram/complete_auth
router.post('/pyrogram/complete_auth', async (req, res) => {
  try {
    const response = await axios.post(`${PYTHON_SERVICE_URL}/complete_auth`, req.body);
    res.json(response.data);
  } catch (error) {
    console.error('Error calling Python complete_auth:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /internal/pyrogram/send_message
router.post('/pyrogram/send_message', async (req, res) => {
  try {
    const response = await axios.post(`${PYTHON_SERVICE_URL}/send_message`, req.body);
    res.json(response.data);
  } catch (error) {
    console.error('Error calling Python send_message:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /internal/pyrogram/get_chat
router.get('/pyrogram/get_chat', async (req, res) => {
  try {
    const response = await axios.get(`${PYTHON_SERVICE_URL}/get_chat`, { params: req.query });
    res.json(response.data);
  } catch (error) {
    console.error('Error calling Python get_chat:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /internal/pyrogram/get_chat_history
router.get('/pyrogram/get_chat_history', async (req, res) => {
  try {
    const response = await axios.get(`${PYTHON_SERVICE_URL}/get_chat_history`, { params: req.query });
    res.json(response.data);
  } catch (error) {
    console.error('Error calling Python get_chat_history:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /internal/pyrogram/get_me
router.get('/pyrogram/get_me', async (req, res) => {
  try {
    const response = await axios.get(`${PYTHON_SERVICE_URL}/get_me`, { params: req.query });
    res.json(response.data);
  } catch (error) {
    console.error('Error calling Python get_me:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /internal/pyrogram/reply
router.post('/pyrogram/reply', async (req, res) => {
  try {
    const response = await axios.post(`${PYTHON_SERVICE_URL}/reply`, req.body);
    res.json(response.data);
  } catch (error) {
    console.error('Error calling Python reply:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;