/**
 * lambda.js — AWS Lambda handler using simple-llm
 *
 * Deploy to Node.js 18+ Lambda runtime.
 * Set environment variables: OPENAI_KEY
 *
 * Event body format:
 *   { "message": "Your question here" }
 */

import { completion } from "../src/index.js";

export const handler = async (event) => {
  let body;

  try {
    body = typeof event.body === "string" ? JSON.parse(event.body) : event.body ?? event;
  } catch {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid JSON body" })
    };
  }

  const userMessage = body?.message;

  if (!userMessage) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Missing 'message' field in request body" })
    };
  }

  try {
    const res = await completion({
      model: ["openai/gpt-4o-mini"],
      apiKey: process.env.OPENAI_KEY,
      messages: [{ role: "user", content: userMessage }],
      maxTokens: 500,
      timeout: 25_000   // stay within Lambda's 30s limit
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: res.text,
        provider: res.provider,
        model: res.model,
        latency: res.latency,
        tokens: res.tokens
      })
    };
  } catch (err) {
    console.error("[lambda] completion error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message })
    };
  }
};
