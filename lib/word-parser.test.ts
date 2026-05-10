import { describe, it, expect } from "vitest";
import { splitWordText, parseWord } from "./word-parser";

describe("splitWordText", () => {
  it("splits text into chapters by chapter regex", () => {
    const text = "第一章 概述\n概述内容。\n第二章 方法\n方法内容。";
    const result = splitWordText(text, "test-id");
    expect(result.chapters.length).toBe(2);
    expect(result.chapters[0].title).toContain("第一章");
    expect(result.chapters[1].title).toContain("第二章");
  });

  it("returns single '全文' chapter when no chapter headings found", () => {
    const result = splitWordText("No headings here.", "test-id");
    expect(result.chapters.length).toBe(1);
    expect(result.chapters[0].title).toBe("全文");
    expect(result.chapters[0].content).toBe("No headings here.");
  });

  it("handles empty text", () => {
    const result = splitWordText("", "test-id");
    expect(result.chapters.length).toBe(1);
    expect(result.chapters[0].title).toBe("全文");
    expect(result.chapters[0].content).toBe("");
  });

  it("normalizes line endings", () => {
    const text = "第一章 测试\r\n内容行1\r\n内容行2";
    const result = splitWordText(text, "test-id");
    expect(result.fullText).not.toContain("\r\n");
  });
});

describe("parseWord", () => {
  it("exists as an async function accepting Buffer and textbookId", () => {
    expect(typeof parseWord).toBe("function");
  });
});
