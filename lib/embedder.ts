import { createOpenAI } from "@ai-sdk/openai";
import { embed, embedMany } from "ai";
import type { EmbeddingModel } from "ai";
import { apiKey, apiEndpoint, apiModel } from "./env";

const openai = createOpenAI({
  apiKey,
  baseURL: apiEndpoint,
});

export function getEmbeddingModel(): EmbeddingModel {
  return openai.textEmbeddingModel(apiModel);
}

export async function embedSingle(text: string): Promise<number[]> {
  const model = getEmbeddingModel();
  const result = await embed({ model, value: text });
  return result.embedding;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const model = getEmbeddingModel();
  const result = await embedMany({ model, values: texts });
  return result.embeddings;
}
