import { describe, it, expect } from "vitest";
import { flattenSheets, parseExcel } from "./excel-parser";
import * as XLSX from "xlsx";

describe("flattenSheets", () => {
  it("converts 2D array to tab-separated text with newlines", () => {
    const data = [
      ["Name", "Age", "City"],
      ["Alice", "30", "NYC"],
      ["Bob", "25", "LA"],
    ];
    const text = flattenSheets(data);
    expect(text).toContain("Name\tAge\tCity");
    expect(text).toContain("Alice\t30\tNYC");
    expect(text).toContain("Bob\t25\tLA");
  });

  it("handles empty sheet", () => {
    expect(flattenSheets([])).toBe("");
  });

  it("handles rows with empty cells", () => {
    const data = [["A", "", "C"], ["", "B", ""]];
    const text = flattenSheets(data);
    expect(text).toBe("A\t\tC\n\tB\t");
  });
});

describe("parseExcel", () => {
  it("parses a minimal .xlsx workbook into fullText with sheet chapters", () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([["Header1", "Header2"], ["val1", "val2"]]);
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const buf = Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));

    const result = parseExcel(buf, "test-id");
    expect(result.fullText).toContain("Header1");
    expect(result.fullText).toContain("val1");
    expect(result.fullText).toContain("val2");
    expect(result.fullText).toContain("=== Sheet: Sheet1 ===");
  });

  it("creates chapters per sheet for multi-sheet workbooks", () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["A"]]), "第一章 数据");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["B"]]), "第二章 结果");
    const buf = Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));

    const result = parseExcel(buf, "test-id");
    expect(result.chapters.length).toBe(2);
    expect(result.chapters[0].title).toBe("第一章 数据");
    expect(result.chapters[1].title).toBe("第二章 结果");
  });

  it("handles single-sheet workbook as one chapter", () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["X"]]), "Data");
    const buf = Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));

    const result = parseExcel(buf, "test-id");
    expect(result.chapters.length).toBe(1);
    expect(result.chapters[0].title).toBe("全文");
    expect(result.fullText).toContain("X");
  });

  it("handles workbook with empty sheet", () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([]), "Empty");
    const buf = Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
    const result = parseExcel(buf, "test-id");
    expect(result.chapters.length).toBe(1);
    expect(result.chapters[0].title).toBe("全文");
  });
});
