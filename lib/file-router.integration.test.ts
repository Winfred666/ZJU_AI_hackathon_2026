import { describe, it, expect } from "vitest";
import { routeFile } from "./file-router";
import * as XLSX from "xlsx";

describe("File router integration tests", () => {
  it("parses .txt file end-to-end", async () => {
    const buf = Buffer.from("第一章 引言\n这是引言。\n第二章 结论\n这是结论。", "utf-8");
    const result = await routeFile(buf, "book.txt", "txt-1");
    expect(result.chapters.length).toBe(2);
    expect(result.fullText).toContain("引言");
  });

  it("parses .md file end-to-end", async () => {
    const buf = Buffer.from("# 第一章 开始\n\nMarkdown **content**.", "utf-8");
    const result = await routeFile(buf, "book.md", "md-1");
    expect(result.fullText).toContain("开始");
    expect(result.fullText).toContain("content");
  });

  it("parses real .xlsx file end-to-end", async () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ["概念", "定义"],
      ["向量", "有大小和方向的量"],
      ["矩阵", "二维数组"],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, "基础知识");
    const buf = Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));

    const result = await routeFile(buf, "math.xlsx", "xlsx-1");
    expect(result.fullText).toContain("向量");
    expect(result.fullText).toContain("矩阵");
    expect(result.fullText).toContain("基础知识");
  });

  it("routes .xls extension to excel parser", async () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([["data"]]),
      "Sheet1",
    );
    const buf = Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));

    const result = await routeFile(buf, "legacy.xls", "xls-1");
    expect(result.fullText).toContain("data");
  });
});
