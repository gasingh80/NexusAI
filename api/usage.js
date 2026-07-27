const express = require('express');
const { getUsageStats } = require('../db/database');

const router = express.Router();

// Get usage statistics
router.get('/', async (req, res) => {
  try {
    const stats = await getUsageStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
