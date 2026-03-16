import { normalizeResponse } from "../responseNormalizer.js";
import { HttpError } from "../retryHandler.js";

const DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_TIMEOUT = 30_000;

/**
 * Google Gemini provider — supports gemini-1.5-pro, gemini-1.5-flash, gemini-pro, etc.
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
    throw new Error("[simple-llm/gemini] apiKey is required.");
  }

  // Convert OpenAI-style messages to Gemini format
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));

  const systemInstruction = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");

  const body = {
    contents,
    generationConfig: {
      ...(maxTokens != null && { maxOutputTokens: maxTokens }),
      ...(temperature != null && { temperature })
    },
    ...(systemInstruction && {
      systemInstruction: { parts: [{ text: systemInstruction }] }
    })
  };

  const url = `${baseUrl}/models/${model}:generateContent?key=${apiKey}`;
  const start = Date.now();

  const response = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    timeout
  });

  const latency = Date.now() - start;

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    throw new HttpError(
      `[simple-llm/gemini] HTTP ${response.status}: ${errBody}`,
      response.status,
      errBody
    );
  }

  const data = await response.json();
  return normalizeResponse(data, "gemini", model, latency);
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
