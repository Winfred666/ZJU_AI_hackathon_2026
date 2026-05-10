import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

// In vitest / jsdom the t3-env guard detects "client" and blocks access.
// Fall back to raw process.env when not in a true Next.js server context.
const isVitest = typeof process !== "undefined" && process.env.VITEST;

export const env = isVitest
  ? {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? "",
      OPENAI_ENDPOINT: process.env.OPENAI_ENDPOINT ?? "https://api.openai.com/v1",
      OPENAI_MODEL: process.env.OPENAI_MODEL ?? "gpt-4.1",
    }
  : createEnv({
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
