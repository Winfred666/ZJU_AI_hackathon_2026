import { NextRequest, NextResponse } from "next/server";
import { Textbook, TOCGraph } from "@/types";
import { parseTxtContent } from "@/lib/txt-parser";
import { getTextbookTitle, estimatePages, extractChapters, extractTOC } from "@/lib/pdf-parser";
import { extractTOCGraph } from "@/lib/toc-llm";
import { sha256 } from "@/lib/hash";
import { getStore } from "@/lib/store";

const TINY_FILE_BYTES = 50_000;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: "请上传至少一个文件" }, { status: 400 });
    }

    const results: Textbook[] = [];
    const tocGraphs: Record<string, TOCGraph | null> = {};
    const store = getStore();

    for (const file of files) {
      const filename = file.name;
      const ext = filename.split(".").pop()?.toLowerCase();

      if (!ext || !["pdf", "txt", "md"].includes(ext)) {
        const id = crypto.randomUUID();
        results.push(makeError(id, filename, `不支持的文件格式: .${ext}`));
        continue;
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const fileHash = sha256(buffer);

      // Dedup: check if this exact file was already uploaded
      const existingId = await store.getTextbookIdByHash(fileHash);
      if (existingId) {
        const existing = await store.getTextbook(existingId);
        if (existing) {
          console.log(`[parse] ${filename} — DUPLICATE, reusing ${existingId}`);
          results.push(existing);
          const existingGraph = await store.getTOCGraph(existingId);
          tocGraphs[existingId] = existingGraph;
          continue;
        }
      }

      const textbookId = crypto.randomUUID();
      const title = getTextbookTitle(filename);
      const fileBytes = file.size;

      if (ext === "pdf") {
        const result = await handlePdf(store, buffer, fileBytes, textbookId, title);
        results.push(result.textbook);
        if (result.tocGraph !== undefined) tocGraphs[textbookId] = result.tocGraph;
      } else {
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
        await store.setTextbook(textbookId, tb);

        const cpm = chapters.map((c) => ({ title: c.title, pageStart: c.pageStart, pageEnd: c.pageEnd }));
        const tg = await extractTOCGraph(fullText.slice(0, 30_000), textbookId, cpm);
        if (tg) await store.setTOCGraph(textbookId, tg);
        tocGraphs[textbookId] = tg;
      }

      await store.setFileHash(fileHash, textbookId);
    }

    return NextResponse.json({ textbooks: results, tocGraphs });
  } catch (err) {
    return NextResponse.json({ error: `解析失败: ${String(err)}` }, { status: 500 });
  }
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

    await store.setPdfBuffer(textbookId, buffer);

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

  const llmInput = (tocText ?? fullText).slice(0, 30_000);
  console.log(`[parse] ${title} — LLM (${llmInput.length} chars)`);
  const cpm = chapters.map((c) => ({ title: c.title, pageStart: c.pageStart, pageEnd: c.pageEnd }));
  const t0 = performance.now();
  const tg = await extractTOCGraph(llmInput, textbookId, cpm);
  console.log(`[parse] ${title} — LLM ${((performance.now() - t0) / 1000).toFixed(1)}s, ${tg?.nodes.length ?? 0} nodes`);
  if (tg) await store.setTOCGraph(textbookId, tg);
  return { textbook: tb, tocGraph: tg };
}

function makeError(id: string, filename: string, msg: string): Textbook {
  return {
    textbookId: id, filename, title: filename, totalPages: 0, totalChars: 0,
    chapters: [], tocText: "", tocPageRange: null,
    status: "error", statusDetail: msg, errorMessage: msg, uploadedAt: Date.now(),
  };
}
