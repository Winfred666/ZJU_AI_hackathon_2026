import { createOpenAI } from "@ai-sdk/openai";
import { generateText, LanguageModel } from "ai";
import { apiKey, apiEndpoint, apiModel } from "./env";

const openai = createOpenAI({
  apiKey,
  baseURL: apiEndpoint,
});

export function getLanguageModel(): LanguageModel {
  return openai.languageModel(apiModel);
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
