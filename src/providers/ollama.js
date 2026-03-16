import { normalizeResponse } from "../responseNormalizer.js";
import { HttpError } from "../retryHandler.js";

const DEFAULT_BASE_URL = "http://localhost:11434";
const DEFAULT_TIMEOUT = 120_000; // local models can be slow

/**
 * Ollama provider — runs local LLMs via the Ollama server.
 *
 * Requires Ollama running locally (or at a custom baseUrl).
 * https://ollama.ai
 *
 * @param {Array<{role: string, content: string}>} messages
 * @param {object} options
 * @param {string} options.model     - Model name as known to Ollama (e.g. "mistral", "llama3")
 * @param {number} [options.maxTokens]
 * @param {number} [options.temperature]
 * @param {number} [options.timeout]
 * @param {string} [options.baseUrl] - Ollama server URL (default: http://localhost:11434)
 * @returns {Promise<object>} Normalized response
 */
export async function generate(messages, options = {}) {
  const {
    model,
    maxTokens,
    temperature,
    timeout = DEFAULT_TIMEOUT,
    baseUrl = DEFAULT_BASE_URL
  } = options;

  const prompt = buildPrompt(messages);
  const url = `${baseUrl}/api/generate`;

  const body = {
    model,
    prompt,
    stream: false,
    ...(maxTokens != null && { options: { num_predict: maxTokens } }),
    ...(temperature != null && {
      options: { ...(maxTokens != null && { num_predict: maxTokens }), temperature }
    })
  };

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
      `[simple-llm/ollama] HTTP ${response.status}: ${errBody}`,
      response.status,
      errBody
    );
  }

  const data = await response.json();
  return normalizeResponse(data, "ollama", model, latency);
}

/**
 * Builds a plain text prompt from an OpenAI-style messages array.
 */
function buildPrompt(messages) {
  return messages
    .map((m) => {
      switch (m.role) {
        case "system":
          return `System: ${m.content}`;
        case "user":
          return `User: ${m.content}`;
        case "assistant":
          return `Assistant: ${m.content}`;
        default:
          return m.content;
      }
    })
    .join("\n");
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
