import { test, expect } from "@playwright/test";

test("home page loads with correct title", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/ZJU AI Hackathon/);
});

test("renders three-panel layout", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "教材管理" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "功能面板" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "RAG 问答" })).toBeVisible();
});

test("action buttons are present", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "提取知识" })).toBeVisible();
  await expect(page.getByRole("button", { name: "构建图谱" })).toBeVisible();
  await expect(page.getByRole("button", { name: "建立索引" })).toBeVisible();
});
