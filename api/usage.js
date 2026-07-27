const express = require('express');
const { getUsageStats } = require('../db/database');

const router = express.Router();

// Get usage statistics
router.get('/', (req, res) => {
  const stats = getUsageStats();
  res.json(stats);
});

module.exports = router;
