import { describe, it, expect } from "vitest";
import { chunkText } from "./chunker";

const meta = { textbookId: "tb1", textbookName: "生理学", chapter: "第一章", page: 1 };

describe("chunkText", () => {
  it("returns empty array for empty text", () => {
    expect(chunkText("", meta)).toEqual([]);
    expect(chunkText("   ", meta)).toEqual([]);
  });

  it("returns single chunk for text smaller than chunkSize", () => {
    const result = chunkText("短文本", meta, 600, 80);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("短文本");
    expect(result[0].metadata.chunkIndex).toBe(0);
    expect(result[0].id).toMatch(/^tb1_chunk_0000$/);
  });

  it("splits text into multiple chunks with overlap", () => {
    // 1000 chars of repeating text
    const text = "生理学知识点。".repeat(125); // ~1000 chars
    const result = chunkText(text, meta, 200, 40);

    expect(result.length).toBeGreaterThan(1);
    // chunks should have IDs with incrementing indices
    for (let i = 0; i < result.length; i++) {
      expect(result[i].metadata.chunkIndex).toBe(i);
    }
  });

  it("each chunk carries metadata", () => {
    const text = "测试文本内容。".repeat(20);
    const result = chunkText(text, meta, 200, 40);

    for (const chunk of result) {
      expect(chunk.metadata.textbookId).toBe("tb1");
      expect(chunk.metadata.textbookName).toBe("生理学");
      expect(chunk.metadata.chapter).toBe("第一章");
      expect(chunk.metadata.page).toBe(1);
      expect(chunk.metadata.chunkIndex).toBeGreaterThanOrEqual(0);
    }
  });

  it("respects custom chunkSize", () => {
    const text = "测试。".repeat(200);
    const small = chunkText(text, meta, 100, 20);
    const large = chunkText(text, meta, 400, 80);
    expect(small.length).toBeGreaterThan(large.length);
  });

  it("chunk IDs are unique", () => {
    const text = "测试内容。".repeat(100);
    const result = chunkText(text, meta, 150, 30);
    const ids = result.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
