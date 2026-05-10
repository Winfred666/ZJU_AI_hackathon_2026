import { NextRequest, NextResponse } from "next/server";
import { Textbook } from "@/types";
import { getTextbookTitle, estimatePages, extractChapters } from "@/lib/pdf-parser";
import { routeFile, getExt, isSupported } from "@/lib/file-router";

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
      const ext = getExt(filename);

      if (!ext || !isSupported(ext)) {
        results.push({
          textbookId, filename, title: filename, totalPages: 0, totalChars: 0,
          chapters: [], status: "error",
          errorMessage: `不支持的文件格式: .${ext || "unknown"}`,
          uploadedAt: Date.now(),
        });
        continue;
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // PDF: handled specially because pdf-parse returns page count metadata
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

      // All other formats: route via file-router
      try {
        const { chapters, fullText } = await routeFile(buffer, filename, textbookId);
        results.push({
          textbookId, filename, title: getTextbookTitle(filename),
          totalPages: estimatePages(fullText), totalChars: fullText.length,
          chapters, status: "ready", uploadedAt: Date.now(),
        });
      } catch (err) {
        results.push({
          textbookId, filename, title: getTextbookTitle(filename),
          totalPages: 0, totalChars: 0, chapters: [], status: "error",
          errorMessage: `${ext.toUpperCase()} 解析失败: ${String(err)}`,
          uploadedAt: Date.now(),
        });
      }
    }

    for (const r of results) textbookStore.set(r.textbookId, r);
    return NextResponse.json({ textbooks: results });
  } catch (err) {
    return NextResponse.json({ error: `解析失败: ${String(err)}` }, { status: 500 });
  }
}
