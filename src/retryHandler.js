import { log } from "./utils/logger.js";

const DEFAULT_MAX_RETRIES = 2;
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

/**
 * Executes an async function with retry logic.
 *
 * Retries on:
 *   - HTTP 429 (rate limit)
 *   - HTTP 5xx (server errors)
 *   - Network errors / timeouts
 *
 * @param {() => Promise<any>} fn         - The async function to execute
 * @param {object}             [opts]
 * @param {number}             [opts.retries=2]   - Max retry attempts
 * @param {number}             [opts.baseDelay=300] - Base delay in ms (doubles each retry)
 * @param {boolean}            [opts.debug=false]
 * @returns {Promise<any>}
 */
export async function withRetry(fn, opts = {}) {
  const maxRetries = opts.retries ?? DEFAULT_MAX_RETRIES;
  const baseDelay = opts.baseDelay ?? 300;
  const debug = opts.debug ?? false;

  let attempt = 0;

  while (true) {
    try {
      return await fn();
    } catch (err) {
      const isRetryable = shouldRetry(err);
      const hasAttempts = attempt < maxRetries;

      if (!isRetryable || !hasAttempts) {
        throw err;
      }

      attempt++;
      const delay = baseDelay * Math.pow(2, attempt - 1);

      if (debug) {
        log(
          "warn",
          `[simple-llm] Retrying (attempt ${attempt}/${maxRetries}) after ${delay}ms — ${err.message}`
        );
      }

      await sleep(delay);
    }
  }
}

function shouldRetry(err) {
  if (err.name === "AbortError" || err.name === "TimeoutError") return true;
  if (err.type === "network") return true;
  if (err instanceof TypeError && err.message.includes("fetch")) return true;

  if (err.status != null && RETRYABLE_STATUS_CODES.has(err.status)) return true;
  if (err.statusCode != null && RETRYABLE_STATUS_CODES.has(err.statusCode)) return true;

  return false;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * A lightweight error class that carries an HTTP status code so retryHandler
 * can determine whether to retry.
 */
export class HttpError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.body = body;
  }
}
