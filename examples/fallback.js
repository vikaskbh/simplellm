/**
 * fallback.js — Demonstrates multi-model fallback routing.
 *
 * Tries local Ollama first. If it's not running, falls back to OpenAI.
 *
 * Run:
 *   OPENAI_KEY=sk-... node examples/fallback.js
 */

import { completion, setLogLevel } from "../src/index.js";

// Enable warn-level logging to see fallback messages
setLogLevel("warn");

const res = await completion({
  model: ["ollama/mistral", "openai/gpt-4o-mini"],
  apiKey: process.env.OPENAI_KEY,
  messages: [
    {
      role: "user",
      content: "What is the difference between a container and a virtual machine?"
    }
  ],
  maxTokens: 400,
  retries: 1,
  debug: true
});

console.log("Provider used:", res.provider);
console.log("Model used:   ", res.model);
console.log("Response:", res.text);
