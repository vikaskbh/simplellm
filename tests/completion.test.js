import { describe, it, expect, vi, beforeEach } from "vitest";
import { completion } from "../src/completion.js";

const MOCK_MESSAGES = [{ role: "user", content: "Hello" }];

function makeFetchMock(status, body) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body)
  });
}

describe("completion()", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calls the correct provider and returns normalized response", async () => {
    const mockResponse = {
      choices: [{ message: { content: "Hello!" } }],
      usage: { prompt_tokens: 2, completion_tokens: 5 }
    };

    vi.stubGlobal("fetch", makeFetchMock(200, mockResponse));

    const result = await completion({
      model: "openai/gpt-4o-mini",
      apiKey: "sk-test",
      messages: MOCK_MESSAGES
    });

    expect(result.text).toBe("Hello!");
    expect(result.provider).toBe("openai");
    expect(result.model).toBe("gpt-4o-mini");
  });

  it("throws if model is missing", async () => {
    await expect(completion({ messages: MOCK_MESSAGES })).rejects.toThrow(/model is required/);
  });

  it("throws if messages is missing", async () => {
    await expect(completion({ model: "openai/gpt-4o-mini", apiKey: "sk-test" })).rejects.toThrow(
      /messages/
    );
  });

  it("throws if messages is empty", async () => {
    await expect(
      completion({ model: "openai/gpt-4o-mini", apiKey: "sk-test", messages: [] })
    ).rejects.toThrow(/messages/);
  });

  it("falls back to second model on first failure", async () => {
    let callCount = 0;

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new TypeError("fetch failed"));
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            choices: [{ message: { content: "Fallback response" } }],
            usage: { prompt_tokens: 2, completion_tokens: 6 }
          }),
          text: async () => ""
        });
      })
    );

    const result = await completion({
      model: ["ollama/mistral", "openai/gpt-4o-mini"],
      apiKey: "sk-test",
      messages: MOCK_MESSAGES,
      retries: 0
    });

    expect(result.text).toBe("Fallback response");
    expect(result.provider).toBe("openai");
  });

  it("throws after all fallback models fail", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));

    await expect(
      completion({
        model: ["ollama/mistral", "openai/gpt-4o-mini"],
        apiKey: "sk-test",
        messages: MOCK_MESSAGES,
        retries: 0
      })
    ).rejects.toThrow(/All models failed/);
  });
});
