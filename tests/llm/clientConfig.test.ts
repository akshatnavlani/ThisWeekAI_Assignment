import { afterEach, describe, expect, it } from "vitest";
import { getGeminiConfig, LlmSetupError } from "@/lib/llm/client";

const originalKey = process.env.GEMINI_API_KEY;
const originalModel = process.env.GEMINI_MODEL;

afterEach(() => {
  if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = originalKey;
  if (originalModel === undefined) delete process.env.GEMINI_MODEL;
  else process.env.GEMINI_MODEL = originalModel;
});

describe("getGeminiConfig", () => {
  it("rejects Live/WebSocket-only model IDs", () => {
    process.env.GEMINI_API_KEY = "test-key";
    process.env.GEMINI_MODEL = "gemini-3.8-live-extended-thinking";
    expect(() => getGeminiConfig()).toThrow(LlmSetupError);
    expect(() => getGeminiConfig()).toThrow(/Live\/WebSocket/i);
  });

  it("accepts Flash-class generateContent model IDs", () => {
    process.env.GEMINI_API_KEY = "test-key";
    process.env.GEMINI_MODEL = "gemini-3.5-flash-lite";
    expect(getGeminiConfig()).toEqual({
      apiKey: "test-key",
      model: "gemini-3.5-flash-lite",
    });
  });
});
