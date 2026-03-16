/**
 * edge.js — Cloudflare Workers handler using simple-llm
 *
 * Deploy with Wrangler:
 *   wrangler deploy
 *
 * Set secrets:
 *   wrangler secret put OPENAI_KEY
 *   wrangler secret put ANTHROPIC_KEY
 *
 * Workers do not support process.env — use the env parameter instead.
 *
 * This example uses the `fetch` event model (Service Worker syntax) and
 * the newer Module Worker syntax (export default).
 */

import { completion } from "../src/index.js";

export default {
  /**
   * @param {Request}     request
   * @param {{ OPENAI_KEY: string, ANTHROPIC_KEY: string }} env
   * @param {ExecutionContext} ctx
   */
  async fetch(request, env, ctx) {
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Only POST requests are supported" }), {
        status: 405,
        headers: { "Content-Type": "application/json" }
      });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const { message, model = "openai/gpt-4o-mini" } = body;

    if (!message) {
      return new Response(JSON.stringify({ error: "Missing 'message' field" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Resolve apiKey from Worker environment bindings
    const apiKey = resolveApiKey(model, env);

    try {
      const res = await completion({
        model,
        apiKey,
        messages: [{ role: "user", content: message }],
        maxTokens: 500,
        timeout: 25_000
      });

      return new Response(
        JSON.stringify({
          text: res.text,
          provider: res.provider,
          model: res.model,
          latency: res.latency
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
};

function resolveApiKey(model, env) {
  const prefix = model.split("/")[0];
  const keyMap = {
    openai: env.OPENAI_KEY,
    anthropic: env.ANTHROPIC_KEY,
    gemini: env.GEMINI_KEY,
    perplexity: env.PERPLEXITY_KEY,
    hf: env.HF_TOKEN
  };
  return keyMap[prefix] ?? null;
}
