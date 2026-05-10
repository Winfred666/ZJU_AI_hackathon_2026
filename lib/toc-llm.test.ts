import { describe, it, expect } from "vitest";
import { extractTOCGraph } from "./toc-llm";
import { readFileSync } from "fs";
import { resolve } from "path";

const applePearTxt = readFileSync(
  resolve(__dirname, "..", "e2e", "fixtures", "apple-pear.txt"),
  "utf-8",
);

describe("extractTOCGraph", () => {
  it("returns a valid TOC graph from apple-pear textbook text", async () => {
    const chapterPageMap = [
      { title: "第一章 苹果的基础知识", pageStart: 1, pageEnd: 1 },
      { title: "第二章 梨的特性与分类", pageStart: 2, pageEnd: 2 },
      { title: "第三章 苹果与梨的比较分析", pageStart: 3, pageEnd: 3 },
    ];

    const result = await extractTOCGraph(
      applePearTxt.slice(0, 30_000),
      "test_tb",
      chapterPageMap,
    );

    expect(result).not.toBeNull();
    expect(result!.nodes.length).toBeGreaterThan(0);
    expect(result!.relations.length).toBeGreaterThan(0);
    expect(result!.tocStructure.length).toBeGreaterThan(0);

    for (const node of result!.nodes) {
      expect(node.id).toBeTruthy();
      expect(node.name).toBeTruthy();
      expect(node.isTocNode).toBe(true);
      expect(node.pageRange).toBeTruthy();
    }

    const nodeIds = new Set(result!.nodes.map((n) => n.id));
    for (const rel of result!.relations) {
      expect(nodeIds.has(rel.source)).toBe(true);
      expect(nodeIds.has(rel.target)).toBe(true);
    }
  }, 60000);
});
