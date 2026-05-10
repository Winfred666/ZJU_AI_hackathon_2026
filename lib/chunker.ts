import { ChunkMetadata } from "@/types";

export interface ChunkResult {
  id: string;
  text: string;
  metadata: ChunkMetadata;
}

export function chunkText(
  text: string,
  metadata: Omit<ChunkMetadata, "chunkIndex">,
  chunkSize = 600,
  overlap = 80,
): ChunkResult[] {
  if (!text || text.trim().length === 0) return [];

  const chunks: ChunkResult[] = [];
  let index = 0;
  let start = 0;

  while (start < text.length) {
    let end = start + chunkSize;

    if (end < text.length) {
      const searchStart = Math.max(start, end - 100);
      const breakChars = text.slice(searchStart, Math.min(end + 100, text.length));
      const bestBreak = Math.max(
        breakChars.lastIndexOf("。"),
        breakChars.lastIndexOf("！"),
        breakChars.lastIndexOf("？"),
        breakChars.lastIndexOf("\n"),
      );
      if (bestBreak > 0) {
        end = searchStart + bestBreak + 1;
      }
      end = Math.min(end, text.length);
    }

    const chunkText_ = text.slice(start, end).trim();
    if (chunkText_.length > 0) {
      chunks.push({
        id: `${metadata.textbookId}_chunk_${String(index).padStart(4, "0")}`,
        text: chunkText_,
        metadata: { ...metadata, chunkIndex: index },
      });
      index++;
    }

    start = end - overlap;
    if (start >= text.length) break;
  }

  return chunks;
}
