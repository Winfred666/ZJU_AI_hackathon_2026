import { NextRequest, NextResponse } from "next/server";
import { Textbook, TOCGraph } from "@/types";
import { parseTxtContent } from "@/lib/txt-parser";
import {
  getTextbookTitle,
  estimatePages,
  extractChapters,
  extractTOC,
  extractFirstNPages,
} from "@/lib/pdf-parser";
import { extractTOCGraph } from "@/lib/toc-llm";

export const textbookStore = new Map<string, Textbook>();
export const tocGraphStore = new Map<string, TOCGraph>();

const TINY_FILE_BYTES = 50_000; // 50KB: send whole file to LLM
const FALLBACK_PAGES = 20; // when TOC fails, parse only first 20 pages

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

      if (!ext || !["pdf", "txt", "md"].includes(ext)) {
        results.push(makeError(textbookId, filename, `不支持的文件格式: .${ext}`));
        continue;
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (ext === "pdf") {
        const result = await handlePdf(buffer, file, textbookId, filename);
        results.push(result.textbook);
        if (result.tocGraph !== undefined) {
          tocGraphs[textbookId] = result.tocGraph;
        }
        continue;
      }

      // TXT / MD: always parse fully, then extract TOC graph from content
      const rawText = new TextDecoder("utf-8").decode(buffer);
      const { chapters, fullText } = parseTxtContent(rawText, textbookId);

      const textbook: Textbook = {
        textbookId, filename, title: getTextbookTitle(filename),
        totalPages: estimatePages(fullText), totalChars: fullText.length,
        chapters, tocText: fullText.slice(0, 500), tocPageRange: null,
        status: "full", statusDetail: "全文解析完成",
        uploadedAt: Date.now(),
      };

      results.push(textbook);
      textbookStore.set(textbookId, textbook);

      const chapterPageMap = chapters.map((c) => ({
        title: c.title, pageStart: c.pageStart, pageEnd: c.pageEnd,
      }));
      const tGraph = await extractTOCGraph(fullText.slice(0, 30_000), textbookId, chapterPageMap);
      if (tGraph) tocGraphStore.set(textbookId, tGraph);
      tocGraphs[textbookId] = tGraph;
    }

    return NextResponse.json({ textbooks: results, tocGraphs });
  } catch (err) {
    return NextResponse.json({ error: `解析失败: ${String(err)}` }, { status: 500 });
  }
}

async function handlePdf(
  buffer: Buffer,
  file: File,
  textbookId: string,
  filename: string,
): Promise<{ textbook: Textbook; tocGraph?: TOCGraph | null }> {
  const fileBytes = file.size;
  const title = getTextbookTitle(filename);

  try {
    const fullText = await extractPdfText(buffer);
    const totalPages = estimatePages(fullText);

    // ── Tiny file (< 50KB): parse fully, send whole text to LLM ──
    if (fileBytes < TINY_FILE_BYTES) {
      const chapters = extractChapters(fullText, textbookId);
      const textbook: Textbook = {
        textbookId, filename, title, totalPages, totalChars: fullText.length,
        chapters, tocText: "", tocPageRange: null,
        status: "full", statusDetail: `全文解析完成 (${(fileBytes / 1024).toFixed(0)}KB)`,
        uploadedAt: Date.now(),
      };
      textbookStore.set(textbookId, textbook);

      const chapterPageMap = chapters.map((c) => ({
        title: c.title, pageStart: c.pageStart, pageEnd: c.pageEnd,
      }));
      const tGraph = await extractTOCGraph(fullText.slice(0, 30_000), textbookId, chapterPageMap);
      if (tGraph) tocGraphStore.set(textbookId, tGraph);
      return { textbook, tocGraph: tGraph };
    }

    // ── Large file: try TOC extraction first ──
    const { tocText, pageRange } = extractTOC(fullText, totalPages);

    if (tocText) {
      // TOC found: parse only TOC pages for graph, store chapter structure
      const chapters = extractChapters(fullText, textbookId);
      const textbook: Textbook = {
        textbookId, filename, title, totalPages, totalChars: fullText.length,
        chapters, tocText, tocPageRange: pageRange,
        status: "toc_only",
        statusDetail: `目录已解析 · 共${totalPages}页`,
        uploadedAt: Date.now(),
      };
      textbookStore.set(textbookId, textbook);

      const chapterPageMap = chapters.map((c) => ({
        title: c.title, pageStart: c.pageStart, pageEnd: c.pageEnd,
      }));
      const tGraph = await extractTOCGraph(tocText, textbookId, chapterPageMap);
      if (tGraph) tocGraphStore.set(textbookId, tGraph);
      return { textbook, tocGraph: tGraph };
    }

    // ── TOC not found: fallback to first 20 pages ──
    const firstNText = extractFirstNPages(fullText, totalPages, FALLBACK_PAGES);
    const chapters = extractChapters(firstNText, textbookId);
    const textbook: Textbook = {
      textbookId, filename, title, totalPages, totalChars: fullText.length,
      chapters, tocText: "", tocPageRange: null,
      status: "partial",
      statusDetail: `已解析前 ${Math.min(FALLBACK_PAGES, totalPages)}/${totalPages} 页`,
      uploadedAt: Date.now(),
    };
    textbookStore.set(textbookId, textbook);

    const chapterPageMap = chapters.map((c) => ({
      title: c.title, pageStart: c.pageStart, pageEnd: c.pageEnd,
    }));
    const tGraph = await extractTOCGraph(firstNText, textbookId, chapterPageMap);
    if (tGraph) tocGraphStore.set(textbookId, tGraph);
    return { textbook, tocGraph: tGraph };
  } catch (err) {
    const textbook = makeError(textbookId, filename, `PDF 解析失败: ${String(err)}`);
    textbookStore.set(textbookId, textbook);
    return { textbook };
  }
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
  }
  return pages.join("\n");
}

function makeError(id: string, filename: string, msg: string): Textbook {
  return {
    textbookId: id, filename, title: filename, totalPages: 0, totalChars: 0,
    chapters: [], tocText: "", tocPageRange: null,
    status: "error", statusDetail: msg, errorMessage: msg, uploadedAt: Date.now(),
  };
}
