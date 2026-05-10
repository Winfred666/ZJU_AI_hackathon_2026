import { describe, it, expect } from "vitest";
import { routeFile, isSupported, getExt, SUPPORTED_EXTENSIONS } from "./file-router";

describe("isSupported", () => {
  it("returns true for pdf", () => expect(isSupported("pdf")).toBe(true));
  it("returns true for txt", () => expect(isSupported("txt")).toBe(true));
  it("returns true for md", () => expect(isSupported("md")).toBe(true));
  it("returns true for docx", () => expect(isSupported("docx")).toBe(true));
  it("returns true for xlsx", () => expect(isSupported("xlsx")).toBe(true));
  it("returns true for xls", () => expect(isSupported("xls")).toBe(true));
  it("returns false for unsupported extensions", () => {
    expect(isSupported("exe")).toBe(false);
    expect(isSupported("png")).toBe(false);
    expect(isSupported("")).toBe(false);
  });
  it("is case insensitive", () => {
    expect(isSupported("PDF")).toBe(true);
    expect(isSupported("Docx")).toBe(true);
  });
});

describe("getExt", () => {
  it("extracts extension from filename", () => {
    expect(getExt("test.pdf")).toBe("pdf");
    expect(getExt("document.docx")).toBe("docx");
    expect(getExt("sheet.XLSX")).toBe("xlsx");
  });
  it("returns empty string for no extension", () => {
    expect(getExt("noext")).toBe("");
    expect(getExt(".")).toBe("");
  });
});

describe("SUPPORTED_EXTENSIONS", () => {
  it("includes all six extensions", () => {
    expect(SUPPORTED_EXTENSIONS).toContain("pdf");
    expect(SUPPORTED_EXTENSIONS).toContain("txt");
    expect(SUPPORTED_EXTENSIONS).toContain("md");
    expect(SUPPORTED_EXTENSIONS).toContain("docx");
    expect(SUPPORTED_EXTENSIONS).toContain("xlsx");
    expect(SUPPORTED_EXTENSIONS).toContain("xls");
  });
});

describe("routeFile", () => {
  it("routes .txt files to txt parser", async () => {
    const buf = Buffer.from("第一章 测试\n内容。", "utf-8");
    const result = await routeFile(buf, "test.txt", "id1");
    expect(result.chapters.length).toBe(1);
    expect(result.fullText).toContain("内容");
  });

  it("routes .md files to markdown parser", async () => {
    const buf = Buffer.from("# 第一章 引言\n\n内容。", "utf-8");
    const result = await routeFile(buf, "test.md", "id2");
    expect(result.chapters.length).toBe(1);
    expect(result.fullText).toContain("引言");
  });

  it("throws for unsupported extension", async () => {
    const buf = Buffer.from("whatever", "utf-8");
    await expect(routeFile(buf, "test.xyz", "id3")).rejects.toThrow("Unsupported file format");
  });

  it("throws for filename without extension", async () => {
    const buf = Buffer.from("whatever", "utf-8");
    await expect(routeFile(buf, "noext", "id4")).rejects.toThrow("Unsupported file format");
  });

  it("rejects pdf — must be handled before calling routeFile", async () => {
    const buf = Buffer.from("fake pdf", "utf-8");
    await expect(routeFile(buf, "test.pdf", "id5")).rejects.toThrow("PDF should be handled before");
  });

  it("routes .docx files to word parser (passes through to mammoth)", async () => {
    const buf = Buffer.from("not a real docx", "utf-8");
    // An invalid docx buffer will cause mammoth to throw, but the router
    // should dispatch it (error comes from parser, not from router itself)
    await expect(routeFile(buf, "test.docx", "id6")).rejects.toThrow();
  });

  it("routes .xlsx files to excel parser", async () => {
    const { utils, write } = await import("xlsx");
    const wb = utils.book_new();
    utils.book_append_sheet(wb, utils.aoa_to_sheet([["A"]]), "Data");
    const buf = Buffer.from(write(wb, { type: "buffer", bookType: "xlsx" }));

    const result = await routeFile(buf, "test.xlsx", "id7");
    expect(result.fullText).toContain("A");
  });

  it("routes .xls files to excel parser", async () => {
    const { utils, write } = await import("xlsx");
    const wb = utils.book_new();
    utils.book_append_sheet(wb, utils.aoa_to_sheet([["B"]]), "Legacy");
    const buf = Buffer.from(write(wb, { type: "buffer", bookType: "xlsx" }));

    const result = await routeFile(buf, "test.xls", "id8");
    expect(result.fullText).toContain("B");
  });
});
