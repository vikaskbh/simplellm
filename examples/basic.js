/**
 * basic.js — Simple OpenAI call using simple-llm
 *
 * Run:
 *   OPENAI_KEY=sk-... node examples/basic.js
 */

import { completion } from "../src/index.js";

const res = await completion({
  model: "openai/gpt-4o-mini",
  apiKey: process.env.OPENAI_KEY,
  messages: [
    {
      role: "system",
      content: "You are a concise technical assistant."
    },
    {
      role: "user",
      content: "Explain Kubernetes in 3 bullet points."
    }
  ],
  maxTokens: 300
});

console.log("Response:", res.text);
console.log("Tokens used:", res.tokens);
console.log("Latency:", res.latency + "ms");
