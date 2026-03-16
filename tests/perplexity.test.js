import { describe, it, expect, vi, beforeEach } from "vitest";
import { generate } from "../src/providers/perplexity.js";

const MOCK_MESSAGES = [{ role: "user", content: "What's the news?" }];
const MOCK_OPTIONS = { apiKey: "pplx-test-key", model: "sonar-medium-online" };

function makeFetchMock(status, body) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body)
  });
}

describe("perplexity provider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns normalized response on success", async () => {
    const mockResponse = {
      choices: [{ message: { content: "Here's the news..." } }],
      usage: { prompt_tokens: 8, completion_tokens: 25 }
    };

    vi.stubGlobal("fetch", makeFetchMock(200, mockResponse));

    const result = await generate(MOCK_MESSAGES, MOCK_OPTIONS);

    expect(result.text).toBe("Here's the news...");
    expect(result.provider).toBe("perplexity");
    expect(result.model).toBe("sonar-medium-online");
    expect(result.tokens.prompt).toBe(8);
    expect(result.tokens.completion).toBe(25);
  });

  it("throws on missing apiKey", async () => {
    await expect(generate(MOCK_MESSAGES, { model: "sonar-medium-online" })).rejects.toThrow(/apiKey/);
  });

  it("throws HttpError on rate limit", async () => {
    vi.stubGlobal("fetch", makeFetchMock(429, { error: "Too Many Requests" }));
    await expect(generate(MOCK_MESSAGES, MOCK_OPTIONS)).rejects.toThrow(/HTTP 429/);
  });
});
