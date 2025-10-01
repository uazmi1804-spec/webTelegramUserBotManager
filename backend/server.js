require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sessionRoutes = require('./routes/sessions');
const credentialRoutes = require('./routes/credentials');
const channelRoutes = require('./routes/channels');
const categoryRoutes = require('./routes/categories');
const fileRoutes = require('./routes/files');
const projectRoutes = require('./routes/projects');
const projectTargetsRoutes = require('./routes/projectTargets');
const projectSessionsRoutes = require('./routes/projectSessions');
const projectMessagesRoutes = require('./routes/projectMessages');
const delaysRoutes = require('./routes/delays');
const internalRoutes = require('./routes/internal');
const db = require('./db');
const { worker } = require('./queue');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/sessions', sessionRoutes);
app.use('/api/credentials', credentialRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/projects', projectTargetsRoutes);
app.use('/api/projects', projectSessionsRoutes);
app.use('/api/projects', projectMessagesRoutes);
app.use('/api/projects', delaysRoutes);
app.use('/internal', internalRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'telegram-app-backend' });
});

// Initialize database
db.initDB();

// Ensure worker is running
worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});
worker.on('failed', (job, err) => {
  console.log(`Job ${job.id} failed with error: ${err.message}`);
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;