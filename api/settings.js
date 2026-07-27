const express = require('express');
const { getAllSettings, setSetting, getSetting } = require('../db/database');
const { verifyApiKey } = require('../llm/router');

const router = express.Router();

// Get all settings (mask API keys)
router.get('/', (req, res) => {
  const settings = getAllSettings();
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
});

// Save settings
router.post('/', (req, res) => {
  const { settings } = req.body;
  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ error: 'Settings object required' });
  }
  for (const [key, value] of Object.entries(settings)) {
    // Don't overwrite API key with masked value
    if (key.startsWith('apikey_') && value && value.includes('...')) continue;
    setSetting(key, value);
  }
  res.json({ ok: true });
});

// Save a single API key
router.post('/apikey', (req, res) => {
  const { provider, key } = req.body;
  if (!provider || !key) return res.status(400).json({ error: 'Provider and key required' });
  
  const keyName = `apikey_${provider}`;
  setSetting(keyName, key);
  res.json({ ok: true, provider });
});

// Verify an API key
router.post('/verify-key', async (req, res) => {
  const { provider, key } = req.body;
  if (!provider) return res.status(400).json({ error: 'Provider required' });

  // Use provided key or stored key
  const apiKey = key || getSetting(`apikey_${provider}`);
  if (!apiKey) return res.json({ valid: false, error: 'No API key configured' });

  try {
    const result = await verifyApiKey(provider, apiKey);
    res.json(result);
  } catch (err) {
    res.json({ valid: false, error: err.message });
  }
});

// Delete an API key
router.delete('/apikey/:provider', (req, res) => {
  setSetting(`apikey_${req.params.provider}`, '');
  res.json({ ok: true });
});

module.exports = router;
