import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    BACKBONE_MODEL_API: z.string().optional(),
    BACKBONE_MODEL_ENDPOINT: z.string().url().optional(),
    BACKBONE_MODEL: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),
    OPENAI_ENDPOINT: z.string().url().optional(),
    OPENAI_MODEL: z.string().optional(),
  },
  runtimeEnv: {
    BACKBONE_MODEL_API: process.env.BACKBONE_MODEL_API,
    BACKBONE_MODEL_ENDPOINT: process.env.BACKBONE_MODEL_ENDPOINT,
    BACKBONE_MODEL: process.env.BACKBONE_MODEL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_ENDPOINT: process.env.OPENAI_ENDPOINT,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
  },
  emptyStringAsUndefined: true,
});

// Resolved credentials: BACKBONE_* takes priority, fallback to OPENAI_*
export const apiKey =
  env.BACKBONE_MODEL_API ?? env.OPENAI_API_KEY ?? "";
export const apiEndpoint =
  env.BACKBONE_MODEL_ENDPOINT ?? env.OPENAI_ENDPOINT ?? "https://api.openai.com/v1";
export const apiModel =
  env.BACKBONE_MODEL ?? env.OPENAI_MODEL ?? "gpt-4.1";
