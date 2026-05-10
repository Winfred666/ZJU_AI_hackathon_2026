import { NextRequest, NextResponse } from "next/server";
import { Textbook, TOCGraph } from "@/types";
import { parseTxtContent } from "@/lib/txt-parser";
import {
  getTextbookTitle,
  estimatePages,
  extractChapters,
  extractTOC,
} from "@/lib/pdf-parser";
import { extractTOCGraph } from "@/lib/toc-llm";

export const textbookStore = new Map<string, Textbook>();
export const tocGraphStore = new Map<string, TOCGraph>();

const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50MB hard limit for upload

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: "请上传至少一个文件" }, { status: 400 });
    }

    const results: Textbook[] = [];
    const tocGraphs: Record<string, TOCGraph | null> = {};

    for (const file of files) {
      const textbookId = crypto.randomUUID();
      const filename = file.name;
      const ext = filename.split(".").pop()?.toLowerCase();

      if (file.size > MAX_FILE_BYTES) {
        results.push(makeError(textbookId, filename, `文件过大 (最大50MB)`));
        continue;
      }

      if (!ext || !["pdf", "txt", "md"].includes(ext)) {
        results.push(makeError(textbookId, filename, `不支持的文件格式: .${ext}`));
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
          const totalPages = textResult.total;
          const title = getTextbookTitle(filename);
          const chapters = extractChapters(fullText, textbookId);
          const { tocText, pageRange } = extractTOC(fullText, totalPages);

          const textbook: Textbook = {
            textbookId, filename, title,
            totalPages, totalChars: fullText.length,
            chapters, tocText, tocPageRange: pageRange,
            status: "ready", uploadedAt: Date.now(),
          };

          results.push(textbook);
          textbookStore.set(textbookId, textbook);

          // Auto-extract TOC graph if TOC found
          if (tocText) {
            const chapterPageMap = chapters.map((c) => ({
              title: c.title,
              pageStart: c.pageStart,
              pageEnd: c.pageEnd,
            }));
            const tGraph = await extractTOCGraph(tocText, textbookId, chapterPageMap);
            if (tGraph) {
              tocGraphStore.set(textbookId, tGraph);
              tocGraphs[textbookId] = tGraph;
            } else {
              tocGraphs[textbookId] = null;
            }
          } else {
            tocGraphs[textbookId] = null;
          }
        } catch (err) {
          results.push(makeError(textbookId, filename, `PDF 解析失败: ${String(err)}`));
        }
        continue;
      }

      // TXT / MD: parse as text, no TOC auto-detection (no page concept)
      const rawText = new TextDecoder("utf-8").decode(buffer);
      const { chapters, fullText } = parseTxtContent(rawText, textbookId);

      const textbook: Textbook = {
        textbookId, filename, title: getTextbookTitle(filename),
        totalPages: estimatePages(fullText), totalChars: fullText.length,
        chapters, tocText: "", tocPageRange: null,
        status: "ready", uploadedAt: Date.now(),
      };

      results.push(textbook);
      textbookStore.set(textbookId, textbook);
      tocGraphs[textbookId] = null;
    }

    return NextResponse.json({ textbooks: results, tocGraphs });
  } catch (err) {
    return NextResponse.json({ error: `解析失败: ${String(err)}` }, { status: 500 });
  }
}

function makeError(id: string, filename: string, msg: string): Textbook {
  return {
    textbookId: id, filename, title: filename, totalPages: 0, totalChars: 0,
    chapters: [], tocText: "", tocPageRange: null,
    status: "error", errorMessage: msg, uploadedAt: Date.now(),
  };
}
