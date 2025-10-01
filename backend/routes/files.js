const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../uploads/'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// GET /api/files - get all files
router.get('/', (req, res) => {
  const sql = 'SELECT id, filename, file_type, path, size, created_at FROM files ORDER BY created_at DESC';
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true, data: rows });
  });
});

// POST /api/files - upload file (media or .txt)
router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }
  
  const { originalname, path: filePath, size } = req.file;
  const id = uuidv4();
  
  // Determine file type based on extension
  const ext = path.extname(originalname).toLowerCase();
  let fileType = 'other';
  if (ext === '.txt') {
    fileType = 'text';
  } else if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
    fileType = 'photo';
  } else if (['.mp4', '.avi', '.mov', '.mkv'].includes(ext)) {
    fileType = 'video';
  }
  
  const sql = 'INSERT INTO files (id, filename, file_type, path, size) VALUES (?, ?, ?, ?, ?)';
  db.run(sql, [id, originalname, fileType, filePath, size], function(err) {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    res.status(201).json({ 
      success: true, 
      data: { 
        id, 
        filename: originalname, 
        file_type: fileType, 
        path: filePath, 
        size 
      } 
    });
  });
});

// GET /api/files/:id - download
router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  const sql = 'SELECT path, filename FROM files WHERE id = ?';
  db.get(sql, [id], (err, row) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    if (!row) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }
    
    res.download(row.path, row.filename);
  });
});

// GET /api/files/:id/preview - preview file content
router.get('/:id/preview', (req, res) => {
  const { id } = req.params;
  
  const sql = 'SELECT path, filename, file_type FROM files WHERE id = ?';
  db.get(sql, [id], (err, row) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    if (!row) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }
    
    const fs = require('fs');
    
    try {
      if (row.file_type === 'text') {
        // For text files, read and return content
        const content = fs.readFileSync(row.path, 'utf8');
        res.json({ 
          success: true, 
          data: { 
            content, 
            filename: row.filename, 
            type: 'text' 
          } 
        });
      } else if (row.file_type === 'photo') {
        // For images, return the file path for direct access
        res.json({ 
          success: true, 
          data: { 
            url: `/api/files/${id}/raw`,
            filename: row.filename, 
            type: 'photo' 
          } 
        });
      } else if (row.file_type === 'video') {
        // For videos, return the file path for direct access
        res.json({ 
          success: true, 
          data: { 
            url: `/api/files/${id}/raw`,
            filename: row.filename, 
            type: 'video' 
          } 
        });
      } else {
        res.status(400).json({ 
          success: false, 
          error: 'File type not supported for preview' 
        });
      }
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: 'Error reading file: ' + error.message 
      });
    }
  });
});

// GET /api/files/:id/raw - serve raw file for preview
router.get('/:id/raw', (req, res) => {
  const { id } = req.params;
  
  const sql = 'SELECT path, filename, file_type FROM files WHERE id = ?';
  db.get(sql, [id], (err, row) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    if (!row) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }
    
    // Set appropriate content type based on file type
    let contentType = 'application/octet-stream';
    if (row.file_type === 'photo') {
      const ext = path.extname(row.filename).toLowerCase();
      if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
      else if (ext === '.png') contentType = 'image/png';
      else if (ext === '.gif') contentType = 'image/gif';
    } else if (row.file_type === 'video') {
      const ext = path.extname(row.filename).toLowerCase();
      if (ext === '.mp4') contentType = 'video/mp4';
      else if (ext === '.avi') contentType = 'video/x-msvideo';
      else if (ext === '.mov') contentType = 'video/quicktime';
    }
    
    res.setHeader('Content-Type', contentType);
    res.sendFile(path.resolve(row.path));
  });
});

// POST /api/files/text - create a text file directly (UTF-8, emoji supported)
router.post('/text', (req, res) => {
  try {
    const { filename, content } = req.body || {};
    if (!filename || typeof filename !== 'string') {
      return res.status(400).json({ success: false, error: 'filename is required' });
    }
    if (typeof content !== 'string') {
      return res.status(400).json({ success: false, error: 'content must be a string' });
    }

    const fs = require('fs');
    // Ensure .txt extension and prevent path traversal
    const safeBase = path.basename(filename).replace(/\\/g, '/');
    const hasTxt = safeBase.toLowerCase().endsWith('.txt');
    const finalName = hasTxt ? safeBase : `${safeBase}.txt`;

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const storedFilename = `text-${uniqueSuffix}.txt`;
    const uploadDir = path.join(__dirname, '../../uploads/');
    const filePath = path.join(uploadDir, storedFilename);

    // Write file as UTF-8 to disk
    fs.writeFileSync(filePath, content, { encoding: 'utf8' });

    const size = Buffer.byteLength(content, 'utf8');
    const id = uuidv4();
    const fileType = 'text';

    const sql = 'INSERT INTO files (id, filename, file_type, path, size) VALUES (?, ?, ?, ?, ?)';
    db.run(sql, [id, finalName, fileType, filePath, size], function(err) {
      if (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
      return res.status(201).json({
        success: true,
        data: {
          id,
          filename: finalName,
          file_type: fileType,
          path: filePath,
          size
        }
      });
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
});

// DELETE /api/files/:id - delete a file (disk + DB)
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const fs = require('fs');

  // First fetch the file record to get its path
  const selectSql = 'SELECT path FROM files WHERE id = ?';
  db.get(selectSql, [id], (selectErr, row) => {
    if (selectErr) {
      return res.status(500).json({ success: false, error: selectErr.message });
    }
    if (!row) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    // Try delete the file from disk (ignore if already missing)
    try {
      if (row.path && fs.existsSync(row.path)) {
        fs.unlinkSync(row.path);
      }
    } catch (fsErr) {
      // If file deletion fails due to permissions or other IO, report error
      return res.status(500).json({ success: false, error: 'Failed to remove file from disk: ' + fsErr.message });
    }

    // Remove DB record
    const deleteSql = 'DELETE FROM files WHERE id = ?';
    db.run(deleteSql, [id], function(dbErr) {
      if (dbErr) {
        return res.status(500).json({ success: false, error: dbErr.message });
      }
      return res.json({ success: true });
    });
  });
});

module.exports = router;