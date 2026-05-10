import { VectorChunk, VectorSearchResult } from "@/types";

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export class MemoryVectorStore {
  private chunks: VectorChunk[] = [];

  upsert(chunks: VectorChunk[]): void {
    const newIds = new Set(chunks.map((c) => c.id));
    this.chunks = this.chunks.filter((c) => !newIds.has(c.id));
    this.chunks.push(...chunks);
  }

  query(vector: number[], topK: number, textbookId?: string): VectorSearchResult[] {
    let candidates = this.chunks;
    if (textbookId) {
      candidates = this.chunks.filter((c) => c.metadata.textbookId === textbookId);
    }

    const scored = candidates.map((chunk) => ({
      id: chunk.id,
      text: chunk.text,
      metadata: chunk.metadata,
      score: cosineSimilarity(vector, chunk.vector),
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  deleteByTextbookId(textbookId: string): number {
    const before = this.chunks.length;
    this.chunks = this.chunks.filter((c) => c.metadata.textbookId !== textbookId);
    return before - this.chunks.length;
  }

  clear(): void {
    this.chunks = [];
  }

  get size(): number {
    return this.chunks.length;
  }
}

const globalVectorStore = new MemoryVectorStore();

export function getVectorStore(): MemoryVectorStore {
  return globalVectorStore;
}
