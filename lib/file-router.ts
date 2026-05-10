import { Chapter } from "@/types";
import { parseTxtContent } from "./txt-parser";
import { parseMarkdown } from "./md-parser";
import { parseWord } from "./word-parser";
import { parseExcel } from "./excel-parser";

export const SUPPORTED_EXTENSIONS = ["pdf", "txt", "md", "docx", "xlsx", "xls"] as const;

type SupportedExt = (typeof SUPPORTED_EXTENSIONS)[number];

type ParseOutput = { chapters: Chapter[]; fullText: string };

type AsyncParser = (buffer: Buffer, textbookId: string) => Promise<ParseOutput>;
type SyncParser = (buffer: Buffer, textbookId: string) => ParseOutput;

const ASYNC_PARSER_MAP: Record<string, AsyncParser> = {
  docx: parseWord,
};

const SYNC_PARSER_MAP: Record<string, SyncParser> = {
  txt: (buf, id) => parseTxtContent(new TextDecoder("utf-8").decode(buf), id),
  md: (buf, id) => parseMarkdown(buf, id),
  xlsx: (buf, id) => parseExcel(buf, id),
  xls: (buf, id) => parseExcel(buf, id),
};

export function isSupported(ext: string): boolean {
  return SUPPORTED_EXTENSIONS.includes(ext.toLowerCase() as SupportedExt);
}

export function getExt(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

export async function routeFile(
  buffer: Buffer,
  filename: string,
  textbookId: string,
): Promise<ParseOutput> {
  const ext = getExt(filename);

  if (!ext || !isSupported(ext)) {
    throw new Error(`Unsupported file format: .${ext || "unknown"}`);
  }

  if (ext === "pdf") {
    throw new Error(
      "PDF should be handled before calling routeFile — use pdf-parse directly for page metadata",
    );
  }

  const asyncParser = ASYNC_PARSER_MAP[ext];
  if (asyncParser) {
    return asyncParser(buffer, textbookId);
  }

  const syncParser = SYNC_PARSER_MAP[ext];
  if (syncParser) {
    return syncParser(buffer, textbookId);
  }

  throw new Error(`No parser registered for .${ext}`);
}
