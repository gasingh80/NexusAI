require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname), {
  extensions: ['html'],
}));

// API Routes
app.use('/api/auth', require('./api/auth'));
app.use('/api', require('./api/chat'));
app.use('/api/settings', require('./api/settings'));
app.use('/api/usage', require('./api/usage'));
app.use('/api/battle', require('./api/battle'));
app.use('/api/checkout', require('./api/checkout'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Catch-all: serve index.html for unmatched routes
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server (only if running locally, not in Vercel)
if (process.env.NODE_ENV !== 'production' || process.env.RUN_LOCAL === 'true') {
  async function start() {
    try {
      await initDB();
      app.listen(PORT, () => {
        console.log(`
    ╔══════════════════════════════════════╗
    ║         🚀 Kombat AI Server           ║
    ║                                      ║
    ║   Local:  http://localhost:${PORT}      ║
    ║                                      ║
    ║   Status: Running                    ║
    ║   DB:     Turso/LibSQL (Async)       ║
    ║                                      ║
    ║   Add your API keys in Settings      ║
    ║   to start using real LLM models!    ║
    ╚══════════════════════════════════════╝
        `);
      });
    } catch (err) {
      console.error('Failed to start server:', err);
      process.exit(1);
    }
  }
  start();
} else {
  // In production (Vercel), we just initialize the DB connection pool
  // No need to create tables on every request, we assume they exist or use migrations
  initDB().catch(console.error);
}

// Export the Express app so Vercel can use it as a Serverless Function
module.exports = app;
