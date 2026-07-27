const express = require('express');
const { getAllSettings, setSetting, getSetting } = require('../db/database');
const { verifyApiKey } = require('../llm/router');

const router = express.Router();

// Get all settings (mask API keys)
router.get('/', async (req, res) => {
  try {
    const settings = await getAllSettings();
    const masked = {};
    for (const [key, value] of Object.entries(settings)) {
      if (key.startsWith('apikey_') && value) {
        masked[key] = value.substring(0, 8) + '...' + value.substring(value.length - 4);
        masked[key + '_configured'] = true;
      } else {
        masked[key] = value;
      }
    }
    res.json(masked);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Save settings
router.post('/', async (req, res) => {
  const { settings } = req.body;
  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ error: 'Settings object required' });
  }
  try {
    for (const [key, value] of Object.entries(settings)) {
      if (key.startsWith('apikey_') && value && value.includes('...')) continue;
      await setSetting(key, value);
    }
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Save a single API key
router.post('/apikey', async (req, res) => {
  const { provider, key } = req.body;
  if (!provider || !key) return res.status(400).json({ error: 'Provider and key required' });
  
  try {
    const keyName = `apikey_${provider}`;
    await setSetting(keyName, key);
    res.json({ ok: true, provider });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Verify an API key
router.post('/verify-key', async (req, res) => {
  const { provider, key } = req.body;
  if (!provider) return res.status(400).json({ error: 'Provider required' });

  try {
    const apiKey = key || await getSetting(`apikey_${provider}`);
    if (!apiKey) return res.json({ valid: false, error: 'No API key configured' });

    const result = await verifyApiKey(provider, apiKey);
    res.json(result);
  } catch (err) {
    res.json({ valid: false, error: err.message });
  }
});

// Delete an API key
router.delete('/apikey/:provider', async (req, res) => {
  try {
    await setSetting(`apikey_${req.params.provider}`, '');
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
