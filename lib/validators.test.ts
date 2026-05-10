import { describe, it, expect } from "vitest";
import {
  ragQuerySchema,
  tocNodeSchema,
  tocRelationSchema,
  tocGraphOutputSchema,
  drillRequestSchema,
  drillOutputSchema,
} from "./validators";

describe("tocNodeSchema", () => {
  it("accepts valid TOC node", () => {
    expect(
      tocNodeSchema.parse({
        id: "toc_01",
        name: "第一章 绪论",
        definition: "本章概述学科基本概念",
        category: "核心概念",
        chapter: "第一章 绪论",
        page: 1,
        isTocNode: true,
        pageRange: { start: 1, end: 20 },
      }),
    ).toBeTruthy();
  });

  it("rejects invalid category", () => {
    expect(() =>
      tocNodeSchema.parse({
        id: "toc_01",
        name: "x",
        definition: "x",
        category: "invalid",
        chapter: "x",
        page: 1,
        isTocNode: true,
      }),
    ).toThrow();
  });

  it("rejects negative page", () => {
    expect(() =>
      tocNodeSchema.parse({
        id: "toc_01",
        name: "x",
        definition: "x",
        category: "定理",
        chapter: "x",
        page: -1,
        isTocNode: true,
      }),
    ).toThrow();
  });
});

describe("tocRelationSchema", () => {
  it("accepts prerequisite relation", () => {
    expect(
      tocRelationSchema.parse({
        source: "toc_01",
        target: "toc_02",
        relationType: "prerequisite",
        description: "理解B需要A",
      }),
    ).toBeTruthy();
  });

  it("accepts parallel relation", () => {
    expect(
      tocRelationSchema.parse({
        source: "toc_01",
        target: "toc_02",
        relationType: "parallel",
        description: "AB为并列关系",
      }),
    ).toBeTruthy();
  });

  it("rejects invalid relationType", () => {
    expect(() =>
      tocRelationSchema.parse({
        source: "n1",
        target: "n2",
        relationType: "references",
        description: "x",
      }),
    ).toThrow();
  });
});

describe("tocGraphOutputSchema", () => {
  it("validates a complete TOC graph output", () => {
    const output = {
      nodes: [
        {
          id: "toc_01",
          name: "第一章 绪论",
          definition: "本章概述学科基本概念",
          category: "核心概念",
          chapter: "第一章 绪论",
          page: 1,
          isTocNode: true,
          pageRange: { start: 1, end: 20 },
        },
      ],
      relations: [
        {
          source: "toc_01",
          target: "toc_02",
          relationType: "prerequisite",
          description: "需先掌握绪论",
        },
      ],
      tocStructure: [
        { id: "toc_01", name: "第一章 绪论", pageStart: 1, pageEnd: 20, parentId: null, level: 1 },
      ],
    };

    const validated = tocGraphOutputSchema.parse(output);
    expect(validated.nodes).toHaveLength(1);
    expect(validated.relations).toHaveLength(1);
    expect(validated.tocStructure).toHaveLength(1);
  });

  it("rejects missing nodes", () => {
    expect(() =>
      tocGraphOutputSchema.parse({ relations: [], tocStructure: [] }),
    ).toThrow();
  });
});

describe("drillRequestSchema", () => {
  it("accepts valid drill request", () => {
    expect(
      drillRequestSchema.parse({
        textbookId: "tb1",
        chapterId: "toc_01",
        pageStart: 1,
        pageEnd: 20,
        chapterTitle: "第一章 绪论",
      }),
    ).toEqual({
      textbookId: "tb1",
      chapterId: "toc_01",
      pageStart: 1,
      pageEnd: 20,
      chapterTitle: "第一章 绪论",
    });
  });

  it("rejects empty textbookId", () => {
    expect(() =>
      drillRequestSchema.parse({
        textbookId: "",
        chapterId: "toc_01",
        pageStart: 1,
        pageEnd: 20,
        chapterTitle: "x",
      }),
    ).toThrow();
  });
});

describe("drillOutputSchema", () => {
  it("validates a complete drill result", () => {
    const output = {
      nodes: [
        {
          id: "d_01",
          name: "静息电位",
          definition: "细胞安静时膜内外电位差",
          category: "核心概念",
          chapter: "第一章 绪论",
          page: 12,
        },
      ],
      relations: [
        {
          source: "d_01",
          target: "d_02",
          relationType: "contains",
          description: "A包含B",
        },
      ],
    };

    const validated = drillOutputSchema.parse(output);
    expect(validated.nodes).toHaveLength(1);
    expect(validated.relations).toHaveLength(1);
  });

  it("rejects invalid relationType (must be contains)", () => {
    expect(() =>
      drillOutputSchema.parse({
        nodes: [
          { id: "d_01", name: "x", definition: "x", category: "核心概念", chapter: "x", page: 1 },
        ],
        relations: [
          { source: "d_01", target: "d_02", relationType: "prerequisite", description: "x" },
        ],
      }),
    ).toThrow();
  });
});

describe("ragQuerySchema", () => {
  it("accepts valid input", () => {
    expect(
      ragQuerySchema.parse({ textbookId: "tb1", question: "什么是静息电位？" }),
    ).toEqual({ textbookId: "tb1", question: "什么是静息电位？" });
  });

  it("rejects empty question", () => {
    expect(() =>
      ragQuerySchema.parse({ textbookId: "tb1", question: "" }),
    ).toThrow();
  });

  it("rejects question over 1000 chars", () => {
    expect(() =>
      ragQuerySchema.parse({ textbookId: "tb1", question: "x".repeat(1001) }),
    ).toThrow();
  });
});
