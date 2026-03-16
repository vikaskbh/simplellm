import { describe, it, expect, vi, beforeEach } from "vitest";
import { generate } from "../src/providers/anthropic.js";

const MOCK_MESSAGES = [{ role: "user", content: "Hello" }];
const MOCK_OPTIONS = { apiKey: "sk-ant-test", model: "claude-3-sonnet" };

function makeFetchMock(status, body) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body)
  });
}

describe("anthropic provider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns normalized response on success", async () => {
    const mockResponse = {
      content: [{ type: "text", text: "Hi there!" }],
      usage: { input_tokens: 5, output_tokens: 10 }
    };

    vi.stubGlobal("fetch", makeFetchMock(200, mockResponse));

    const result = await generate(MOCK_MESSAGES, MOCK_OPTIONS);

    expect(result.text).toBe("Hi there!");
    expect(result.provider).toBe("anthropic");
    expect(result.model).toBe("claude-3-sonnet");
    expect(result.tokens.prompt).toBe(5);
    expect(result.tokens.completion).toBe(10);
  });

  it("handles multiple text content blocks", async () => {
    const mockResponse = {
      content: [
        { type: "text", text: "Hello " },
        { type: "text", text: "world!" }
      ],
      usage: { input_tokens: 3, output_tokens: 4 }
    };

    vi.stubGlobal("fetch", makeFetchMock(200, mockResponse));

    const result = await generate(MOCK_MESSAGES, MOCK_OPTIONS);
    expect(result.text).toBe("Hello world!");
  });

  it("separates system messages into system field", async () => {
    const messages = [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "Hello" }
    ];

    const mockResponse = {
      content: [{ type: "text", text: "Hi!" }],
      usage: {}
    };

    const fetchMock = makeFetchMock(200, mockResponse);
    vi.stubGlobal("fetch", fetchMock);

    await generate(messages, MOCK_OPTIONS);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.system).toBe("You are a helpful assistant.");
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0].role).toBe("user");
  });

  it("throws on missing apiKey", async () => {
    await expect(generate(MOCK_MESSAGES, { model: "claude-3-sonnet" })).rejects.toThrow(/apiKey/);
  });

  it("throws HttpError on non-OK response", async () => {
    vi.stubGlobal("fetch", makeFetchMock(429, { error: "Rate limited" }));

    await expect(generate(MOCK_MESSAGES, MOCK_OPTIONS)).rejects.toThrow(/HTTP 429/);
  });
});
