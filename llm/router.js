const { streamOpenAI, verifyKey: verifyOpenAI } = require('./openai-adapter');
const { streamAnthropic, verifyKey: verifyAnthropic } = require('./anthropic-adapter');
const { streamGemini, verifyKey: verifyGemini } = require('./gemini-adapter');
const { getSetting } = require('../db/database');

// Model to provider mapping
const MODEL_PROVIDERS = {
  'gpt-4o': 'openai',
  'gpt-4o-mini': 'openai',
  'claude-sonnet': 'anthropic',
  'claude-haiku': 'anthropic',
  'gemini-pro': 'google',
  'gemini-flash': 'google',
  'llama-4': 'openai',       // Via OpenAI-compatible endpoint
  'deepseek-v3': 'openai',   // Via OpenAI-compatible endpoint
  'mistral-large': 'openai', // Via OpenAI-compatible endpoint
};

// Pricing per 1M tokens
const MODEL_PRICING = {
  'gpt-4o': { input: 2.5, output: 10.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'claude-sonnet': { input: 3.0, output: 15.0 },
  'claude-haiku': { input: 0.25, output: 1.25 },
  'gemini-pro': { input: 1.25, output: 10.0 },
  'gemini-flash': { input: 0.15, output: 0.6 },
  'llama-4': { input: 0.2, output: 0.6 },
  'deepseek-v3': { input: 0.14, output: 0.28 },
  'mistral-large': { input: 2.0, output: 6.0 },
};

function calculateCost(model, inputTokens, outputTokens) {
  const pricing = MODEL_PRICING[model] || { input: 1, output: 3 };
  return (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
}

async function getApiKey(provider, requestKeys = {}) {
  // 1. Check request headers (Client-Side BYOK)
  if (requestKeys[provider]) return requestKeys[provider];
  
  // 2. Fallback to Environment Variables (Global Owner Keys)
  const envMap = {
    openai: process.env.OPENAI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
    google: process.env.GEMINI_API_KEY,
  };
  return envMap[provider] || null;
}

async function hasApiKey(model, requestKeys = {}) {
  const provider = MODEL_PROVIDERS[model];
  const key = await getApiKey(provider, requestKeys);
  return !!key;
}

// Smart Router — classify task and select best model
const TASK_CATEGORIES = [
  { id: 'coding', bestModel: 'deepseek-v3', fallback: 'gpt-4o', keywords: ['code','program','function','bug','debug','python','javascript','api','implement','build','develop','class','variable','error','compile'] },
  { id: 'creative', bestModel: 'claude-sonnet', fallback: 'gpt-4o', keywords: ['write','story','poem','creative','blog','article','copy','tone','narrative','essay','describe'] },
  { id: 'analysis', bestModel: 'gemini-pro', fallback: 'gpt-4o', keywords: ['analyze','research','data','compare','trend','report','study','statistics','market'] },
  { id: 'math', bestModel: 'deepseek-v3', fallback: 'gpt-4o-mini', keywords: ['math','calculate','equation','solve','proof','formula','algorithm'] },
  { id: 'general', bestModel: 'gpt-4o-mini', fallback: 'gemini-flash', keywords: ['explain','help','what','how','tell','list','suggest'] },
  { id: 'translation', bestModel: 'mistral-large', fallback: 'gpt-4o', keywords: ['translate','language','hindi','spanish','french','german'] },
  { id: 'summarize', bestModel: 'claude-haiku', fallback: 'gpt-4o-mini', keywords: ['summarize','summary','brief','tldr','key points','condense'] },
];

async function smartRoute(prompt, requestKeys = {}) {
  const lower = prompt.toLowerCase();
  let bestMatch = null, bestScore = 0;
  for (const cat of TASK_CATEGORIES) {
    let score = 0;
    for (const kw of cat.keywords) { if (lower.includes(kw)) score++; }
    if (score > bestScore) { bestScore = score; bestMatch = cat; }
  }
  const category = bestMatch || TASK_CATEGORIES.find(c => c.id === 'general');
  
  // Check if we have a key for the best model, otherwise use fallback
  let selectedModel = category.bestModel;
  if (!(await hasApiKey(selectedModel, requestKeys))) {
    selectedModel = category.fallback;
    if (!(await hasApiKey(selectedModel, requestKeys))) {
      // Find any model with a key
      for (const [model] of Object.entries(MODEL_PROVIDERS)) {
        if (await hasApiKey(model, requestKeys)) { selectedModel = model; break; }
      }
    }
  }
  
  const confidence = Math.min(95, 70 + bestScore * 8);
  return { model: selectedModel, category: category.id, confidence };
}

async function* streamResponse(model, messages, requestKeys = {}) {
  const provider = MODEL_PROVIDERS[model];
  const apiKey = await getApiKey(provider, requestKeys);

  if (!apiKey) {
    throw new Error(`No API key configured for ${provider}. Please add your key in Settings.`);
  }

  switch (provider) {
    case 'openai':
      yield* streamOpenAI(apiKey, model, messages);
      break;
    case 'anthropic':
      yield* streamAnthropic(apiKey, model, messages);
      break;
    case 'google':
      yield* streamGemini(apiKey, model, messages);
      break;
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

async function verifyApiKey(provider, apiKey) {
  switch (provider) {
    case 'openai': return await verifyOpenAI(apiKey);
    case 'anthropic': return await verifyAnthropic(apiKey);
    case 'google': return await verifyGemini(apiKey);
    default: return { valid: false, error: 'Unknown provider' };
  }
}

module.exports = {
  streamResponse, smartRoute, calculateCost, hasApiKey, verifyApiKey, MODEL_PROVIDERS, MODEL_PRICING,
};
