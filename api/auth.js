const express = require('express');
const { verifyGoogleToken } = require('../middleware/auth');

const router = express.Router();

// Return Google Client ID to the frontend
router.get('/config', (req, res) => {
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  });
});

// Verify a Google ID token and return user info
router.post('/verify', async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: 'Credential required' });

  try {
    const user = await verifyGoogleToken(credential);
    res.json({ ok: true, user });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token', details: err.message });
  }
});

module.exports = router;
