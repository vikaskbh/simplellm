import { normalizeResponse } from "../responseNormalizer.js";
import { HttpError } from "../retryHandler.js";

const DEFAULT_BASE_URL = "https://api-inference.huggingface.co/models";
const DEFAULT_TIMEOUT = 60_000; // HF inference can be slow on cold start

/**
 * HuggingFace Inference API provider.
 *
 * Supports text-generation models like Mixtral, Mistral, Falcon, etc.
 * The model name is used directly as the HuggingFace model ID.
 *
 * Example model IDs:
 *   hf/mistralai/Mixtral-8x7B-Instruct-v0.1
 *   hf/mistralai/Mistral-7B-Instruct-v0.2
 *
 * @param {Array<{role: string, content: string}>} messages
 * @param {object} options
 * @param {string} options.apiKey    - HuggingFace API token (Bearer)
 * @param {string} options.model     - HuggingFace model ID (e.g. "mistralai/Mixtral-8x7B-Instruct-v0.1")
 * @param {number} [options.maxTokens=512]
 * @param {number} [options.temperature]
 * @param {number} [options.timeout]
 * @param {string} [options.baseUrl]
 * @returns {Promise<object>} Normalized response
 */
export async function generate(messages, options = {}) {
  const {
    apiKey,
    model,
    maxTokens = 512,
    temperature = 0.7,
    timeout = DEFAULT_TIMEOUT,
    baseUrl = DEFAULT_BASE_URL
  } = options;

  if (!apiKey) {
    throw new Error("[simple-llm/huggingface] apiKey is required.");
  }

  // Build a simple prompt from the messages array (instruction-tuned style)
  const prompt = buildPrompt(messages);

  const url = `${baseUrl}/${model}`;

  const body = {
    inputs: prompt,
    parameters: {
      max_new_tokens: maxTokens,
      temperature,
      return_full_text: false
    },
    options: {
      wait_for_model: true
    }
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
      `[simple-llm/huggingface] HTTP ${response.status}: ${errBody}`,
      response.status,
      errBody
    );
  }

  const data = await response.json();
  return normalizeResponse(data, "huggingface", model, latency);
}

/**
 * Converts messages array to a single prompt string for text-generation models.
 * Uses a simple [INST] / [/INST] format suitable for Mistral/Mixtral instruction tuning.
 */
function buildPrompt(messages) {
  return messages
    .map((m) => {
      if (m.role === "system") return `<<SYS>>${m.content}<</SYS>>`;
      if (m.role === "user") return `[INST]${m.content}[/INST]`;
      return m.content;
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
