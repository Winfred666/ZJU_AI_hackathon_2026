import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    OPENAI_API_KEY: z.string().min(1),
    OPENAI_BASE_URL: z.string().url().default("https://api.openai.com/v1"),
    LLM_MODEL: z.string().default("gpt-4.1"),
    EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),
  },
  runtimeEnv: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
    LLM_MODEL: process.env.LLM_MODEL,
    EMBEDDING_MODEL: process.env.EMBEDDING_MODEL,
  },
  emptyStringAsUndefined: true,
});
