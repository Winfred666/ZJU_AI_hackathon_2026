import { test, expect } from "@playwright/test";
import path from "path";

test("home page loads with correct title", async ({ page }) => {
  await page.goto("/");
  // Title may vary (学科/医学 知识整合智能体) — check it's non-empty
  await expect(page.locator("title")).not.toBeEmpty();
});

test("renders app shell", async ({ page }) => {
  await page.goto("/");
  // Semantic heading in header — matches both 学科/医学 prefix
  await expect(page.getByRole("heading", { name: /知识整合智能体/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "RAG 问答（TODO）" })).toBeVisible();
  await expect(page.getByTestId("knowledge-graph-empty")).toBeVisible();
});

test("upload zone is present", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "点击上传" })).toBeVisible();
  await expect(page.getByText("支持 PDF、TXT、MD")).toBeVisible();
});

test("knowledge buttons are present (disabled when no textbook)", async ({ page }) => {
  await page.goto("/");
  const extractBtn = page.getByRole("button", { name: "提取知识" });
  await expect(extractBtn).toBeVisible();
  await expect(extractBtn).toBeDisabled();

  const indexBtn = page.getByRole("button", { name: "建立索引" });
  await expect(indexBtn).toBeVisible();
  await expect(indexBtn).toBeDisabled();
});

test("no console errors on initial load", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    // Ignore G6 internal destroy noise (known React Strict Mode artifact)
    if (msg.type() === "error" && !msg.text().startsWith("[G6")) {
      errors.push(msg.text());
    }
  });

  await page.goto("/");

  // Wait for the empty graph placeholder to render
  await expect(page.getByText("暂无知识图谱")).toBeVisible({ timeout: 15000 });
  // Wait for the file list empty state
  await expect(page.getByText("暂无教材")).toBeVisible({ timeout: 5000 });

  expect(errors).toHaveLength(0);
});

test("can drag one file onto another to trigger merge dialog", async ({ page }) => {
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

  // Upload two small PDFs to populate the file list
  const applePearPdf = path.resolve(__dirname, "fixtures", "apple-pear.pdf");
  const applePearTxt = path.resolve(__dirname, "fixtures", "apple-pear.txt");

  // First upload: small PDF
  const fileInput = page.getByTestId("file-input");
  await expect(fileInput).toBeAttached({ timeout: 5000 });
  await fileInput.setInputFiles(applePearPdf);
  await fileInput.dispatchEvent("input");
  await fileInput.dispatchEvent("change");
  await expect(page.getByText(/apple pear/i)).toBeVisible({ timeout: 60000 });

  // Second upload: txt file (so we have two items to drag between)
  await fileInput.setInputFiles(applePearTxt);
  await fileInput.dispatchEvent("input");
  await fileInput.dispatchEvent("change");
  // Wait for second file to also appear (txt files also parse)
  await expect(page.locator('[draggable="true"]').nth(1)).toBeVisible({ timeout: 60000 });

  // Drag first item onto second to trigger merge
  const items = page.locator('[draggable="true"]');
  await items.first().dragTo(items.nth(1));

  // Verify merge dialog appears
  await expect(page.getByText("合并知识图谱")).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole("button", { name: "否，保持节点独立" })).toBeVisible();
  await expect(page.getByRole("button", { name: "是，融合同名节点" })).toBeVisible();

  // Click "是" to merge
  await page.getByRole("button", { name: "是，融合同名节点" }).click();

  // Verify dialog closes and merged entry appears
  await expect(page.getByText("合并知识图谱")).not.toBeVisible({ timeout: 5000 });
  await expect(page.getByText("已合并")).toBeVisible({ timeout: 30000 });

  expect(realErrors).toHaveLength(0);
});
