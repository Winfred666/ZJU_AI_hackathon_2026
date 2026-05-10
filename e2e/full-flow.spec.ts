/**
 * Full-flow E2E test: upload → parse → auto knowledge graph
 *
 * === VISUAL INSPECTION (headed mode) ===
 *   npx playwright test --headed --workers=1 e2e/full-flow.spec.ts
 *
 * === HEADLESS ===
 *   npx playwright test e2e/full-flow.spec.ts
 */
import { test, expect } from "@playwright/test";
import path from "path";

const SMALL_PDF = path.resolve(__dirname, "fixtures", "apple-pear.pdf");
const BIG_PDF = path.resolve(__dirname, "..", "docs", "textbook", "03_生理学.pdf");

/** Keep browser open for visual inspection (skipped in CI). */
async function visualPause(page: import("@playwright/test").Page) {
  if (process.env.CI) return;
  console.log("→ Browser stays open 60 s for visual inspection...");
  await page.waitForTimeout(60_000);
}

test.describe("Full upload flow", () => {
  test("small PDF (< 50KB) → full file parsing → knowledge graph renders", async ({
    page,
  }) => {
    test.setTimeout(180_000);

    const realErrors: string[] = [];
    page.on("console", (msg) => {
      if (
        msg.type() === "error" &&
        !msg.text().startsWith("[G6") &&
        !msg.text().includes("Failed to load resource")
      ) {
        realErrors.push(msg.text());
      }
    });

    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.getByText("暂无教材")).toBeVisible();

    await page.screenshot({ path: "test-results/before-upload.png" }).catch(() => {});

    const fileInput = page.getByTestId("file-input");
    await expect(fileInput).toBeAttached({ timeout: 5000 });

    await fileInput.setInputFiles(SMALL_PDF);
    // React synthetic event dispatch
    await fileInput.dispatchEvent("input");
    await fileInput.dispatchEvent("change");

    // LLM TOC extraction takes ~5-15s — wait for file list to update
    await expect(page.getByText(/apple pear/i)).toBeVisible({ timeout: 60000 });

    // Knowledge graph renders from full-file LLM extraction
    await expect(page.getByTestId("knowledge-graph")).toBeVisible({ timeout: 60000 });

    expect(realErrors).toHaveLength(0);
    await page.pause();
  });

  test("big PDF (> 50KB) → TOC-only parsing → knowledge graph renders", async ({
    page,
  }) => {
    test.setTimeout(300_000); // big file upload + TOC extraction may take a while

    const realErrors: string[] = [];
    page.on("console", (msg) => {
      if (
        msg.type() === "error" &&
        !msg.text().startsWith("[G6") &&
        !msg.text().includes("Failed to load resource")
      ) {
        realErrors.push(msg.text());
      }
    });

    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.getByText("暂无教材")).toBeVisible();

    // Upload big PDF (~32MB) — falls into TOC extraction branch
    const bigInput = page.getByTestId("file-input");
    await expect(bigInput).toBeAttached({ timeout: 5000 });
    await bigInput.setInputFiles(BIG_PDF);
    await bigInput.dispatchEvent("input");
    await bigInput.dispatchEvent("change");

    console.log("Big file set, waiting for response...");
    await page.screenshot({ path: "test-results/big-pdf-after-upload.png" }).catch(() => {});
    const pageText = await page.textContent("body");
    console.log("Page text after upload:", pageText?.slice(0, 400));

    // File appears with "toc_only" status (目录解析)
    await expect(page.getByText(/生理/i)).toBeVisible({ timeout: 120000 });

    // Knowledge graph renders from TOC LLM extraction
    await expect(page.getByTestId("knowledge-graph")).toBeVisible({ timeout: 180000 });

    expect(realErrors).toHaveLength(0);
    await page.pause();
  });
});
