const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = path.join(__dirname, 'nexus.db');
let db = null;

async function initDB() {
  const SQL = await initSqlJs();
  
  // Load existing database or create new
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      model TEXT DEFAULT 'auto',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      model TEXT,
      input_tokens INTEGER DEFAULT 0,
      output_tokens INTEGER DEFAULT 0,
      cost REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      model TEXT NOT NULL,
      input_tokens INTEGER DEFAULT 0,
      output_tokens INTEGER DEFAULT 0,
      cost REAL DEFAULT 0,
      task_type TEXT DEFAULT 'general',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  
  saveDB();
  console.log('✅ Database initialized at', DB_PATH);
  return db;
}

function saveDB() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// Auto-save every 30 seconds
setInterval(saveDB, 30000);

// ======= CONVERSATIONS =======
function createConversation(title, model = 'auto') {
  const id = uuidv4();
  const now = new Date().toISOString();
  db.run('INSERT INTO conversations (id, title, model, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', [id, title, model, now, now]);
  saveDB();
  return { id, title, model, created_at: now, updated_at: now };
}

function getConversations() {
  const stmt = db.prepare('SELECT * FROM conversations ORDER BY updated_at DESC');
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function getConversation(id) {
  const stmt = db.prepare('SELECT * FROM conversations WHERE id = ?');
  stmt.bind([id]);
  let row = null;
  if (stmt.step()) row = stmt.getAsObject();
  stmt.free();
  return row;
}

function updateConversation(id, updates) {
  if (updates.title) db.run('UPDATE conversations SET title = ?, updated_at = datetime("now") WHERE id = ?', [updates.title, id]);
  if (updates.model) db.run('UPDATE conversations SET model = ?, updated_at = datetime("now") WHERE id = ?', [updates.model, id]);
  saveDB();
}

function deleteConversation(id) {
  db.run('DELETE FROM messages WHERE conversation_id = ?', [id]);
  db.run('DELETE FROM conversations WHERE id = ?', [id]);
  saveDB();
}

// ======= MESSAGES =======
function addMessage(conversationId, role, content, model = null, inputTokens = 0, outputTokens = 0, cost = 0) {
  const id = uuidv4();
  const now = new Date().toISOString();
  db.run(`INSERT INTO messages (id, conversation_id, role, content, model, input_tokens, output_tokens, cost, created_at) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, conversationId, role, content, model, inputTokens, outputTokens, cost, now]);
  db.run('UPDATE conversations SET updated_at = datetime("now") WHERE id = ?', [conversationId]);
  saveDB();
  return { id, conversation_id: conversationId, role, content, model, input_tokens: inputTokens, output_tokens: outputTokens, cost };
}

function getMessages(conversationId) {
  const stmt = db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC');
  stmt.bind([conversationId]);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

// ======= SETTINGS =======
function getSetting(key) {
  const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
  stmt.bind([key]);
  let val = null;
  if (stmt.step()) val = stmt.getAsObject().value;
  stmt.free();
  return val;
}

function setSetting(key, value) {
  // Check if exists
  const existing = getSetting(key);
  if (existing !== null) {
    db.run('UPDATE settings SET value = ? WHERE key = ?', [value, key]);
  } else {
    db.run('INSERT INTO settings (key, value) VALUES (?, ?)', [key, value]);
  }
  saveDB();
}

function getAllSettings() {
  const stmt = db.prepare('SELECT * FROM settings');
  const settings = {};
  while (stmt.step()) {
    const row = stmt.getAsObject();
    settings[row.key] = row.value;
  }
  stmt.free();
  return settings;
}

// ======= USAGE =======
function trackUsage(model, inputTokens, outputTokens, cost, taskType = 'general') {
  const now = new Date().toISOString();
  db.run('INSERT INTO usage (model, input_tokens, output_tokens, cost, task_type, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [model, inputTokens, outputTokens, cost, taskType, now]);
  saveDB();
}

function getUsageStats() {
  // Total
  let stmt = db.prepare('SELECT COALESCE(SUM(cost),0) as total_cost, COALESCE(SUM(input_tokens+output_tokens),0) as total_tokens, COUNT(*) as total_queries FROM usage');
  stmt.step();
  const total = stmt.getAsObject();
  stmt.free();

  // By model
  stmt = db.prepare('SELECT model, SUM(cost) as cost, SUM(input_tokens+output_tokens) as tokens, COUNT(*) as queries FROM usage GROUP BY model ORDER BY cost DESC');
  const byModel = [];
  while (stmt.step()) byModel.push(stmt.getAsObject());
  stmt.free();

  // Daily (last 30 days)
  stmt = db.prepare("SELECT DATE(created_at) as day, SUM(cost) as cost, COUNT(*) as queries FROM usage WHERE created_at >= DATE('now','-30 days') GROUP BY DATE(created_at) ORDER BY day ASC");
  const daily = [];
  while (stmt.step()) daily.push(stmt.getAsObject());
  stmt.free();

  return { total, byModel, daily };
}

module.exports = {
  initDB, saveDB,
  createConversation, getConversations, getConversation, updateConversation, deleteConversation,
  addMessage, getMessages,
  getSetting, setSetting, getAllSettings,
  trackUsage, getUsageStats,
};
