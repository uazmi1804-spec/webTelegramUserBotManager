const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../db/telegram_app.db');
const db = new sqlite3.Database(dbPath);

const initDB = () => {
  // Create all tables as defined in QWEN.md
  db.serialize(() => {
    // Sessions table
    db.run(`CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      name TEXT,
      session_string TEXT NOT NULL,
      tg_id INTEGER,
      first_name TEXT,
      last_name TEXT,
      username TEXT,
      phone_number TEXT,
      login_at DATETIME,
      is_active INTEGER DEFAULT 1,
      last_used_at DATETIME,
      meta TEXT,
      created_at DATETIME DEFAULT (datetime('now')),
      updated_at DATETIME DEFAULT (datetime('now'))
    )`);

    db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_last_used_at ON sessions(last_used_at)`);

    // API Credentials table
    db.run(`CREATE TABLE IF NOT EXISTS api_credentials (
      id TEXT PRIMARY KEY,
      name TEXT,
      api_id INTEGER,
      api_hash TEXT,
      owner TEXT,
      is_active INTEGER DEFAULT 1
    )`);

    // Channels table
    db.run(`CREATE TABLE IF NOT EXISTS channels (
      id TEXT PRIMARY KEY,
      username TEXT,
      created_at DATETIME DEFAULT (datetime('now'))
    )`);

    // Categories table
    db.run(`CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT (datetime('now'))
    )`);

    // Category Channels junction table
    db.run(`CREATE TABLE IF NOT EXISTS category_channels (
      id TEXT PRIMARY KEY,
      category_id TEXT,
      channel_id TEXT,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
      FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
      UNIQUE(category_id, channel_id)
    )`);

    // Files table
    db.run(`CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      filename TEXT,
      file_type TEXT CHECK (file_type IN ('text','photo','video','other')),
      path TEXT,
      size INTEGER,
      owner TEXT,
      created_at DATETIME DEFAULT (datetime('now'))
    )`);

    // Projects table
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

    // Project Targets table
    db.run(`CREATE TABLE IF NOT EXISTS project_targets (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      channel_id TEXT,
      priority INTEGER,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )`);

    // Project Sessions table
    db.run(`CREATE TABLE IF NOT EXISTS project_sessions (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      session_id TEXT,
      selection_mode TEXT CHECK(selection_mode IN ('manual','random'))
    )`);

    // Project Messages table
    db.run(`CREATE TABLE IF NOT EXISTS project_messages (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      message_type TEXT,
      content_ref TEXT,
      caption TEXT
    )`);

    // Process Runs table
    db.run(`CREATE TABLE IF NOT EXISTS process_runs (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      started_by TEXT,
      status TEXT CHECK (status IN ('queued','running','completed','failed','stopped')),
      stats TEXT,
      created_at DATETIME DEFAULT (datetime('now')),
      updated_at DATETIME DEFAULT (datetime('now'))
    )`);

    // Delays table
    db.run(`CREATE TABLE IF NOT EXISTS delays (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      delay_between_channels_ms INTEGER,
      delay_between_sessions_ms INTEGER,
      jitter_min_ms INTEGER,
      jitter_max_ms INTEGER
    )`);

    // Logs table
    db.run(`CREATE TABLE IF NOT EXISTS logs (
      id TEXT PRIMARY KEY,
      run_id TEXT,
      level TEXT,
      message TEXT,
      meta TEXT,
      created_at DATETIME DEFAULT (datetime('now'))
    )`);
  });

  // Best-effort migrations: add columns if they don't exist
  const ensureColumn = (table, column, type) => {
    db.get(`PRAGMA table_info(${table})`, [], (err) => {
      // PRAGMA read not used; we will try add column and ignore errors if exists
      db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`, [], () => {});
    });
  };

  ensureColumn('sessions', 'tg_id', 'INTEGER');
  ensureColumn('sessions', 'first_name', 'TEXT');
  ensureColumn('sessions', 'last_name', 'TEXT');
  ensureColumn('sessions', 'username', 'TEXT');
  ensureColumn('sessions', 'phone_number', 'TEXT');
  ensureColumn('sessions', 'login_at', "DATETIME DEFAULT (datetime('now'))");

  console.log('Database initialized successfully');
};

module.exports = { db, initDB };