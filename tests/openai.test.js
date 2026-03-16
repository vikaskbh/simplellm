import { describe, it, expect, vi, beforeEach } from "vitest";
import { generate } from "../src/providers/openai.js";

const MOCK_MESSAGES = [{ role: "user", content: "Hello" }];
const MOCK_OPTIONS = { apiKey: "sk-test", model: "gpt-4o-mini" };

function makeFetchMock(status, body) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body)
  });
}

describe("openai provider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns normalized response on success", async () => {
    const mockResponse = {
      choices: [{ message: { content: "Hi there!" } }],
      usage: { prompt_tokens: 5, completion_tokens: 10 }
    };

    vi.stubGlobal("fetch", makeFetchMock(200, mockResponse));

    const result = await generate(MOCK_MESSAGES, MOCK_OPTIONS);

    expect(result.text).toBe("Hi there!");
    expect(result.provider).toBe("openai");
    expect(result.model).toBe("gpt-4o-mini");
    expect(result.tokens.prompt).toBe(5);
    expect(result.tokens.completion).toBe(10);
    expect(typeof result.latency).toBe("number");
  });

  it("throws HttpError on non-OK response", async () => {
    vi.stubGlobal("fetch", makeFetchMock(401, { error: { message: "Unauthorized" } }));

    await expect(generate(MOCK_MESSAGES, MOCK_OPTIONS)).rejects.toThrow(/HTTP 401/);
  });

  it("throws on missing apiKey", async () => {
    await expect(generate(MOCK_MESSAGES, { model: "gpt-4o-mini" })).rejects.toThrow(/apiKey/);
  });

  it("passes maxTokens and temperature to request body", async () => {
    const mockResponse = {
      choices: [{ message: { content: "ok" } }],
      usage: { prompt_tokens: 1, completion_tokens: 1 }
    };

    const fetchMock = makeFetchMock(200, mockResponse);
    vi.stubGlobal("fetch", fetchMock);

    await generate(MOCK_MESSAGES, { ...MOCK_OPTIONS, maxTokens: 100, temperature: 0.5 });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.max_tokens).toBe(100);
    expect(body.temperature).toBe(0.5);
  });

  it("uses custom baseUrl when provided", async () => {
    const mockResponse = {
      choices: [{ message: { content: "ok" } }],
      usage: {}
    };

    const fetchMock = makeFetchMock(200, mockResponse);
    vi.stubGlobal("fetch", fetchMock);

    await generate(MOCK_MESSAGES, { ...MOCK_OPTIONS, baseUrl: "https://custom.api.com/v1" });

    expect(fetchMock.mock.calls[0][0]).toContain("https://custom.api.com/v1");
  });
});
