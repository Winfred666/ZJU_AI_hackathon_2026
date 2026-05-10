import { createOpenAI } from "@ai-sdk/openai";
import { generateText, LanguageModel } from "ai";
import { env } from "./env";

const openai = createOpenAI({
  apiKey: env.OPENAI_API_KEY,
  baseURL: env.OPENAI_BASE_URL,
});

export function getLanguageModel(): LanguageModel {
  return openai.languageModel(env.LLM_MODEL);
}

export interface LLMGenerateOptions {
  system?: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
}

export async function llmGenerate(options: LLMGenerateOptions): Promise<string> {
  const model = getLanguageModel();
  const result = await generateText({
    model,
    system: options.system,
    prompt: options.prompt,
    temperature: options.temperature ?? 0.3,
    maxOutputTokens: options.maxTokens ?? 4096,
  });
  return result.text;
}
