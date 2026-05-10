import path from "path";
import fs from "fs";
import * as XLSX from "xlsx";
import { test, expect } from "@playwright/test";

test("home page loads with correct title", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("title")).not.toBeEmpty();
});

test("renders app shell", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /知识整合智能体/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "RAG 问答" })).toBeVisible();
  await expect(page.getByTestId("knowledge-graph-empty")).toBeVisible();
});

test("upload zone is present", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "点击上传" })).toBeVisible();
  await expect(page.getByText(/支持 PDF.*TXT.*MD/)).toBeVisible({ timeout: 10000 });
});

test("knowledge buttons are present (disabled when no textbook)", async ({ page }) => {
  await page.goto("/");

  // Wait for the knowledge panel section to render
  await expect(page.getByText("知识处理")).toBeVisible({ timeout: 10000 });

  const extractBtn = page.getByRole("button", { name: /提取知识/, exact: false }).first();
  await expect(extractBtn).toBeVisible({ timeout: 5000 });
  await expect(extractBtn).toBeDisabled();

  const indexBtn = page.getByRole("button", { name: /建立索引/, exact: false }).first();
  await expect(indexBtn).toBeVisible({ timeout: 5000 });
  await expect(indexBtn).toBeDisabled();
});

test("no console errors on initial load", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" && !msg.text().startsWith("[G6")) {
      errors.push(msg.text());
    }
  });

  await page.goto("/");

  await expect(page.getByText("暂无知识图谱")).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("暂无教材")).toBeVisible({ timeout: 5000 });

  expect(errors).toHaveLength(0);
});

test("uploads a .txt file and sees it in file list", async ({ page }) => {
  await page.goto("/");
  const filePath = path.join(__dirname, "fixtures", "sample.txt");

  await page.locator('input[type="file"]').setInputFiles(filePath);
  await expect(page.getByRole("button", { name: /sample/ }).first()).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/\d.*字/).first()).toBeVisible({ timeout: 10000 });
});

test("uploads a .md file and extracts text", async ({ page }) => {
  await page.goto("/");
  const filePath = path.join(__dirname, "fixtures", "sample.md");

  await page.locator('input[type="file"]').setInputFiles(filePath);
  await expect(page.getByRole("button", { name: /sample/ }).first()).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/\d.*字/).first()).toBeVisible({ timeout: 10000 });
});

test("uploads a .xlsx file and extracts text", async ({ page }) => {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ["概念", "定义"],
      ["机器学习", "通过数据自动改进算法性能"],
      ["深度学习", "使用多层神经网络的机器学习"],
    ]),
    "基础知识",
  );
  const xlsxBuf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const fixturesDir = path.join(__dirname, "fixtures");
  if (!fs.existsSync(fixturesDir)) fs.mkdirSync(fixturesDir, { recursive: true });
  const filePath = path.join(fixturesDir, "sample.xlsx");
  fs.writeFileSync(filePath, xlsxBuf);

  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles(filePath);
  await expect(page.getByRole("button", { name: /sample/ }).first()).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/\d.*字/).first()).toBeVisible({ timeout: 10000 });

  fs.unlinkSync(filePath);
});

test("uploads multiple files at once", async ({ page }) => {
  await page.goto("/");
  const txtPath = path.join(__dirname, "fixtures", "sample.txt");
  const mdPath = path.join(__dirname, "fixtures", "sample.md");

  await page.locator('input[type="file"]').setInputFiles([txtPath, mdPath]);
  await expect(page.getByRole("button", { name: /sample\.txt/ })).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole("button", { name: /sample\.md/ })).toBeVisible({ timeout: 10000 });
});

test("rejects unsupported file gracefully", async ({ page }) => {
  await page.goto("/");

  const fixturesDir = path.join(__dirname, "fixtures");
  if (!fs.existsSync(fixturesDir)) fs.mkdirSync(fixturesDir, { recursive: true });
  const unsupportedPath = path.join(fixturesDir, "bad.exe");
  fs.writeFileSync(unsupportedPath, "fake content");

  await page.locator('input[type="file"]').setInputFiles(unsupportedPath);
  await expect(page.getByRole("button", { name: /bad\.exe/ })).toBeVisible({ timeout: 10000 });

  fs.unlinkSync(unsupportedPath);
});
