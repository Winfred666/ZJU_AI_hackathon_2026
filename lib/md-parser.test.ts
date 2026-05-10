import { describe, it, expect } from "vitest";
import { parseMarkdown } from "./md-parser";

describe("parseMarkdown", () => {
  it("extracts plain text from simple markdown", () => {
    const buf = Buffer.from("# Hello\n\nThis is **bold** and *italic* text.", "utf-8");
    const result = parseMarkdown(buf, "test-id");
    expect(result.fullText).toContain("Hello");
    expect(result.fullText).toContain("bold");
    expect(result.fullText).toContain("italic");
    expect(result.fullText).not.toContain("#");
    expect(result.fullText).not.toContain("**");
  });

  it("splits into chapters when markdown headings match chapter pattern", () => {
    const buf = Buffer.from(
      "# 第一章 引言\n\n这是引言内容。\n\n# 第二章 基础\n\n这是基础内容。",
      "utf-8"
    );
    const result = parseMarkdown(buf, "test-id");
    expect(result.chapters.length).toBe(2);
    expect(result.chapters[0].title).toContain("第一章");
    expect(result.chapters[1].title).toContain("第二章");
  });

  it("returns a single '全文' chapter when no chapter headings found", () => {
    const buf = Buffer.from("Just some text\n\nNo headings here.", "utf-8");
    const result = parseMarkdown(buf, "test-id");
    expect(result.chapters.length).toBe(1);
    expect(result.chapters[0].title).toBe("全文");
  });

  it("handles empty markdown", () => {
    const buf = Buffer.from("", "utf-8");
    const result = parseMarkdown(buf, "test-id");
    expect(result.fullText).toBe("");
    expect(result.chapters.length).toBe(1);
  });

  it("strips link URLs but keeps link text", () => {
    const buf = Buffer.from("See [the docs](https://example.com) for more.", "utf-8");
    const result = parseMarkdown(buf, "test-id");
    expect(result.fullText).toContain("the docs");
    expect(result.fullText).not.toContain("https://example.com");
  });

  it("includes code block content", () => {
    const buf = Buffer.from("```python\nprint('hello')\n```", "utf-8");
    const result = parseMarkdown(buf, "test-id");
    expect(result.fullText).toContain("print('hello')");
  });

  it("normalizes Windows line endings \\r\\n to \\n", () => {
    const buf = Buffer.from("# 第一章\r\n\r\n内容行1\r\n内容行2", "utf-8");
    const result = parseMarkdown(buf, "test-id");
    expect(result.fullText).not.toContain("\r");
    expect(result.chapters.length).toBe(1);
  });
});
