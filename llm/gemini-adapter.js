const { GoogleGenerativeAI } = require('@google/generative-ai');

async function* streamGemini(apiKey, model, messages) {
  const genAI = new GoogleGenerativeAI(apiKey);

  const modelMap = {
    'gemini-pro': 'gemini-2.5-pro-preview-06-05',
    'gemini-flash': 'gemini-2.5-flash-preview-05-20',
  };
  const actualModel = modelMap[model] || model;

  const genModel = genAI.getGenerativeModel({ model: actualModel });

  // Convert messages to Gemini format
  const history = [];
  let lastUserMsg = '';
  for (const m of messages) {
    if (m.role === 'system') continue; // Gemini doesn't support system messages directly
    if (m.role === 'user') {
      lastUserMsg = m.content;
    }
    if (m.role === 'assistant') {
      // Only add to history if there was a preceding user message
      if (history.length > 0 || lastUserMsg) {
        history.push({ role: 'user', parts: [{ text: lastUserMsg }] });
        history.push({ role: 'model', parts: [{ text: m.content }] });
      }
    }
  }

  // Get the latest user message
  const currentMessage = messages.filter(m => m.role === 'user').pop();
  if (!currentMessage) return;

  const chat = genModel.startChat({ history });
  const result = await chat.sendMessageStream(currentMessage.content);

  let totalTokens = { input: 0, output: 0 };
  
  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) {
      yield { type: 'token', content: text };
    }
  }

  // Get final usage
  const response = await result.response;
  const usage = response.usageMetadata;
  if (usage) {
    totalTokens.input = usage.promptTokenCount || 0;
    totalTokens.output = usage.candidatesTokenCount || 0;
  }

  yield { type: 'done', usage: totalTokens };
}

async function verifyKey(apiKey) {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-05-20' });
    await model.generateContent('Hi');
    return { valid: true };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

module.exports = { streamGemini, verifyKey };
