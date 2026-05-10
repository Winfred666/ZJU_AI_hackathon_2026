import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    OPENAI_API_KEY: z.string().min(1),
    OPENAI_ENDPOINT: z.string().url().default("https://api.openai.com/v1"),
    OPENAI_MODEL: z.string().default("gpt-4.1"),
  },
  runtimeEnv: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_ENDPOINT: process.env.OPENAI_ENDPOINT,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
  },
  emptyStringAsUndefined: true,
});
