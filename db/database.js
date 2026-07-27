const { createClient } = require('@libsql/client');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Connect to Turso (or fallback to memory on Vercel, or local file for dev)
const isVercel = process.env.VERCEL || process.env.VERCEL_ENV;
const db = createClient({
  url: process.env.TURSO_DATABASE_URL || (isVercel ? 'file::memory:' : 'file:nexus.db'),
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function initDB() {
  // Create tables
  await db.execute(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      model TEXT DEFAULT 'auto',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      model TEXT,
      input_tokens INTEGER DEFAULT 0,
      output_tokens INTEGER DEFAULT 0,
      cost REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id)
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      model TEXT NOT NULL,
      input_tokens INTEGER DEFAULT 0,
      output_tokens INTEGER DEFAULT 0,
      cost REAL DEFAULT 0,
      task_type TEXT DEFAULT 'general',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  console.log('✅ Turso Database initialized');
  return db;
}

// ======= CONVERSATIONS =======
async function createConversation(title, model = 'auto') {
  const id = uuidv4();
  await db.execute({
    sql: 'INSERT INTO conversations (id, title, model) VALUES (?, ?, ?)',
    args: [id, title, model]
  });
  return { id, title, model, created_at: new Date().toISOString() };
}

async function getConversations() {
  const result = await db.execute('SELECT * FROM conversations ORDER BY updated_at DESC');
  return result.rows;
}

async function getConversation(id) {
  const result = await db.execute({
    sql: 'SELECT * FROM conversations WHERE id = ?',
    args: [id]
  });
  return result.rows[0] || null;
}

async function updateConversation(id, updates) {
  if (updates.title) {
    await db.execute({
      sql: 'UPDATE conversations SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [updates.title, id]
    });
  }
  if (updates.model) {
    await db.execute({
      sql: 'UPDATE conversations SET model = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [updates.model, id]
    });
  }
}

async function deleteConversation(id) {
  await db.execute({ sql: 'DELETE FROM messages WHERE conversation_id = ?', args: [id] });
  await db.execute({ sql: 'DELETE FROM conversations WHERE id = ?', args: [id] });
}

// ======= MESSAGES =======
async function addMessage(conversationId, role, content, model = null, inputTokens = 0, outputTokens = 0, cost = 0) {
  const id = uuidv4();
  await db.execute({
    sql: `INSERT INTO messages (id, conversation_id, role, content, model, input_tokens, output_tokens, cost) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, conversationId, role, content, model, inputTokens, outputTokens, cost]
  });
  await db.execute({
    sql: 'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    args: [conversationId]
  });
  return { id, conversation_id: conversationId, role, content, model, input_tokens: inputTokens, output_tokens: outputTokens, cost };
}

async function getMessages(conversationId) {
  const result = await db.execute({
    sql: 'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
    args: [conversationId]
  });
  return result.rows;
}

// ======= SETTINGS =======
async function getSetting(key) {
  const result = await db.execute({
    sql: 'SELECT value FROM settings WHERE key = ?',
    args: [key]
  });
  return result.rows.length > 0 ? result.rows[0].value : null;
}

async function setSetting(key, value) {
  const existing = await getSetting(key);
  if (existing !== null) {
    await db.execute({
      sql: 'UPDATE settings SET value = ? WHERE key = ?',
      args: [value, key]
    });
  } else {
    await db.execute({
      sql: 'INSERT INTO settings (key, value) VALUES (?, ?)',
      args: [key, value]
    });
  }
}

async function getAllSettings() {
  const result = await db.execute('SELECT * FROM settings');
  const settings = {};
  result.rows.forEach(row => {
    settings[row.key] = row.value;
  });
  return settings;
}

// ======= USAGE =======
async function trackUsage(model, inputTokens, outputTokens, cost, taskType = 'general') {
  await db.execute({
    sql: 'INSERT INTO usage (model, input_tokens, output_tokens, cost, task_type) VALUES (?, ?, ?, ?, ?)',
    args: [model, inputTokens, outputTokens, cost, taskType]
  });
}

async function getUsageStats() {
  // Total
  const totalResult = await db.execute('SELECT COALESCE(SUM(cost),0) as total_cost, COALESCE(SUM(input_tokens+output_tokens),0) as total_tokens, COUNT(*) as total_queries FROM usage');
  const total = totalResult.rows[0];

  // By model
  const byModelResult = await db.execute('SELECT model, SUM(cost) as cost, SUM(input_tokens+output_tokens) as tokens, COUNT(*) as queries FROM usage GROUP BY model ORDER BY cost DESC');
  const byModel = byModelResult.rows;

  // Daily (last 30 days)
  const dailyResult = await db.execute("SELECT DATE(created_at) as day, SUM(cost) as cost, COUNT(*) as queries FROM usage WHERE created_at >= DATE('now','-30 days') GROUP BY DATE(created_at) ORDER BY day ASC");
  const daily = dailyResult.rows;

  return { total, byModel, daily };
}

module.exports = {
  initDB,
  createConversation, getConversations, getConversation, updateConversation, deleteConversation,
  addMessage, getMessages,
  getSetting, setSetting, getAllSettings,
  trackUsage, getUsageStats,
};
