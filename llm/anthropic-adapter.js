const Anthropic = require('@anthropic-ai/sdk');

async function* streamAnthropic(apiKey, model, messages) {
  const client = new Anthropic({ apiKey });

  const modelMap = {
    'claude-sonnet': 'claude-sonnet-4-20250514',
    'claude-haiku': 'claude-haiku-3-5-20241022',
  };
  const actualModel = modelMap[model] || model;

  // Separate system message if present
  let systemPrompt = undefined;
  const chatMessages = [];
  for (const m of messages) {
    if (m.role === 'system') {
      systemPrompt = m.content;
    } else {
      chatMessages.push({ role: m.role, content: m.content });
    }
  }

  const streamParams = {
    model: actualModel,
    max_tokens: 2048,
    messages: chatMessages,
  };
  if (systemPrompt) streamParams.system = systemPrompt;

  const stream = await client.messages.stream(streamParams);

  let totalTokens = { input: 0, output: 0 };

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
      yield { type: 'token', content: event.delta.text };
    }
    if (event.type === 'message_delta' && event.usage) {
      totalTokens.output = event.usage.output_tokens || 0;
    }
    if (event.type === 'message_start' && event.message?.usage) {
      totalTokens.input = event.message.usage.input_tokens || 0;
    }
  }

  yield { type: 'done', usage: totalTokens };
}

async function verifyKey(apiKey) {
  try {
    const client = new Anthropic({ apiKey });
    // Make a minimal request to verify
    await client.messages.create({
      model: 'claude-haiku-3-5-20241022',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Hi' }],
    });
    return { valid: true };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

module.exports = { streamAnthropic, verifyKey };
