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
    console.log(`[parse] ${filename} (${(fileBytes / 1024).toFixed(0)}KB) — loading PDF...`);

    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
    const totalPages = doc.numPages;
    console.log(`[parse] ${filename} — ${totalPages} pages`);

    // ── Tiny file (< 50KB) or short doc (≤ 10 pages): parse all ──
    const SHORT_PAGE_LIMIT = 10;
    if (fileBytes < TINY_FILE_BYTES || totalPages <= SHORT_PAGE_LIMIT) {
      console.log(`[parse] ${filename} — ${fileBytes < TINY_FILE_BYTES ? "tiny file" : "short doc"}, full parse`);
      const fullText = await readPages(doc, 1, totalPages, filename);
      const chapters = extractChapters(fullText, textbookId);
      const textbook: Textbook = {
        textbookId, filename, title, totalPages, totalChars: fullText.length,
        chapters, tocText: "", tocPageRange: null,
        status: "full", statusDetail: `全文解析完成 (${(fileBytes / 1024).toFixed(0)}KB)`,
        uploadedAt: Date.now(),
      };
      textbookStore.set(textbookId, textbook);
      console.log(`[parse] ${filename} — calling LLM for TOC graph...`);
      const chapterPageMap = chapters.map((c) => ({
        title: c.title, pageStart: c.pageStart, pageEnd: c.pageEnd,
      }));
      const tGraph = await extractTOCGraph(fullText.slice(0, 30_000), textbookId, chapterPageMap);
      console.log(`[parse] ${filename} — done, ${tGraph?.nodes.length ?? 0} TOC nodes`);
      if (tGraph) tocGraphStore.set(textbookId, tGraph);
      return { textbook, tocGraph: tGraph };
    }

    // ── Large file: read first 8 pages to find TOC ──
    const PREVIEW_PAGES = Math.min(8, totalPages);
    console.log(`[parse] ${filename} — reading first ${PREVIEW_PAGES} pages for TOC...`);
    const previewText = await readPages(doc, 1, PREVIEW_PAGES, filename);
    const { tocText, pageRange } = extractTOC(previewText, PREVIEW_PAGES);

    if (tocText) {
      console.log(`[parse] ${filename} — TOC found on pages ${pageRange?.start}-${pageRange?.end}`);
      const chapters = extractChapters(previewText, textbookId);
      const textbook: Textbook = {
        textbookId, filename, title, totalPages, totalChars: previewText.length,
        chapters, tocText, tocPageRange: pageRange,
        status: "toc_only",
        statusDetail: `目录已解析 · 共${totalPages}页`,
        uploadedAt: Date.now(),
      };
      textbookStore.set(textbookId, textbook);
      console.log(`[parse] ${filename} — calling LLM for TOC graph...`);
      const chapterPageMap = chapters.map((c) => ({
        title: c.title, pageStart: c.pageStart, pageEnd: c.pageEnd,
      }));
      const tGraph = await extractTOCGraph(tocText, textbookId, chapterPageMap);
      console.log(`[parse] ${filename} — done, ${tGraph?.nodes.length ?? 0} TOC nodes`);
      if (tGraph) tocGraphStore.set(textbookId, tGraph);
      return { textbook, tocGraph: tGraph };
    }

    // ── TOC not found: parse first N pages ──
    const partialPages = Math.min(FALLBACK_PAGES, totalPages);
    console.log(`[parse] ${filename} — TOC not found, reading first ${partialPages} pages`);
    const firstNText = await readPages(doc, 1, partialPages, filename);
    const chapters = extractChapters(firstNText, textbookId);
    const textbook: Textbook = {
      textbookId, filename, title, totalPages, totalChars: firstNText.length,
      chapters, tocText: "", tocPageRange: null,
      status: "partial",
      statusDetail: `已解析前 ${partialPages}/${totalPages} 页`,
      uploadedAt: Date.now(),
    };
    textbookStore.set(textbookId, textbook);
    console.log(`[parse] ${filename} — calling LLM for partial graph...`);
    const chapterPageMap = chapters.map((c) => ({
      title: c.title, pageStart: c.pageStart, pageEnd: c.pageEnd,
    }));
    const tGraph = await extractTOCGraph(firstNText, textbookId, chapterPageMap);
    console.log(`[parse] ${filename} — done, ${tGraph?.nodes.length ?? 0} nodes`);
    if (tGraph) tocGraphStore.set(textbookId, tGraph);
    return { textbook, tocGraph: tGraph };
  } catch (err) {
    console.error(`[parse] ${filename} — ERROR:`, err);
    const textbook = makeError(textbookId, filename, `PDF 解析失败: ${String(err)}`);
    textbookStore.set(textbookId, textbook);
    return { textbook };
  }
}

/** Read a range of pages (1-indexed) from a pdfjs document. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function readPages(doc: any, start: number, end: number, label: string): Promise<string> {
  const max = Math.min(end, doc.numPages);
  const pages: string[] = [];
  for (let i = start; i <= max; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((item: { str?: string }) => ("str" in item ? item.str : "")).join(" ");
    pages.push(text);
    if (i % 5 === 0) console.log(`[parse] ${label} — page ${i}/${end}`);
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
