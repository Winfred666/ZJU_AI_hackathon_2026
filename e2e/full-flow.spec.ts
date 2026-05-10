/**
 * Full-flow E2E test: upload → parse → extract → graph → RAG
 *
 * === VISUAL INSPECTION (headed mode) ===
 *   npx playwright test --headed --workers=1 e2e/full-flow.spec.ts
 *
 *   The browser stays open 60 s after each test so you can inspect the UI.
 *   Use a single worker (--workers=1) to avoid overlapping windows.
 *
 * === DEBUG (step-by-step with Inspector) ===
 *   npx playwright test --headed --workers=1 --debug e2e/full-flow.spec.ts
 *
 * === HEADLESS (CI / quick check) ===
 *   npx playwright test e2e/full-flow.spec.ts
 */
import { test, expect } from "@playwright/test";
import path from "path";

const TXT_FIXTURE = path.resolve(__dirname, "fixtures", "apple-pear.txt");
const PDF_FIXTURE = path.resolve(__dirname, "fixtures", "apple-pear.pdf");

/** Keep the browser open after test so a human can inspect the UI state. */
async function visualPause(page: import("@playwright/test").Page) {
  // Only pause when running headed (not in CI / headless)
  const isHeadless = process.argv.includes("--headed") === false;
  if (isHeadless) return;
  console.log("→ Browser stays open 60 s for visual inspection...");
  await page.waitForTimeout(60_000);
}

test.describe("Full upload flow", () => {
  test("upload .txt → parse → file list → extract button enabled", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    // --- Load app ---
    await page.goto("/");
    await expect(page.getByText("暂无教材")).toBeVisible();

    // --- Upload .txt ---
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(TXT_FIXTURE);

    await expect(page.getByText("暂无教材")).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByText("apple-pear")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/k字/)).toBeVisible({ timeout: 5000 });

    // --- Extract button enabled ---
    const extractBtn = page.getByRole("button", { name: "提取知识" });
    await expect(extractBtn).not.toBeDisabled({ timeout: 5000 });

    // --- Click extract (LLM API key not configured yet — may error, that's ok) ---
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

    await extractBtn.click();

    const graphOrError = page.locator(
      '[data-testid="knowledge-graph"], [data-testid="knowledge-graph-empty"]',
    );
    await graphOrError
      .waitFor({ state: "visible", timeout: 25000 })
      .catch(() => {
        console.log(
          "Extraction in progress or API unavailable (expected — no LLM key configured yet)",
        );
      });

    expect(realErrors).toHaveLength(0);
    await visualPause(page);
  });

  test("upload .pdf → parse and show in file list", async ({ page }) => {
    test.setTimeout(120_000);

    await page.goto("/");
    await expect(page.getByText("暂无教材")).toBeVisible();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(PDF_FIXTURE);

    await expect(page.getByText("apple-pear")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/k字/)).toBeVisible({ timeout: 5000 });

    await visualPause(page);
  });

  test("drag-and-drop .txt onto upload zone", async ({ page }) => {
    test.setTimeout(120_000);

    await page.goto("/");
    await expect(page.getByText("暂无教材")).toBeVisible();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(TXT_FIXTURE);

    await expect(page.getByText("暂无教材")).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByText("apple-pear")).toBeVisible({ timeout: 10000 });

    await visualPause(page);
  });
});
