import { describe, it, expect } from "vitest";
import { extractChapters, estimatePages, getTextbookTitle } from "./pdf-parser";

describe("extractChapters", () => {
  it("detects Chinese chapter headings", () => {
    const text = [
      "第一章 绪论",
      "这是绪论的内容。",
      "第二章 细胞的基本功能",
      "这是第二章的内容。",
      "第三章 血液",
      "这是第三章的内容。",
    ].join("\n");

    const chapters = extractChapters(text, "tb1");
    expect(chapters).toHaveLength(3);
    expect(chapters[0].title).toBe("第一章 绪论");
    expect(chapters[1].title).toBe("第二章 细胞的基本功能");
    expect(chapters[2].title).toBe("第三章 血液");
  });

  it("detects numeric chapter numbers", () => {
    const text = "第1章 概述\n内容\n第2章 方法\n内容";
    const chapters = extractChapters(text, "tb1");
    expect(chapters).toHaveLength(2);
  });

  it("falls back to single chapter when no headings found", () => {
    const text = "这是没有章节标题的一段文字。";
    const chapters = extractChapters(text, "tb1");
    expect(chapters).toHaveLength(1);
    expect(chapters[0].title).toBe("全文");
    expect(chapters[0].content).toBe(text);
    expect(chapters[0].chapterId).toBe("tb1_ch1");
  });

  it("assigns correct chapter content", () => {
    const text = "第一章 绪论\n本章介绍基本概念和定义。\n本节为第一节。\n第二章 细胞功能\n本章讲解细胞膜的结构与功能。";
    const chapters = extractChapters(text, "tb1");
    expect(chapters).toHaveLength(2);
    expect(chapters[0].content).toContain("基本概念");
    expect(chapters[1].content).toContain("细胞膜");
    expect(chapters[0].content).not.toContain("细胞膜");
  });
});

describe("estimatePages", () => {
  it("returns at least 1", () => {
    expect(estimatePages("")).toBe(1);
    expect(estimatePages("短")).toBe(1);
  });

  it("estimates based on 1500 chars per page", () => {
    const text = "x".repeat(3000);
    expect(estimatePages(text)).toBe(2);
  });
});

describe("getTextbookTitle", () => {
  it("strips extension", () => {
    expect(getTextbookTitle("生理学.pdf")).toBe("生理学");
    expect(getTextbookTitle("医学免疫学.txt")).toBe("医学免疫学");
  });

  it("replaces underscores and hyphens with spaces", () => {
    expect(getTextbookTitle("medical_textbook.pdf")).toBe("medical textbook");
    expect(getTextbookTitle("my-book.txt")).toBe("my book");
  });
});
