const OpenAI = require('openai');

async function* streamOpenAI(apiKey, model, messages) {
  const client = new OpenAI({ apiKey });
  
  const modelMap = {
    'gpt-4o': 'gpt-4o',
    'gpt-4o-mini': 'gpt-4o-mini',
  };
  const actualModel = modelMap[model] || model;

  const stream = await client.chat.completions.create({
    model: actualModel,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
    stream: true,
    max_tokens: 2048,
  });

  let totalTokens = { input: 0, output: 0 };

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta;
    if (delta?.content) {
      yield { type: 'token', content: delta.content };
    }
    if (chunk.usage) {
      totalTokens.input = chunk.usage.prompt_tokens || 0;
      totalTokens.output = chunk.usage.completion_tokens || 0;
    }
  }

  yield { type: 'done', usage: totalTokens };
}

async function verifyKey(apiKey) {
  try {
    const client = new OpenAI({ apiKey });
    await client.models.list();
    return { valid: true };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

module.exports = { streamOpenAI, verifyKey };
