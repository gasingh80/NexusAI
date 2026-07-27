const express = require('express');
const { streamResponse, calculateCost, hasApiKey } = require('../llm/router');
const { trackUsage } = require('../db/database');

const router = express.Router();

// Battle: stream multiple models simultaneously
router.post('/', async (req, res) => {
  const { prompt, models } = req.body;

  if (!prompt) return res.status(400).json({ error: 'Prompt is required' });
  if (!models || !Array.isArray(models) || models.length < 2) {
    return res.status(400).json({ error: 'At least 2 models required' });
  }

  try {
    // Check which models have keys
    const available = [];
    const missing = [];
    for (const m of models) {
      if (await hasApiKey(m)) available.push(m);
      else missing.push(m);
    }

    if (available.length < 2) {
      return res.status(400).json({
        error: `Need API keys for at least 2 models. Configure keys in Settings.`,
        configured: available,
        missing: missing,
      });
    }

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const messages = [{ role: 'user', content: prompt }];

    // Run all models in parallel
    const promises = available.map(async (modelId) => {
      try {
        let fullResponse = '';
        let usage = { input: 0, output: 0 };

        for await (const chunk of streamResponse(modelId, messages)) {
          if (chunk.type === 'token') {
            fullResponse += chunk.content;
            res.write(`data: ${JSON.stringify({ type: 'token', model: modelId, content: chunk.content })}\n\n`);
          }
          if (chunk.type === 'done') {
            usage = chunk.usage || usage;
          }
        }

        const cost = calculateCost(modelId, usage.input, usage.output);
        await trackUsage(modelId, usage.input, usage.output, cost, 'battle');

        res.write(`data: ${JSON.stringify({ type: 'model_done', model: modelId, inputTokens: usage.input, outputTokens: usage.output, cost })}\n\n`);
      } catch (err) {
        res.write(`data: ${JSON.stringify({ type: 'error', model: modelId, message: err.message })}\n\n`);
      }
    });

    await Promise.all(promises);
    res.write(`data: ${JSON.stringify({ type: 'all_done' })}\n\n`);
    res.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
