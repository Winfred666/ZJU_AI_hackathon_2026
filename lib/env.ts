import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    BACKBONE_MODEL_API: z.string().min(1),
    BACKBONE_MODEL_ENDPOINT: z.string().url(),
    BACKBONE_MODEL: z.string(),
  },
  runtimeEnv: {
    BACKBONE_MODEL_API: process.env.BACKBONE_MODEL_API,
    BACKBONE_MODEL_ENDPOINT: process.env.BACKBONE_MODEL_ENDPOINT,
    BACKBONE_MODEL: process.env.BACKBONE_MODEL,
  },
  emptyStringAsUndefined: true,
});
