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
const dashboardRoutes = require('./routes/dashboard');
const db = require('./db');
const { worker, checkAndUpdateProjectStatus } = require('./queue');

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
// Bulk endpoints
app.use('/api/project-sessions', projectSessionsRoutes);
app.use('/api/project-targets', projectTargetsRoutes);
app.use('/api/project-messages', projectMessagesRoutes);
app.use('/internal', internalRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'telegram-app-backend' });
});

// Initialize database
db.initDB();

// Ensure worker is running and track job completion
worker.on('completed', async (job) => {
  console.log(`Job ${job.id} completed successfully`);
  
  // Increment completed_jobs counter
  const { run_id, project_id } = job.data;
  if (run_id && project_id) {
    const updateSql = `
      UPDATE process_runs 
      SET stats = json_set(
        coalesce(stats, '{}'), 
        '$.completed_jobs',
        coalesce(json_extract(stats, '$.completed_jobs'), 0) + 1
      )
      WHERE id = ?
    `;
    
    db.db.run(updateSql, [run_id], async (err) => {
      if (err) {
        console.error('Error updating completed_jobs:', err);
      } else {
        // Check if all jobs are complete
        await checkAndUpdateProjectStatus(run_id, project_id);
      }
    });
  }
});

worker.on('failed', async (job, err) => {
  console.log(`Job ${job.id} failed with error: ${err.message}`);
  
  // Also increment completed_jobs on final failure (after all retries exhausted)
  if (job.attemptsMade >= job.opts.attempts) {
    console.log(`Job ${job.id} exhausted all retries, marking as completed`);
    
    const { run_id, project_id } = job.data;
    if (run_id && project_id) {
      const updateSql = `
        UPDATE process_runs 
        SET stats = json_set(
          coalesce(stats, '{}'), 
          '$.completed_jobs',
          coalesce(json_extract(stats, '$.completed_jobs'), 0) + 1
        )
        WHERE id = ?
      `;
      
      db.db.run(updateSql, [run_id], async (updateErr) => {
        if (updateErr) {
          console.error('Error updating completed_jobs on failure:', updateErr);
        } else {
          // Check if all jobs are complete
          await checkAndUpdateProjectStatus(run_id, project_id);
        }
      });
    }
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;