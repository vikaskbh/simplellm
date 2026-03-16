import { normalizeResponse } from "../responseNormalizer.js";
import { HttpError } from "../retryHandler.js";

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_TIMEOUT = 30_000;

/**
 * OpenAI provider — supports GPT-4o, GPT-4o-mini, GPT-4-turbo, GPT-3.5-turbo, etc.
 *
 * @param {Array<{role: string, content: string}>} messages
 * @param {object} options
 * @param {string} options.apiKey
 * @param {string} options.model
 * @param {number} [options.maxTokens]
 * @param {number} [options.temperature]
 * @param {number} [options.timeout]
 * @param {string} [options.baseUrl]
 * @returns {Promise<object>} Normalized response
 */
export async function generate(messages, options = {}) {
  const {
    apiKey,
    model,
    maxTokens,
    temperature = 1,
    timeout = DEFAULT_TIMEOUT,
    baseUrl = DEFAULT_BASE_URL
  } = options;

  if (!apiKey) {
    throw new Error("[simple-llm/openai] apiKey is required.");
  }

  const url = `${baseUrl}/chat/completions`;

  const body = {
    model,
    messages,
    ...(maxTokens != null && { max_tokens: maxTokens }),
    ...(temperature != null && { temperature })
  };

  const start = Date.now();
  const response = await fetchWithTimeout(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body),
    timeout
  });

  const latency = Date.now() - start;

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    throw new HttpError(
      `[simple-llm/openai] HTTP ${response.status}: ${errBody}`,
      response.status,
      errBody
    );
  }

  const data = await response.json();
  return normalizeResponse(data, "openai", model, latency);
}

async function fetchWithTimeout(url, { timeout, ...init }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
