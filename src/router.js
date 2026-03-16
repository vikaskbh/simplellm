import { generate as openaiGenerate } from "./providers/openai.js";
import { generate as anthropicGenerate } from "./providers/anthropic.js";
import { generate as geminiGenerate } from "./providers/gemini.js";
import { generate as perplexityGenerate } from "./providers/perplexity.js";
import { generate as huggingfaceGenerate } from "./providers/huggingface.js";
import { generate as ollamaGenerate } from "./providers/ollama.js";
import { generate as customGenerate, registerCustomProvider } from "./providers/custom.js";

/**
 * Maps provider prefix strings to their generate functions.
 */
const PROVIDER_MAP = {
  openai: openaiGenerate,
  anthropic: anthropicGenerate,
  gemini: geminiGenerate,
  perplexity: perplexityGenerate,
  hf: huggingfaceGenerate,
  ollama: ollamaGenerate,
  custom: customGenerate
};

/**
 * Parses a "provider/model" string into its components.
 *
 * @param {string} modelString  e.g. "openai/gpt-4o-mini"
 * @returns {{ provider: string, model: string }}
 */
export function parseModel(modelString) {
  const slashIdx = modelString.indexOf("/");

  if (slashIdx === -1) {
    throw new Error(
      `[simple-llm] Invalid model format "${modelString}". ` +
        `Expected "provider/model", e.g. "openai/gpt-4o-mini".`
    );
  }

  const provider = modelString.slice(0, slashIdx).toLowerCase().trim();
  const model = modelString.slice(slashIdx + 1).trim();

  if (!provider || !model) {
    throw new Error(
      `[simple-llm] Invalid model format "${modelString}". Both provider and model must be non-empty.`
    );
  }

  return { provider, model };
}

/**
 * Resolves the generate function for a given provider prefix.
 *
 * @param {string} provider  Provider prefix (e.g. "openai", "hf")
 * @returns {Function}
 */
export function resolveProvider(provider) {
  const fn = PROVIDER_MAP[provider];

  if (!fn) {
    const known = Object.keys(PROVIDER_MAP).join(", ");
    throw new Error(
      `[simple-llm] Unknown provider "${provider}". ` +
        `Supported providers: ${known}. ` +
        `Use registerProvider() to add a custom provider.`
    );
  }

  return fn;
}

/**
 * Registers a custom provider under a given name, available via "custom/<name>".
 *
 * @param {string}   name     - The model name within the custom namespace
 * @param {Function} handler  - async (messages, options) => normalizedResponse
 */
export function registerProvider(name, handler) {
  registerCustomProvider(name, handler);
}
