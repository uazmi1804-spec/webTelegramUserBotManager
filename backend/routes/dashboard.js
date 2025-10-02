const express = require('express');
const { db } = require('../db');
const router = express.Router();

// GET /api/dashboard/stats - get dashboard statistics
router.get('/stats', (req, res) => {
  const stats = {};
  
  // Get project stats
  const projectStatsSql = `
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running,
      SUM(CASE WHEN status = 'stopped' THEN 1 ELSE 0 END) as stopped
    FROM projects
  `;
  
  db.get(projectStatsSql, [], (err, projectStats) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    stats.projects = projectStats;
    
    // Get session stats
    const sessionStatsSql = `SELECT COUNT(*) as total FROM sessions`;
    db.get(sessionStatsSql, [], (err2, sessionStats) => {
      if (err2) {
        return res.status(500).json({ success: false, error: err2.message });
      }
      stats.sessions = sessionStats;
      
      // Get channel stats
      const channelStatsSql = `SELECT COUNT(*) as total FROM channels`;
      db.get(channelStatsSql, [], (err3, channelStats) => {
        if (err3) {
          return res.status(500).json({ success: false, error: err3.message });
        }
        stats.channels = channelStats;
        
        // Get file stats
        const fileStatsSql = `
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN file_type = 'text' THEN 1 ELSE 0 END) as text,
            SUM(CASE WHEN file_type = 'photo' THEN 1 ELSE 0 END) as photo,
            SUM(CASE WHEN file_type = 'video' THEN 1 ELSE 0 END) as video,
            SUM(size) as total_size
          FROM files
        `;
        db.get(fileStatsSql, [], (err4, fileStats) => {
          if (err4) {
            return res.status(500).json({ success: false, error: err4.message });
          }
          stats.files = fileStats;
          
          // Get process run stats
          const runStatsSql = `
            SELECT 
              COUNT(*) as total,
              SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running,
              SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
              SUM(CASE WHEN status = 'stopped' THEN 1 ELSE 0 END) as stopped
            FROM process_runs
          `;
          db.get(runStatsSql, [], (err5, runStats) => {
            if (err5) {
              return res.status(500).json({ success: false, error: err5.message });
            }
            stats.runs = runStats;
            
            // Get category stats
            const categoryStatsSql = `SELECT COUNT(*) as total FROM categories`;
            db.get(categoryStatsSql, [], (err6, categoryStats) => {
              if (err6) {
                return res.status(500).json({ success: false, error: err6.message });
              }
              stats.categories = categoryStats;
              
              res.json({ success: true, data: stats });
            });
          });
        });
      });
    });
  });
});

// GET /api/dashboard/recent-activity - get recent activity
router.get('/recent-activity', (req, res) => {
  const limit = req.query.limit || 10;
  
  const sql = `
    SELECT 
      id,
      run_id,
      level,
      message,
      datetime(created_at, 'localtime') as created_at
    FROM logs
    ORDER BY id DESC
    LIMIT ?
  `;
  
  db.all(sql, [limit], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true, data: rows });
  });
});

// GET /api/dashboard/running-projects - get currently running projects
router.get('/running-projects', (req, res) => {
  const sql = `
    SELECT 
      p.id,
      p.name,
      p.status,
      p.created_at,
      pr.id as run_id,
      pr.started_at,
      pr.stats
    FROM projects p
    LEFT JOIN process_runs pr ON pr.project_id = p.id AND pr.status = 'running'
    WHERE p.status = 'running'
    ORDER BY pr.started_at DESC
  `;
  
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    
    // Parse stats JSON
    const projects = rows.map(row => ({
      ...row,
      stats: row.stats ? JSON.parse(row.stats) : null
    }));
    
    res.json({ success: true, data: projects });
  });
});

// GET /api/dashboard/recent-runs - get recent process runs with stats
router.get('/recent-runs', (req, res) => {
  const limit = req.query.limit || 5;
  
  const sql = `
    SELECT 
      pr.id,
      pr.project_id,
      pr.status,
      pr.started_at,
      pr.updated_at,
      pr.stats,
      p.name as project_name
    FROM process_runs pr
    JOIN projects p ON p.id = pr.project_id
    ORDER BY pr.started_at DESC
    LIMIT ?
  `;
  
  db.all(sql, [limit], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    
    // Parse stats JSON
    const runs = rows.map(row => ({
      ...row,
      stats: row.stats ? JSON.parse(row.stats) : null
    }));
    
    res.json({ success: true, data: runs });
  });
});

module.exports = router;
