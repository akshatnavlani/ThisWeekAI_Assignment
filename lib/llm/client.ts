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
      throw err;
    }
  };
}
