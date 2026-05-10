import { NextRequest, NextResponse } from "next/server";
import { Textbook } from "@/types";
import { parseTxtContent } from "@/lib/txt-parser";
import { getTextbookTitle, estimatePages, extractChapters } from "@/lib/pdf-parser";

export const textbookStore = new Map<string, Textbook>();

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: "请上传至少一个文件" }, { status: 400 });
    }

    const results: Textbook[] = [];

    for (const file of files) {
      const textbookId = crypto.randomUUID();
      const filename = file.name;
      const ext = filename.split(".").pop()?.toLowerCase();

      if (!ext || !["pdf", "txt", "md"].includes(ext)) {
        results.push({
          textbookId, filename, title: filename, totalPages: 0, totalChars: 0,
          chapters: [], status: "error",
          errorMessage: `不支持的文件格式: .${ext}`,
          uploadedAt: Date.now(),
        });
        continue;
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (ext === "pdf") {
        try {
          const { PDFParse } = await import("pdf-parse");
          const parser = new PDFParse({ data: buffer });
          const textResult = await parser.getText();
          const fullText = textResult.text as string;
          results.push({
            textbookId, filename, title: getTextbookTitle(filename),
            totalPages: textResult.total, totalChars: fullText.length,
            chapters: extractChapters(fullText, textbookId),
            status: "ready", uploadedAt: Date.now(),
          });
        } catch (err) {
          results.push({
            textbookId, filename, title: getTextbookTitle(filename),
            totalPages: 0, totalChars: 0, chapters: [], status: "error",
            errorMessage: `PDF 解析失败: ${String(err)}`,
            uploadedAt: Date.now(),
          });
        }
        continue;
      }

      const rawText = new TextDecoder("utf-8").decode(buffer);
      const { chapters, fullText } = parseTxtContent(rawText, textbookId);
      results.push({
        textbookId, filename, title: getTextbookTitle(filename),
        totalPages: estimatePages(fullText), totalChars: fullText.length,
        chapters, status: "ready", uploadedAt: Date.now(),
      });
    }

    for (const r of results) textbookStore.set(r.textbookId, r);
    return NextResponse.json({ textbooks: results });
  } catch (err) {
    return NextResponse.json({ error: `解析失败: ${String(err)}` }, { status: 500 });
  }
}
