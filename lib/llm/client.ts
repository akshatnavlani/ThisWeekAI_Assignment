import { GoogleGenerativeAI } from "@google/generative-ai";

export class LlmSetupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmSetupError";
  }
}

export class LlmRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmRateLimitError";
  }
}

export type GenerateJsonFn = (args: {
  systemInstruction: string;
  userPrompt: string;
}) => Promise<string>;

export function getGeminiConfig(): { apiKey: string; model: string } {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = process.env.GEMINI_MODEL?.trim();
  if (!apiKey) {
    throw new LlmSetupError(
      "GEMINI_API_KEY is not set. Add it to .env (see .env.example).",
    );
  }
  if (!model) {
    throw new LlmSetupError(
      "GEMINI_MODEL is not set. Use a Flash-class model ID from Google AI Studio.",
    );
  }
  if (/\blive\b|bidiGenerateContent|websocket/i.test(model)) {
    throw new LlmSetupError(
      `GEMINI_MODEL "${model}" looks like a Live/WebSocket-only ID. Use a Flash-class model that supports generateContent (e.g. gemini-3.5-flash-lite).`,
    );
  }
  return { apiKey, model };
}

export function createGeminiJsonGenerator(
  overrides?: { apiKey?: string; model?: string },
): GenerateJsonFn {
  const apiKey = overrides?.apiKey ?? getGeminiConfig().apiKey;
  const modelName = overrides?.model ?? getGeminiConfig().model;
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.4,
    },
  });

  return async ({ systemInstruction, userPrompt }) => {
    try {
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        systemInstruction,
      });
      const text = result.response.text();
      if (!text?.trim()) {
        throw new Error("Empty model response");
      }
      return text;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (
        /429|rate.?limit|quota|503|high demand|Unavailable/i.test(message)
      ) {
        throw new LlmRateLimitError(message);
      }
      if (
        /only supports real-time bidirectional streaming|bidiGenerateContent|Gemini Live API|WebSocket/i.test(
          message,
        )
      ) {
        throw new LlmSetupError(
          `GEMINI_MODEL "${modelName}" does not support generateContent. Set a Flash-class model ID (e.g. gemini-3.5-flash-lite) in the host env.`,
        );
      }
      throw err;
    }
  };
}
