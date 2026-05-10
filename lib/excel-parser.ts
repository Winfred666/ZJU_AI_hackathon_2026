import { Chapter } from "@/types";
import * as XLSX from "xlsx";

export function flattenSheets(data: unknown[][]): string {
  if (data.length === 0) return "";
  return data.map(row => row.map(cell => String(cell ?? "")).join("\t")).join("\n");
}

export function parseExcel(
  buffer: Buffer,
  textbookId: string,
): { chapters: Chapter[]; fullText: string } {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheetNames = wb.SheetNames;

  if (sheetNames.length === 0) {
    return {
      fullText: "",
      chapters: [{
        chapterId: `${textbookId}_ch1`,
        title: "全文",
        pageStart: 1,
        pageEnd: 1,
        content: "",
        charCount: 0,
      }],
    };
  }

  const sheetTexts: string[] = [];

  const chapters: Chapter[] = sheetNames.map((name, idx) => {
    const ws = wb.Sheets[name];
    const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { header: 1, defval: "" });
    const rows = data.map(row =>
      Object.values(row).map(v => String(v ?? "")).join("\t")
    );
    const content = rows.join("\n");

    sheetTexts.push(`=== Sheet: ${name} ===\n${content}`);

    return {
      chapterId: `${textbookId}_ch${String(idx + 1).padStart(2, "0")}`,
      title: sheetNames.length === 1 ? "全文" : name,
      pageStart: 1,
      pageEnd: Math.ceil(content.length / 1500),
      content,
      charCount: content.length,
    };
  });

  return {
    fullText: sheetTexts.join("\n\n"),
    chapters,
  };
}
