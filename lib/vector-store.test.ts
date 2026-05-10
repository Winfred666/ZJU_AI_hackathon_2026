import { describe, it, expect, beforeEach } from "vitest";
import { MemoryVectorStore } from "./vector-store";
import type { VectorChunk } from "@/types";

function makeChunk(id: string, vector: number[], text: string, textbookId = "tb1"): VectorChunk {
  return {
    id,
    vector,
    text,
    metadata: {
      textbookId,
      textbookName: "生理学",
      chapter: "第一章",
      page: 10,
      chunkIndex: 0,
    },
  };
}

describe("MemoryVectorStore", () => {
  let store: MemoryVectorStore;

  beforeEach(() => {
    store = new MemoryVectorStore();
  });

  it("starts empty", () => {
    expect(store.size).toBe(0);
  });

  it("upsert adds new chunks", () => {
    store.upsert([makeChunk("c1", [1, 0, 0], "text1")]);
    expect(store.size).toBe(1);
  });

  it("upsert replaces chunks with same IDs", () => {
    store.upsert([makeChunk("c1", [1, 0, 0], "text1")]);
    store.upsert([makeChunk("c1", [0, 1, 0], "updated")]);
    expect(store.size).toBe(1);
  });

  it("query returns top-K by cosine similarity", () => {
    store.upsert([
      makeChunk("c1", [1, 0, 0], "apple"),
      makeChunk("c2", [0, 1, 0], "banana"),
      makeChunk("c3", [0.9, 0.1, 0], "apple-like"),
    ]);

    const results = store.query([1, 0, 0], 2);
    expect(results).toHaveLength(2);
    expect(results[0].id).toBe("c1"); // perfect match
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  it("query filters by textbookId when provided", () => {
    store.upsert([
      makeChunk("c1", [1, 0, 0], "tb1 text", "tb1"),
      makeChunk("c2", [1, 0, 0], "tb2 text", "tb2"),
    ]);

    const results = store.query([1, 0, 0], 5, "tb1");
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("c1");
  });

  it("deleteByTextbookId removes matching chunks", () => {
    store.upsert([
      makeChunk("c1", [1, 0], "tb1", "tb1"),
      makeChunk("c2", [0, 1], "tb2", "tb2"),
    ]);
    const removed = store.deleteByTextbookId("tb1");
    expect(removed).toBe(1);
    expect(store.size).toBe(1);
  });

  it("clear empties the store", () => {
    store.upsert([makeChunk("c1", [1, 0], "text")]);
    store.clear();
    expect(store.size).toBe(0);
  });

  it("cosine similarity returns 0 for zero vectors", () => {
    store.upsert([makeChunk("c1", [0, 0, 0], "zero")]);
    const results = store.query([1, 1, 1], 5);
    expect(results[0].score).toBe(0);
  });
});
