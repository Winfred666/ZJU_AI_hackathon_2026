import { test, expect } from "@playwright/test";

test("home page loads with correct title", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/ZJU AI Hackathon/);
});

test("renders app shell", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "学科知识整合智能体" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "RAG 问答" })).toBeVisible();
  await expect(page.getByText("暂无知识图谱")).toBeVisible();
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
