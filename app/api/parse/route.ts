import { NextRequest, NextResponse } from "next/server";
import { Textbook, TOCGraph } from "@/types";
import { parseTxtContent } from "@/lib/txt-parser";
import { getTextbookTitle, estimatePages, extractChapters, extractTOC } from "@/lib/pdf-parser";
import { extractTOCGraph } from "@/lib/toc-llm";

export const textbookStore = new Map<string, Textbook>();
export const tocGraphStore = new Map<string, TOCGraph>();
export const pdfBufferStore = new Map<string, Buffer>();

const TINY_FILE_BYTES = 50_000;
const TOC_PREVIEW_PAGES = 20;
const FALLBACK_PAGES = 20;

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
      const title = getTextbookTitle(filename);
      const fileBytes = file.size;

      if (ext === "pdf") {
        const result = await handlePdf(buffer, fileBytes, textbookId, title);
        results.push(result.textbook);
        if (result.tocGraph !== undefined) tocGraphs[textbookId] = result.tocGraph;
        continue;
      }

      // TXT / MD
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

      const cpm = chapters.map((c) => ({ title: c.title, pageStart: c.pageStart, pageEnd: c.pageEnd }));
      const tg = await extractTOCGraph(fullText.slice(0, 30_000), textbookId, cpm);
      if (tg) tocGraphStore.set(textbookId, tg);
      tocGraphs[textbookId] = tg;
    }

    return NextResponse.json({ textbooks: results, tocGraphs });
  } catch (err) {
    return NextResponse.json({ error: `解析失败: ${String(err)}` }, { status: 500 });
  }
}

async function handlePdf(
  buffer: Buffer,
  fileBytes: number,
  textbookId: string,
  title: string,
): Promise<{ textbook: Textbook; tocGraph?: TOCGraph | null }> {
  try {
    console.log(`[parse] ${title} (${(fileBytes / 1024).toFixed(0)}KB) — loading PDF`);
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
    const totalPages = doc.numPages;
    console.log(`[parse] ${title} — ${totalPages} pages`);

    // Store buffer for drill-down
    pdfBufferStore.set(textbookId, buffer);

    // Tiny file or short doc: parse all pages
    if (fileBytes < TINY_FILE_BYTES || totalPages <= 10) {
      console.log(`[parse] ${title} — full parse (${totalPages} pages)`);
      const fullText = await readPages(doc, 1, totalPages, title);
      return buildResult(textbookId, title, fileBytes, totalPages, fullText, "full",
        `全文解析完成 (${(fileBytes / 1024).toFixed(0)}KB)`);
    }

    // Large file: read first N pages for TOC
    const previewN = Math.min(TOC_PREVIEW_PAGES, totalPages);
    console.log(`[parse] ${title} — reading first ${previewN} pages for TOC`);
    const previewText = await readPages(doc, 1, previewN, title);
    const { tocText, pageRange } = extractTOC(previewText, totalPages);

    if (tocText) {
      console.log(`[parse] ${title} — TOC found p${pageRange?.start}-${pageRange?.end}`);
      return buildResult(textbookId, title, fileBytes, totalPages, previewText, "toc_only",
        `目录已解析 · 共${totalPages}页`, tocText, pageRange);
    }

    // TOC not found: fallback
    const fallbackN = Math.min(FALLBACK_PAGES, totalPages);
    console.log(`[parse] ${title} — TOC not found, reading first ${fallbackN} pages`);
    const firstNText = await readPages(doc, 1, fallbackN, title);
    return buildResult(textbookId, title, fileBytes, totalPages, firstNText, "partial",
      `已解析前 ${fallbackN}/${totalPages} 页`);
  } catch (err) {
    console.error(`[parse] ${title} — ERROR:`, err);
    return { textbook: makeError(textbookId, title, `PDF 解析失败: ${String(err)}`) };
  }
}

async function buildResult(
  textbookId: string, title: string, fileBytes: number, totalPages: number,
  text: string, status: Textbook["status"], statusDetail: string,
  tocText?: string, pageRange?: { start: number; end: number } | null,
): Promise<{ textbook: Textbook; tocGraph?: TOCGraph | null }> {
  const chapters = extractChapters(text, textbookId);
  const tb: Textbook = {
    textbookId, filename: title, title, totalPages, totalChars: text.length,
    chapters, tocText: tocText ?? "", tocPageRange: pageRange ?? null,
    status, statusDetail, uploadedAt: Date.now(),
  };
  textbookStore.set(textbookId, tb);

  const cpm = chapters.map((c) => ({ title: c.title, pageStart: c.pageStart, pageEnd: c.pageEnd }));
  const llmInput = (tocText ?? text).slice(0, 30_000);
  console.log(`[parse] ${title} — LLM call (${llmInput.length} chars)`);
  const tg = await extractTOCGraph(llmInput, textbookId, cpm);
  console.log(`[parse] ${title} — done, ${tg?.nodes.length ?? 0} nodes`);
  if (tg) tocGraphStore.set(textbookId, tg);
  return { textbook: tb, tocGraph: tg };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function readPages(doc: any, start: number, end: number, label: string): Promise<string> {
  const max = Math.min(end, doc.numPages);
  const pages: string[] = [];
  for (let i = start; i <= max; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map((item: { str?: string }) => ("str" in item ? item.str : "")).join(" "));
    if (i % 5 === 0) console.log(`[parse] ${label} — page ${i}/${max}`);
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
