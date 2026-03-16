/**
 * Lightweight token estimation without any external dependencies.
 *
 * This is a rough approximation only. For accurate counts, use the
 * provider's reported token usage from the API response.
 *
 * Rule of thumb: ~4 characters per token for English text.
 */

const CHARS_PER_TOKEN = 4;

/**
 * Estimates the number of tokens in a plain text string.
 *
 * @param {string} text
 * @returns {number}
 */
export function estimateTokens(text) {
  if (!text || typeof text !== "string") return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Estimates the total tokens across a messages array.
 *
 * @param {Array<{role: string, content: string}>} messages
 * @returns {number}
 */
export function estimateMessagesTokens(messages) {
  if (!Array.isArray(messages)) return 0;

  return messages.reduce((total, msg) => {
    const content = typeof msg.content === "string" ? msg.content : "";
    return total + estimateTokens(content) + 4; // ~4 tokens overhead per message
  }, 0);
}
