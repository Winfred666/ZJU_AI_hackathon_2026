import { NextRequest, NextResponse } from "next/server";
import { Textbook } from "@/types";
import { parseTxtContent } from "@/lib/txt-parser";
import { getTextbookTitle, estimatePages } from "@/lib/pdf-parser";

export const textbookStore = new Map<string, Textbook>();
/** Raw PDF buffers for on-demand page extraction in drill-down */
export const pdfBufferStore = new Map<string, Buffer>();

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
        results.push(makeError(textbookId, filename, `不支持的文件格式: .${ext}`));
        continue;
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const title = getTextbookTitle(filename);

      if (ext === "pdf") {
        try {
          const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
          const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
          const totalPages = doc.numPages;

          pdfBufferStore.set(textbookId, buffer);

          const tb: Textbook = {
            textbookId, filename, title, totalPages, totalChars: 0,
            chapters: [], tocText: "", tocPageRange: null,
            status: "toc_only",
            statusDetail: `已缓存 · ${totalPages} 页 · 双击章节解析`,
            uploadedAt: Date.now(),
          };
          results.push(tb);
          textbookStore.set(textbookId, tb);
        } catch (err) {
          results.push(makeError(textbookId, filename, `PDF 加载失败: ${String(err)}`));
        }
        continue;
      }

      // TXT / MD: parse text immediately (fast, no PDF overhead)
      const rawText = new TextDecoder("utf-8").decode(buffer);
      const { chapters, fullText } = parseTxtContent(rawText, textbookId);

      const tb: Textbook = {
        textbookId, filename, title,
        totalPages: estimatePages(fullText), totalChars: fullText.length,
        chapters, tocText: fullText.slice(0, 500), tocPageRange: null,
        status: "full", statusDetail: "全文解析完成",
        uploadedAt: Date.now(),
      };
      results.push(tb);
      textbookStore.set(textbookId, tb);
    }

    return NextResponse.json({ textbooks: results });
  } catch (err) {
    return NextResponse.json({ error: `解析失败: ${String(err)}` }, { status: 500 });
  }
}

function makeError(id: string, filename: string, msg: string): Textbook {
  return {
    textbookId: id, filename, title: filename, totalPages: 0, totalChars: 0,
    chapters: [], tocText: "", tocPageRange: null,
    status: "error", statusDetail: msg, errorMessage: msg, uploadedAt: Date.now(),
  };
}
