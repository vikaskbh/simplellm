import { describe, it, expect, vi, beforeEach } from "vitest";
import { generate } from "../src/providers/gemini.js";

const MOCK_MESSAGES = [{ role: "user", content: "Hello" }];
const MOCK_OPTIONS = { apiKey: "gemini-test-key", model: "gemini-1.5-pro" };

function makeFetchMock(status, body) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body)
  });
}

describe("gemini provider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns normalized response on success", async () => {
    const mockResponse = {
      candidates: [
        {
          content: {
            parts: [{ text: "Hello from Gemini!" }],
            role: "model"
          }
        }
      ],
      usageMetadata: { promptTokenCount: 3, candidatesTokenCount: 8 }
    };

    vi.stubGlobal("fetch", makeFetchMock(200, mockResponse));

    const result = await generate(MOCK_MESSAGES, MOCK_OPTIONS);

    expect(result.text).toBe("Hello from Gemini!");
    expect(result.provider).toBe("gemini");
    expect(result.model).toBe("gemini-1.5-pro");
    expect(result.tokens.prompt).toBe(3);
    expect(result.tokens.completion).toBe(8);
  });

  it("includes apiKey in URL, not headers", async () => {
    const mockResponse = {
      candidates: [{ content: { parts: [{ text: "ok" }] } }],
      usageMetadata: {}
    };

    const fetchMock = makeFetchMock(200, mockResponse);
    vi.stubGlobal("fetch", fetchMock);

    await generate(MOCK_MESSAGES, MOCK_OPTIONS);

    const url = fetchMock.mock.calls[0][0];
    expect(url).toContain("key=gemini-test-key");
  });

  it("converts messages to Gemini format", async () => {
    const mockResponse = {
      candidates: [{ content: { parts: [{ text: "ok" }] } }],
      usageMetadata: {}
    };

    const fetchMock = makeFetchMock(200, mockResponse);
    vi.stubGlobal("fetch", fetchMock);

    await generate(MOCK_MESSAGES, MOCK_OPTIONS);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.contents[0].role).toBe("user");
    expect(body.contents[0].parts[0].text).toBe("Hello");
  });

  it("maps assistant role to model in contents", async () => {
    const messages = [
      { role: "user", content: "Hi" },
      { role: "assistant", content: "Hello!" },
      { role: "user", content: "Bye" }
    ];

    const fetchMock = makeFetchMock(200, {
      candidates: [{ content: { parts: [{ text: "ok" }] } }],
      usageMetadata: {}
    });
    vi.stubGlobal("fetch", fetchMock);

    await generate(messages, MOCK_OPTIONS);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.contents[1].role).toBe("model");
  });

  it("throws on missing apiKey", async () => {
    await expect(generate(MOCK_MESSAGES, { model: "gemini-1.5-pro" })).rejects.toThrow(/apiKey/);
  });
});
