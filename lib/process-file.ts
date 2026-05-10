import { Textbook, TOCGraph, Chapter } from "@/types";
import { parseTxtContent } from "@/lib/text/txt-parser";
import { getTextbookTitle, estimatePages, extractChapters, extractTOC } from "@/lib/pdf/pdf-parser";
import { extractTOCGraph } from "@/lib/llm/toc-llm";
import { sha256 } from "@/lib/utils/hash";
import { getStore } from "@/lib/store";

const TINY_FILE_BYTES = 50_000;

export async function processFile(
  buffer: Buffer,
  filename: string,
  fileBytes: number,
): Promise<{ textbook: Textbook; tocGraph?: TOCGraph | null }> {
  const store = getStore();
  const ext = filename.split(".").pop()?.toLowerCase();
  const fileHash = sha256(buffer);

  // Dedup
  const existingId = await store.getTextbookIdByHash(fileHash);
  if (existingId) {
    const existing = await store.getTextbook(existingId);
    if (existing) {
      console.log(`[parse] ${filename} — DUPLICATE, reusing ${existingId}`);
      const existingGraph = await store.getTOCGraph(existingId);
      return { textbook: existing, tocGraph: existingGraph };
    }
  }

  const textbookId = crypto.randomUUID();
  const title = getTextbookTitle(filename);
  await store.setFileHash(fileHash, textbookId);

  if (ext === "pdf") {
    return handlePdf(store, buffer, fileBytes, textbookId, title);
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
  await store.setTextbook(textbookId, tb);

  const cpm = chapters.map((c) => ({ title: c.title, pageStart: c.pageStart, pageEnd: c.pageEnd }));
  const tg = await extractTOCGraph(fullText.slice(0, 30_000), textbookId, cpm);
  if (tg) await store.setTOCGraph(textbookId, tg);
  return { textbook: tb, tocGraph: tg };
}

async function handlePdf(
  store: ReturnType<typeof getStore>,
  buffer: Buffer,
  fileBytes: number,
  textbookId: string,
  title: string,
): Promise<{ textbook: Textbook; tocGraph?: TOCGraph | null }> {
  try {
    console.log(`[parse] ${title} (${(fileBytes / 1024).toFixed(0)}KB) — parsing PDF`);

    const pdfParseMod = await import("pdf-parse");
    const pdfParse = pdfParseMod.default ?? pdfParseMod;
    const data = await pdfParse(buffer);
    const fullText = data.text as string;
    const totalPages = data.numpages;
    console.log(`[parse] ${title} — ${totalPages}p, ${(fullText.length / 1000).toFixed(0)}k chars`);

    if (fileBytes < TINY_FILE_BYTES) {
      return buildResult(store, textbookId, title, fileBytes, totalPages, fullText, "full",
        `全文解析完成 (${(fileBytes / 1024).toFixed(0)}KB)`);
    }

    const { tocText, pageRange } = extractTOC(fullText, totalPages);

    if (tocText) {
      console.log(`[parse] ${title} — TOC found p${pageRange?.start}-${pageRange?.end}`);
      return buildResult(store, textbookId, title, fileBytes, totalPages, fullText, "toc_only",
        `目录已解析 · 共${totalPages}页`, tocText, pageRange);
    }

    const preview = fullText.slice(0, 15_000);
    return buildResult(store, textbookId, title, fileBytes, totalPages, fullText, "partial",
      `已解析前 15,000 字 / ${(fullText.length / 1000).toFixed(0)}k 字`);
  } catch (err) {
    console.error(`[parse] ${title} — ERROR:`, err);
    return { textbook: makeError(textbookId, title, `PDF 解析失败: ${String(err)}`) };
  }
}

/** Fallback graph built from chapter headings when LLM extraction fails */
function buildFallbackGraph(textbookId: string, chapters: Chapter[]): TOCGraph {
  const MAX_NODES = 40;
  const limitedChapters = chapters.slice(0, MAX_NODES);
  const nodes = limitedChapters.map((ch, i) => ({
    id: `${textbookId}_fb${String(i + 1).padStart(3, "0")}`,
    name: ch.title,
    definition: ch.content.slice(0, 200).replace(/\n/g, " "),
    category: "核心概念" as const,
    chapter: ch.title,
    page: ch.pageStart,
    textbookId,
    isTocNode: true,
    pageRange: { start: ch.pageStart, end: ch.pageEnd },
  }));
  const relations = [];
  for (let i = 1; i < nodes.length; i++) {
    relations.push({
      source: nodes[i - 1].id,
      target: nodes[i].id,
      relationType: "prerequisite" as const,
      description: `${nodes[i - 1].name} → ${nodes[i].name}`,
    });
  }
  return {
    nodes,
    relations,
    tocStructure: limitedChapters.map((ch, i) => ({
      id: `${textbookId}_fb${String(i + 1).padStart(3, "0")}`,
      name: ch.title,
      pageStart: ch.pageStart,
      pageEnd: ch.pageEnd,
      parentId: null,
      level: 1 as const,
    })),
  };
}

async function buildResult(
  store: ReturnType<typeof getStore>,
  textbookId: string, title: string, fileBytes: number, totalPages: number,
  fullText: string, status: Textbook["status"], statusDetail: string,
  tocText?: string, pageRange?: { start: number; end: number } | null,
): Promise<{ textbook: Textbook; tocGraph?: TOCGraph | null }> {
  const chapters = extractChapters(fullText, textbookId);
  const tb: Textbook = {
    textbookId, filename: title, title, totalPages, totalChars: fullText.length,
    chapters, tocText: tocText ?? "", tocPageRange: pageRange ?? null,
    status, statusDetail, uploadedAt: Date.now(),
  };
  await store.setTextbook(textbookId, tb);

  const llmInput = (tocText ?? fullText).slice(0, 15_000);
  console.log(`[parse] ${title} — LLM (${llmInput.length} chars)`);
  const cpm = chapters.map((c) => ({ title: c.title, pageStart: c.pageStart, pageEnd: c.pageEnd }));
  const t0 = performance.now();
  const tg = await extractTOCGraph(llmInput, textbookId, cpm);
  const elapsed = ((performance.now() - t0) / 1000).toFixed(1);
  console.log(`[parse] ${title} — LLM ${elapsed}s, ${tg?.nodes.length ?? 0} nodes`);

  if (tg) {
    await store.setTOCGraph(textbookId, tg);
    return { textbook: tb, tocGraph: tg };
  }

  // LLM failed — build fallback from chapter headings
  if (chapters.length > 0) {
    console.log(`[parse] ${title} — LLM returned null, using chapter fallback (${chapters.length} chapters)`);
    const fallback = buildFallbackGraph(textbookId, chapters);
    await store.setTOCGraph(textbookId, fallback);
    return { textbook: tb, tocGraph: fallback };
  }

  console.log(`[parse] ${title} — no chapters, no TOC, returning empty graph`);
  return { textbook: tb, tocGraph: null };
}

export function makeError(id: string, filename: string, msg: string): Textbook {
  return {
    textbookId: id, filename, title: filename, totalPages: 0, totalChars: 0,
    chapters: [], tocText: "", tocPageRange: null,
    status: "error", statusDetail: msg, errorMessage: msg, uploadedAt: Date.now(),
  };
}
