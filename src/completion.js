import { parseModel, resolveProvider } from "./router.js";
import { withRetry } from "./retryHandler.js";
import { log } from "./utils/logger.js";

/**
 * Main entry point for generating LLM completions.
 *
 * Supports:
 *   - Single model:   model: "openai/gpt-4o-mini"
 *   - Fallback list:  model: ["ollama/mistral", "openai/gpt-4o-mini"]
 *
 * @param {object} options
 * @param {string|string[]} options.model          - Model string(s) in "provider/model" format
 * @param {Array}           options.messages       - OpenAI-style messages array
 * @param {string}          [options.apiKey]       - Provider API key
 * @param {number}          [options.maxTokens]    - Max completion tokens
 * @param {number}          [options.temperature]  - Sampling temperature
 * @param {number}          [options.timeout]      - Request timeout in ms (default: 30000)
 * @param {number}          [options.retries]      - Max retries (default: 2)
 * @param {string}          [options.baseUrl]      - Override provider base URL
 * @param {boolean}         [options.debug]        - Enable debug logging
 * @returns {Promise<{text, provider, model, latency, tokens}>}
 */
export async function completion(options = {}) {
  const { model, messages, debug = false, retries = 2, ...rest } = options;

  if (!model) {
    throw new Error("[simple-llm] options.model is required.");
  }

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    throw new Error("[simple-llm] options.messages must be a non-empty array.");
  }

  const models = Array.isArray(model) ? model : [model];

  let lastError;

  for (let i = 0; i < models.length; i++) {
    const modelString = models[i];
    const isFallback = i > 0;

    if (isFallback && debug) {
      log("warn", `Falling back to "${modelString}" after previous failure.`);
    }

    try {
      const { provider, model: modelName } = parseModel(modelString);
      const generateFn = resolveProvider(provider);

      const callOptions = {
        ...rest,
        provider,
        model: modelName,
        debug,
        retries
      };

      if (debug) {
        log("debug", `Calling provider="${provider}" model="${modelName}"`);
      }

      const result = await withRetry(
        () => generateFn(messages, callOptions),
        { retries, debug }
      );

      return result;
    } catch (err) {
      lastError = err;

      if (debug) {
        log("error", `Provider "${modelString}" failed: ${err.message}`);
      }

      if (i < models.length - 1) {
        // More fallbacks available — continue
        continue;
      }
    }
  }

  // All models exhausted
  throw new Error(
    `[simple-llm] All models failed. Last error: ${lastError?.message}`
  );
}
