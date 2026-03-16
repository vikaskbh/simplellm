/**
 * Custom provider — allows users to register arbitrary LLM backends.
 *
 * Usage:
 *   import { registerProvider } from "simple-llm";
 *
 *   registerProvider("my-model", async (messages, options) => {
 *     const res = await fetch("https://my-llm.example.com/generate", { ... });
 *     const data = await res.json();
 *     return {
 *       text: data.output,
 *       provider: "custom",
 *       model: options.model,
 *       latency: 0,
 *       tokens: { prompt: 0, completion: 0 }
 *     };
 *   });
 *
 *   // Then call it:
 *   completion({ model: "custom/my-model", messages: [...] });
 */

/** @type {Map<string, Function>} */
const registry = new Map();

/**
 * Registers a custom provider handler under a given name.
 *
 * @param {string}   name     - Model identifier (the part after "custom/")
 * @param {Function} handler  - async (messages, options) => normalizedResponse
 */
export function registerCustomProvider(name, handler) {
  if (typeof name !== "string" || !name.trim()) {
    throw new Error("[simple-llm/custom] Provider name must be a non-empty string.");
  }
  if (typeof handler !== "function") {
    throw new Error("[simple-llm/custom] Provider handler must be a function.");
  }
  registry.set(name.trim(), handler);
}

/**
 * Main generate function for the "custom" provider namespace.
 * Looks up the registered handler by model name and delegates to it.
 *
 * @param {Array}  messages
 * @param {object} options
 * @param {string} options.model  - Model name (the part after "custom/")
 * @returns {Promise<object>} Normalized response
 */
export async function generate(messages, options = {}) {
  const { model } = options;

  const handler = registry.get(model);

  if (!handler) {
    const registered = [...registry.keys()].join(", ") || "(none)";
    throw new Error(
      `[simple-llm/custom] No handler registered for "custom/${model}". ` +
        `Registered custom providers: ${registered}. ` +
        `Use registerProvider("${model}", handler) to register one.`
    );
  }

  return handler(messages, options);
}
