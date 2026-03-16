import { normalizeResponse } from "../responseNormalizer.js";
import { HttpError } from "../retryHandler.js";

const DEFAULT_BASE_URL = "https://api.anthropic.com/v1";
const DEFAULT_TIMEOUT = 30_000;
const ANTHROPIC_VERSION = "2023-06-01";

/**
 * Anthropic provider — supports Claude 3 (opus, sonnet, haiku) and Claude 3.5.
 *
 * @param {Array<{role: string, content: string}>} messages
 * @param {object} options
 * @param {string} options.apiKey
 * @param {string} options.model
 * @param {number} [options.maxTokens=1024]
 * @param {number} [options.temperature]
 * @param {number} [options.timeout]
 * @param {string} [options.baseUrl]
 * @returns {Promise<object>} Normalized response
 */
export async function generate(messages, options = {}) {
  const {
    apiKey,
    model,
    maxTokens = 1024,
    temperature = 1,
    timeout = DEFAULT_TIMEOUT,
    baseUrl = DEFAULT_BASE_URL
  } = options;

  if (!apiKey) {
    throw new Error("[simple-llm/anthropic] apiKey is required.");
  }

  // Anthropic requires system messages to be passed separately
  const systemMessages = messages.filter((m) => m.role === "system");
  const userMessages = messages.filter((m) => m.role !== "system");

  const body = {
    model,
    max_tokens: maxTokens,
    messages: userMessages,
    ...(systemMessages.length > 0 && {
      system: systemMessages.map((m) => m.content).join("\n\n")
    }),
    ...(temperature != null && { temperature })
  };

  const url = `${baseUrl}/messages`;
  const start = Date.now();

  const response = await fetchWithTimeout(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION
    },
    body: JSON.stringify(body),
    timeout
  });

  const latency = Date.now() - start;

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    throw new HttpError(
      `[simple-llm/anthropic] HTTP ${response.status}: ${errBody}`,
      response.status,
      errBody
    );
  }

  const data = await response.json();
  return normalizeResponse(data, "anthropic", model, latency);
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
