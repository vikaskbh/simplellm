import { describe, it, expect, vi, beforeEach } from "vitest";
import { generate } from "../src/providers/ollama.js";

const MOCK_MESSAGES = [{ role: "user", content: "Hello" }];
const MOCK_OPTIONS = { model: "mistral" };

function makeFetchMock(status, body) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body)
  });
}

describe("ollama provider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns normalized response on success", async () => {
    const mockResponse = {
      response: "Hello from Ollama!",
      prompt_eval_count: 5,
      eval_count: 12
    };

    vi.stubGlobal("fetch", makeFetchMock(200, mockResponse));

    const result = await generate(MOCK_MESSAGES, MOCK_OPTIONS);

    expect(result.text).toBe("Hello from Ollama!");
    expect(result.provider).toBe("ollama");
    expect(result.model).toBe("mistral");
    expect(result.tokens.prompt).toBe(5);
    expect(result.tokens.completion).toBe(12);
  });

  it("posts to default localhost endpoint", async () => {
    const fetchMock = makeFetchMock(200, { response: "ok", prompt_eval_count: 0, eval_count: 0 });
    vi.stubGlobal("fetch", fetchMock);

    await generate(MOCK_MESSAGES, MOCK_OPTIONS);

    const url = fetchMock.mock.calls[0][0];
    expect(url).toBe("http://localhost:11434/api/generate");
  });

  it("uses custom baseUrl when provided", async () => {
    const fetchMock = makeFetchMock(200, { response: "ok" });
    vi.stubGlobal("fetch", fetchMock);

    await generate(MOCK_MESSAGES, { ...MOCK_OPTIONS, baseUrl: "http://my-ollama:11434" });

    const url = fetchMock.mock.calls[0][0];
    expect(url).toBe("http://my-ollama:11434/api/generate");
  });

  it("sets stream: false in request body", async () => {
    const fetchMock = makeFetchMock(200, { response: "ok" });
    vi.stubGlobal("fetch", fetchMock);

    await generate(MOCK_MESSAGES, MOCK_OPTIONS);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.stream).toBe(false);
  });

  it("builds prompt from messages", async () => {
    const messages = [
      { role: "system", content: "Be helpful." },
      { role: "user", content: "What is AI?" }
    ];

    const fetchMock = makeFetchMock(200, { response: "ok" });
    vi.stubGlobal("fetch", fetchMock);

    await generate(messages, MOCK_OPTIONS);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.prompt).toContain("Be helpful.");
    expect(body.prompt).toContain("What is AI?");
  });

  it("throws HttpError on connection refused (non-ok response)", async () => {
    vi.stubGlobal("fetch", makeFetchMock(500, { error: "Internal Server Error" }));
    await expect(generate(MOCK_MESSAGES, MOCK_OPTIONS)).rejects.toThrow(/HTTP 500/);
  });
});
