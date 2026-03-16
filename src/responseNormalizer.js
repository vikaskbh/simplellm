/**
 * Normalizes raw provider responses into the standard simple-llm response shape.
 *
 * Standard response:
 * {
 *   text: string,
 *   provider: string,
 *   model: string,
 *   latency: number,   // ms
 *   tokens: { prompt: number, completion: number }
 * }
 */

/**
 * @param {object} raw       - Raw provider response data
 * @param {string} provider  - Provider name (e.g. "openai")
 * @param {string} model     - Model name (e.g. "gpt-4o-mini")
 * @param {number} latency   - Request latency in ms
 * @returns {object}
 */
export function normalizeResponse(raw, provider, model, latency) {
  return {
    text: extractText(raw, provider),
    provider,
    model,
    latency,
    tokens: extractTokens(raw, provider)
  };
}

function extractText(raw, provider) {
  switch (provider) {
    case "openai":
    case "perplexity":
      return raw?.choices?.[0]?.message?.content ?? "";

    case "anthropic":
      if (Array.isArray(raw?.content)) {
        return raw.content
          .filter((b) => b.type === "text")
          .map((b) => b.text)
          .join("");
      }
      return raw?.completion ?? "";

    case "gemini":
      return (
        raw?.candidates?.[0]?.content?.parts
          ?.filter((p) => p.text)
          .map((p) => p.text)
          .join("") ?? ""
      );

    case "huggingface":
      if (Array.isArray(raw)) {
        return raw?.[0]?.generated_text ?? "";
      }
      return raw?.generated_text ?? "";

    case "ollama":
      return raw?.response ?? "";

    case "custom":
      return raw?.text ?? raw?.output ?? raw?.response ?? "";

    default:
      return raw?.text ?? raw?.output ?? raw?.response ?? raw?.choices?.[0]?.message?.content ?? "";
  }
}

function extractTokens(raw, provider) {
  const empty = { prompt: 0, completion: 0 };

  switch (provider) {
    case "openai":
    case "perplexity":
      return {
        prompt: raw?.usage?.prompt_tokens ?? 0,
        completion: raw?.usage?.completion_tokens ?? 0
      };

    case "anthropic":
      return {
        prompt: raw?.usage?.input_tokens ?? 0,
        completion: raw?.usage?.output_tokens ?? 0
      };

    case "gemini":
      return {
        prompt: raw?.usageMetadata?.promptTokenCount ?? 0,
        completion: raw?.usageMetadata?.candidatesTokenCount ?? 0
      };

    case "ollama":
      return {
        prompt: raw?.prompt_eval_count ?? 0,
        completion: raw?.eval_count ?? 0
      };

    default:
      return empty;
  }
}
