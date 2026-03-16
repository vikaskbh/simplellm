# simple-llm

A portable multi-LLM routing library for Node.js, AWS Lambda, Cloudflare Workers, Vercel Edge, Bun, and Deno.

Think of it as **LiteLLM for the JavaScript ecosystem** — one unified API to call any LLM provider, anywhere.

---

## Features

- **Unified API** — one `completion()` call for every provider
- **Edge-native** — uses only `fetch()`, zero Node-specific APIs
- **Multi-provider** — OpenAI, Anthropic, Gemini, Perplexity, HuggingFace, Ollama, and custom endpoints
- **Fallback routing** — automatically try the next model if one fails
- **Retry logic** — handles 429s, timeouts, and network errors automatically
- **Extensible** — register your own provider with `registerProvider()`
- **Lightweight** — zero runtime dependencies

---

## Installation

```bash
npm install simple-llm
```

---

## Quick Start

```js
import { completion } from "simple-llm";

const res = await completion({
  model: "openai/gpt-4o-mini",
  apiKey: process.env.OPENAI_KEY,
  messages: [
    { role: "user", content: "Explain Kubernetes simply" }
  ]
});

console.log(res.text);
```

Switch providers with zero code change:

```js
// Anthropic Claude
const res = await completion({
  model: "anthropic/claude-3-sonnet",
  apiKey: process.env.ANTHROPIC_KEY,
  messages: [{ role: "user", content: "Hello" }]
});

// Google Gemini
const res = await completion({
  model: "gemini/gemini-1.5-pro",
  apiKey: process.env.GEMINI_KEY,
  messages: [{ role: "user", content: "Hello" }]
});

// Local Ollama
const res = await completion({
  model: "ollama/mistral",
  messages: [{ role: "user", content: "Hello" }]
});
```

---

## Supported Providers

| Prefix        | Provider        | Example Model                     |
|---------------|-----------------|-----------------------------------|
| `openai/`     | OpenAI          | `openai/gpt-4o-mini`              |
| `anthropic/`  | Anthropic       | `anthropic/claude-3-sonnet`       |
| `gemini/`     | Google Gemini   | `gemini/gemini-1.5-pro`           |
| `perplexity/` | Perplexity AI   | `perplexity/sonar-medium-online`  |
| `hf/`         | HuggingFace     | `hf/mixtral`                      |
| `ollama/`     | Ollama (local)  | `ollama/mistral`                  |
| `custom/`     | Custom endpoint | `custom/my-model`                 |

---

## Response Format

Every provider returns a normalized response:

```js
{
  text: "The response text",
  provider: "openai",
  model: "gpt-4o-mini",
  latency: 342,        // milliseconds
  tokens: {
    prompt: 15,
    completion: 87
  }
}
```

---

## Fallback Routing

Pass an array of models to try sequentially on failure:

```js
const res = await completion({
  model: ["ollama/mistral", "openai/gpt-4o-mini"],
  apiKey: process.env.OPENAI_KEY,
  messages: [{ role: "user", content: "Hello" }]
});
```

If `ollama/mistral` fails (e.g., local server not running), it automatically falls back to `openai/gpt-4o-mini`.

---

## Custom Providers

Register your own LLM endpoint:

```js
import { registerProvider } from "simple-llm";

registerProvider("my-model", async (messages, options) => {
  const res = await fetch("https://my-llm.example.com/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, ...options })
  });
  const data = await res.json();
  return {
    text: data.output,
    provider: "custom",
    model: options.model,
    latency: 0,
    tokens: { prompt: 0, completion: 0 }
  };
});

const res = await completion({
  model: "custom/my-model",
  messages: [{ role: "user", content: "Hello" }]
});
```

---

## Architecture

```
simple-llm/
├── src/
│   ├── index.js             # Public API exports
│   ├── completion.js        # Main completion() function + fallback logic
│   ├── router.js            # Parses "provider/model" and routes to provider
│   ├── responseNormalizer.js # Normalizes all provider responses
│   └── retryHandler.js      # Retry on 429, timeout, network error
├── src/providers/
│   ├── openai.js
│   ├── anthropic.js
│   ├── gemini.js
│   ├── perplexity.js
│   ├── huggingface.js
│   ├── ollama.js
│   └── custom.js
├── src/utils/
│   ├── logger.js
│   ├── tokenCounter.js
│   └── costEstimator.js
├── tests/
└── examples/
```

---

## Serverless Compatibility

| Runtime              | Supported | Notes                          |
|----------------------|-----------|--------------------------------|
| Node.js >= 18        | ✅        | Native fetch built-in          |
| AWS Lambda           | ✅        | Node 18+ runtime               |
| Cloudflare Workers   | ✅        | Uses Workers fetch              |
| Vercel Edge          | ✅        | Edge-compatible                |
| Bun                  | ✅        | Native fetch                   |
| Deno                 | ✅        | Native fetch                   |

The library uses **only `fetch()`** and avoids `fs`, `path`, `os`, `crypto`, or any other Node-only module.

---

## Options Reference

```js
completion({
  model: "openai/gpt-4o-mini",    // string or string[] for fallback
  apiKey: "sk-...",               // provider API key
  messages: [...],                // OpenAI-style messages array
  maxTokens: 1000,                // max completion tokens
  temperature: 0.7,               // sampling temperature
  timeout: 10000,                 // request timeout in ms (default: 30000)
  retries: 2,                     // max retry attempts (default: 2)
  baseUrl: "https://...",         // override provider base URL
  debug: false                    // enable debug logging
})
```

---

## Extending with a New Provider

1. Create `src/providers/myprovider.js` exporting `async function generate(messages, options)`
2. Return a normalized response matching the response format above
3. Register the prefix in `src/router.js`

---

## License

- **Personal / Non-commercial**: See [LICENSE-PERSONAL](./LICENSE-PERSONAL)
- **Commercial**: See [LICENSE-COMMERCIAL](./LICENSE-COMMERCIAL) — contact us for a commercial license

---

## Contributing

PRs welcome. Please open an issue first to discuss changes.
