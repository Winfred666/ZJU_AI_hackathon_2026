import { describe, it, expect } from "vitest";
import { llmGenerate } from "./llm";
import { extractTOCGraph } from "./toc-llm";
import { readFileSync } from "fs";
import { resolve } from "path";

const applePearTxt = readFileSync(
  resolve(__dirname, "..", "e2e", "fixtures", "apple-pear.txt"),
  "utf-8",
);

describe("extractTOCGraph", () => {
  it("traces LLM raw response", async () => {
    // First, just test the raw LLM call with a simpler prompt
    const raw = await llmGenerate({
      system: "You are a helpful assistant. Output only valid JSON, nothing else.",
      prompt: `Textbook content:\n${applePearTxt.slice(0, 1500)}\n\nReturn: {"chapters": [{"title": "chapter name", "summary": "1-sentence summary"}]}`,
      temperature: 0.2,
    });
    console.log("=== RAW LLM RESPONSE ===");
    console.log(raw.slice(0, 2000));
    console.log("=== END RAW ===");

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    console.log("JSON match found:", !!jsonMatch);
    if (jsonMatch) {
      console.log("JSON preview:", jsonMatch[0].slice(0, 500));
    }
    expect(raw.length).toBeGreaterThan(0);
  });

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

    // Must not be null — LLM should always return valid JSON
    expect(result).not.toBeNull();
    expect(result!.nodes.length).toBeGreaterThan(0);
    expect(result!.relations.length).toBeGreaterThan(0);
    expect(result!.tocStructure.length).toBeGreaterThan(0);
  }, 60000);
});
