const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create the database directory if it doesn't exist
const fs = require('fs');
const dbDir = path.resolve(__dirname, '../db');
if (!fs.existsSync(dbDir)){
    fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.resolve(__dirname, '../db/telegram_app.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Create sessions table
  db.run(`CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    name TEXT,
    session_string TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    last_used_at DATETIME,
    meta TEXT,
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_last_used_at ON sessions(last_used_at)`);

  // Create API credentials table
  db.run(`CREATE TABLE IF NOT EXISTS api_credentials (
    id TEXT PRIMARY KEY,
    name TEXT,
    api_id INTEGER,
    api_hash TEXT,
    owner TEXT,
    is_active INTEGER DEFAULT 1
  )`);

  // Create channels table
  db.run(`CREATE TABLE IF NOT EXISTS channels (
    id TEXT PRIMARY KEY,
    title TEXT,
    chat_id TEXT,
    category TEXT,
    meta TEXT
  )`);

  // Create files table
  db.run(`CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    filename TEXT,
    file_type TEXT CHECK (file_type IN ('text','photo','video','other')),
    path TEXT,
    size INTEGER,
    owner TEXT
  )`);

  // Create projects table
  db.run(`CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT,
    description TEXT,
    owner TEXT,
    status TEXT CHECK (status IN ('stopped','running','paused','failed')),
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now')),
    config TEXT
  )`);

  // Create project_targets table
  db.run(`CREATE TABLE IF NOT EXISTS project_targets (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    channel_id TEXT,
    priority INTEGER,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  )`);

  // Create project_sessions table
  db.run(`CREATE TABLE IF NOT EXISTS project_sessions (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    session_id TEXT,
    selection_mode TEXT CHECK(selection_mode IN ('manual','random'))
  )`);

  // Create project_messages table
  db.run(`CREATE TABLE IF NOT EXISTS project_messages (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    message_type TEXT,
    content_ref TEXT,
    caption TEXT
  )`);

  // Create process_runs table
  db.run(`CREATE TABLE IF NOT EXISTS process_runs (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    started_by TEXT,
    status TEXT CHECK (status IN ('queued','running','completed','failed','stopped')),
    stats TEXT,
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now'))
  )`);

  // Create delays table
  db.run(`CREATE TABLE IF NOT EXISTS delays (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    delay_between_channels_ms INTEGER,
    delay_between_sessions_ms INTEGER,
    jitter_min_ms INTEGER,
    jitter_max_ms INTEGER
  )`);

  // Create logs table
  db.run(`CREATE TABLE IF NOT EXISTS logs (
    id TEXT PRIMARY KEY,
    run_id TEXT,
    level TEXT,
    message TEXT,
    meta TEXT,
    created_at DATETIME DEFAULT (datetime('now'))
  )`);

  console.log('Database tables created successfully');
});

db.close();