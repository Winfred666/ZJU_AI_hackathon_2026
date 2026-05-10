import { config as dotenvConfig } from "dotenv";
// Next.js auto-loads .env.local — vitest does not, so load it explicitly.
dotenvConfig({ path: ".env.local" });
dotenvConfig({ path: ".env" });

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
