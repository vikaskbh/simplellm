import { describe, it, expect } from "vitest";
import { parseModel, resolveProvider } from "../src/router.js";

describe("parseModel", () => {
  it("parses openai prefix", () => {
    const result = parseModel("openai/gpt-4o-mini");
    expect(result).toEqual({ provider: "openai", model: "gpt-4o-mini" });
  });

  it("parses anthropic prefix", () => {
    const result = parseModel("anthropic/claude-3-sonnet");
    expect(result).toEqual({ provider: "anthropic", model: "claude-3-sonnet" });
  });

  it("parses gemini prefix", () => {
    const result = parseModel("gemini/gemini-1.5-pro");
    expect(result).toEqual({ provider: "gemini", model: "gemini-1.5-pro" });
  });

  it("parses perplexity prefix", () => {
    const result = parseModel("perplexity/sonar-medium-online");
    expect(result).toEqual({ provider: "perplexity", model: "sonar-medium-online" });
  });

  it("parses hf prefix", () => {
    const result = parseModel("hf/mistralai/Mixtral-8x7B-Instruct-v0.1");
    expect(result).toEqual({ provider: "hf", model: "mistralai/Mixtral-8x7B-Instruct-v0.1" });
  });

  it("parses ollama prefix", () => {
    const result = parseModel("ollama/mistral");
    expect(result).toEqual({ provider: "ollama", model: "mistral" });
  });

  it("parses custom prefix", () => {
    const result = parseModel("custom/my-private-model");
    expect(result).toEqual({ provider: "custom", model: "my-private-model" });
  });

  it("normalizes provider to lowercase", () => {
    const result = parseModel("OpenAI/gpt-4o-mini");
    expect(result.provider).toBe("openai");
  });

  it("throws on missing slash", () => {
    expect(() => parseModel("gpt-4o-mini")).toThrow(/Invalid model format/);
  });

  it("throws on empty provider", () => {
    expect(() => parseModel("/gpt-4o-mini")).toThrow(/Invalid model format/);
  });

  it("throws on empty model", () => {
    expect(() => parseModel("openai/")).toThrow(/Invalid model format/);
  });
});

describe("resolveProvider", () => {
  it("resolves known providers", () => {
    const providers = ["openai", "anthropic", "gemini", "perplexity", "hf", "ollama", "custom"];
    for (const p of providers) {
      expect(resolveProvider(p)).toBeTypeOf("function");
    }
  });

  it("throws for unknown provider", () => {
    expect(() => resolveProvider("unknown-provider")).toThrow(/Unknown provider/);
  });
});
