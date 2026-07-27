const express = require('express');
const { createConversation, getConversations, getConversation, updateConversation, deleteConversation, addMessage, getMessages, trackUsage } = require('../db/database');
const { streamResponse, smartRoute, calculateCost, hasApiKey, MODEL_PRICING } = require('../llm/router');

const router = express.Router();

// List conversations
router.get('/conversations', async (req, res) => {
  try {
    const conversations = await getConversations();
    res.json(conversations);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Create conversation
router.post('/conversations', async (req, res) => {
  try {
    const { title, model } = req.body;
    const conv = await createConversation(title || 'New Chat', model || 'auto');
    res.json(conv);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get conversation with messages
router.get('/conversations/:id', async (req, res) => {
  try {
    const conv = await getConversation(req.params.id);
    if (!conv) return res.status(404).json({ error: 'Conversation not found' });
    const messages = await getMessages(req.params.id);
    res.json({ ...conv, messages });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update conversation
router.put('/conversations/:id', async (req, res) => {
  try {
    await updateConversation(req.params.id, req.body);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete conversation
router.delete('/conversations/:id', async (req, res) => {
  try {
    await deleteConversation(req.params.id);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ======= CHAT (SSE Streaming) =======
router.post('/chat', async (req, res) => {
  const { conversationId, message, model } = req.body;

  if (!message) return res.status(400).json({ error: 'Message is required' });

  try {
    // Create or get conversation
    let convId = conversationId;
    if (!convId) {
      const title = message.substring(0, 50) + (message.length > 50 ? '...' : '');
      const conv = await createConversation(title, model || 'auto');
      convId = conv.id;
    }

    // Save user message
    await addMessage(convId, 'user', message);

    // Parse request keys
    let requestKeys = {};
    try {
      if (req.headers['x-api-keys']) requestKeys = JSON.parse(req.headers['x-api-keys']);
    } catch(e) {}

    // Determine which model to use
    let selectedModel = model;
    let routerInfo = null;

    if (model === 'auto' || !model) {
      routerInfo = await smartRoute(message, requestKeys);
      selectedModel = routerInfo.model;
    }

    // Check if we have an API key
    if (!(await hasApiKey(selectedModel, requestKeys))) {
      return res.status(400).json({
        error: `No API key for ${selectedModel}. Add your key in Settings.`,
        needsKey: true,
        model: selectedModel,
      });
    }

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send conversation ID
    res.write(`data: ${JSON.stringify({ type: 'meta', conversationId: convId })}\n\n`);

    // Send router info if auto
    if (routerInfo) {
      res.write(`data: ${JSON.stringify({ type: 'router', model: selectedModel, confidence: routerInfo.confidence, category: routerInfo.category })}\n\n`);
    }

    // Build message history
    const msgs = await getMessages(convId);
    const history = msgs.map(m => ({ role: m.role, content: m.content }));

    let fullResponse = '';
    let usage = { input: 0, output: 0 };

    for await (const chunk of streamResponse(selectedModel, history, requestKeys)) {
      if (chunk.type === 'token') {
        fullResponse += chunk.content;
        res.write(`data: ${JSON.stringify({ type: 'token', content: chunk.content })}\n\n`);
      }
      if (chunk.type === 'done') {
        usage = chunk.usage || usage;
      }
    }

    // Calculate cost
    const cost = calculateCost(selectedModel, usage.input, usage.output);

    // Save assistant message
    await addMessage(convId, 'assistant', fullResponse, selectedModel, usage.input, usage.output, cost);

    // Track usage
    await trackUsage(selectedModel, usage.input, usage.output, cost);

    // Send completion
    res.write(`data: ${JSON.stringify({ type: 'done', model: selectedModel, inputTokens: usage.input, outputTokens: usage.output, cost })}\n\n`);
    res.end();
  } catch (err) {
    console.error('Chat error:', err.message);
    res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
    res.end();
  }
});

module.exports = router;
