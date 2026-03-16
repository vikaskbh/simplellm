/**
 * Rough cost estimation for common models.
 * Prices are in USD per 1,000 tokens and may be outdated.
 * Always verify against provider pricing pages.
 */

const PRICE_TABLE = {
  // OpenAI  (input / output per 1K tokens)
  "gpt-4o":             { input: 0.005,   output: 0.015   },
  "gpt-4o-mini":        { input: 0.00015, output: 0.0006  },
  "gpt-4-turbo":        { input: 0.01,    output: 0.03    },
  "gpt-3.5-turbo":      { input: 0.0005,  output: 0.0015  },

  // Anthropic
  "claude-3-opus":      { input: 0.015,   output: 0.075   },
  "claude-3-sonnet":    { input: 0.003,   output: 0.015   },
  "claude-3-haiku":     { input: 0.00025, output: 0.00125 },

  // Google Gemini
  "gemini-1.5-pro":     { input: 0.00125, output: 0.005   },
  "gemini-1.5-flash":   { input: 0.000075,output: 0.0003  },

  // Perplexity
  "sonar-medium-online": { input: 0.0006,  output: 0.0018  },
  "sonar-small-online":  { input: 0.0002,  output: 0.0006  },
};

/**
 * Estimates cost in USD for a given number of prompt and completion tokens.
 *
 * @param {string} model         - Model name (without provider prefix)
 * @param {number} promptTokens
 * @param {number} completionTokens
 * @returns {{ inputCost: number, outputCost: number, totalCost: number } | null}
 */
export function estimateCost(model, promptTokens, completionTokens) {
  const prices = PRICE_TABLE[model];
  if (!prices) return null;

  const inputCost = (promptTokens / 1000) * prices.input;
  const outputCost = (completionTokens / 1000) * prices.output;

  return {
    inputCost: round(inputCost),
    outputCost: round(outputCost),
    totalCost: round(inputCost + outputCost)
  };
}

/**
 * Lists all models with known pricing.
 * @returns {string[]}
 */
export function listPricedModels() {
  return Object.keys(PRICE_TABLE);
}

function round(n) {
  return Math.round(n * 1_000_000) / 1_000_000;
}
