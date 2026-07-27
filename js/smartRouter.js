/* ======= SMART ROUTER ======= */
function classifyTask(prompt) {
  const lower = prompt.toLowerCase();
  let bestMatch = null, bestScore = 0;
  for (const cat of TASK_CATEGORIES) {
    let score = 0;
    for (const kw of cat.keywords) { if (lower.includes(kw)) score++; }
    if (score > bestScore) { bestScore = score; bestMatch = cat; }
  }
  return bestMatch || TASK_CATEGORIES.find(c => c.id === 'general');
}

function selectModel(prompt) {
  const category = classifyTask(prompt);
  const model = MODEL_MAP[category.bestModel];
  const confidence = Math.min(95, 70 + Math.random() * 25);
  const estimatedTokens = Math.floor(prompt.length * 0.3) + 200;
  const estimatedCost = ((estimatedTokens / 1000000) * (model.inputCost + model.outputCost * 3)).toFixed(5);
  const estimatedTime = (1.0 + Math.random() * 2.5).toFixed(1);

  const reasons = {
    coding: `Your task involves code/programming. ${model.name} excels at code generation with high accuracy and low cost.`,
    creative: `Your task requires creative writing. ${model.name} produces nuanced, high-quality prose.`,
    analysis: `Your task needs data analysis. ${model.name} has a massive context window and strong analytical capabilities.`,
    math: `Your task involves math/logic. ${model.name} achieves top scores on mathematical reasoning.`,
    general: `This is a general task. ${model.name} offers the best balance of speed, quality, and cost.`,
    translation: `Your task involves translation. ${model.name} has excellent multilingual support.`,
    summarize: `Your task is summarization. ${model.name} is fast and cost-effective for condensing information.`,
  };

  return {
    model, category,
    confidence: Math.round(confidence),
    estimatedCost: parseFloat(estimatedCost),
    estimatedTokens,
    estimatedTime: parseFloat(estimatedTime),
    reasoning: reasons[category.id] || reasons.general,
  };
}
