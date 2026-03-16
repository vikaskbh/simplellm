import { describe, it, expect, vi, beforeEach } from "vitest";
import { generate } from "../src/providers/huggingface.js";

const MOCK_MESSAGES = [{ role: "user", content: "Hello" }];
const MOCK_OPTIONS = {
  apiKey: "hf_test_token",
  model: "mistralai/Mixtral-8x7B-Instruct-v0.1"
};

function makeFetchMock(status, body) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body)
  });
}

describe("huggingface provider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns normalized response from array format", async () => {
    const mockResponse = [{ generated_text: "Hi from HF!" }];

    vi.stubGlobal("fetch", makeFetchMock(200, mockResponse));

    const result = await generate(MOCK_MESSAGES, MOCK_OPTIONS);

    expect(result.text).toBe("Hi from HF!");
    expect(result.provider).toBe("huggingface");
    expect(result.model).toBe("mistralai/Mixtral-8x7B-Instruct-v0.1");
  });

  it("returns normalized response from object format", async () => {
    const mockResponse = { generated_text: "Hi from HF object format!" };

    vi.stubGlobal("fetch", makeFetchMock(200, mockResponse));

    const result = await generate(MOCK_MESSAGES, MOCK_OPTIONS);

    expect(result.text).toBe("Hi from HF object format!");
  });

  it("includes model path in URL", async () => {
    const fetchMock = makeFetchMock(200, [{ generated_text: "ok" }]);
    vi.stubGlobal("fetch", fetchMock);

    await generate(MOCK_MESSAGES, MOCK_OPTIONS);

    const url = fetchMock.mock.calls[0][0];
    expect(url).toContain("mistralai/Mixtral-8x7B-Instruct-v0.1");
  });

  it("throws on missing apiKey", async () => {
    await expect(
      generate(MOCK_MESSAGES, { model: "mistralai/Mixtral-8x7B-Instruct-v0.1" })
    ).rejects.toThrow(/apiKey/);
  });

  it("throws HttpError on 503 (model loading)", async () => {
    vi.stubGlobal("fetch", makeFetchMock(503, { error: "Model is loading" }));
    await expect(generate(MOCK_MESSAGES, MOCK_OPTIONS)).rejects.toThrow(/HTTP 503/);
  });
});
