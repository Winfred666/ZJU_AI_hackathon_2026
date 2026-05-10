import { describe, it, expect } from "vitest";
import {
  knowledgeExtractSchema,
  ragQuerySchema,
  knowledgeNodeSchema,
  knowledgeRelationSchema,
  knowledgeExtractOutputSchema,
} from "./validators";

describe("knowledgeExtractSchema", () => {
  it("accepts valid textbookId", () => {
    expect(knowledgeExtractSchema.parse({ textbookId: "abc-123" })).toEqual({
      textbookId: "abc-123",
    });
  });

  it("rejects empty textbookId", () => {
    expect(() => knowledgeExtractSchema.parse({ textbookId: "" })).toThrow();
  });

  it("rejects missing textbookId", () => {
    expect(() => knowledgeExtractSchema.parse({})).toThrow();
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

describe("knowledgeNodeSchema", () => {
  it("accepts valid node", () => {
    expect(
      knowledgeNodeSchema.parse({
        id: "n1",
        name: "动作电位",
        definition: "快速可逆的膜电位翻转",
        category: "核心概念",
        chapter: "第一章",
        page: 15,
      }),
    ).toBeTruthy();
  });

  it("rejects invalid category", () => {
    expect(() =>
      knowledgeNodeSchema.parse({
        id: "n1",
        name: "x",
        definition: "x",
        category: "invalid",
        chapter: "x",
        page: 1,
      }),
    ).toThrow();
  });

  it("rejects negative page", () => {
    expect(() =>
      knowledgeNodeSchema.parse({
        id: "n1",
        name: "x",
        definition: "x",
        category: "定理",
        chapter: "x",
        page: -1,
      }),
    ).toThrow();
  });
});

describe("knowledgeRelationSchema", () => {
  it("accepts prerequisite relation", () => {
    expect(
      knowledgeRelationSchema.parse({
        source: "n1",
        target: "n2",
        relationType: "prerequisite",
        description: "理解B需要A",
      }),
    ).toBeTruthy();
  });

  it("accepts contains relation", () => {
    expect(
      knowledgeRelationSchema.parse({
        source: "n1",
        target: "n2",
        relationType: "contains",
        description: "A包含B",
      }),
    ).toBeTruthy();
  });

  it("rejects invalid relationType", () => {
    expect(() =>
      knowledgeRelationSchema.parse({
        source: "n1",
        target: "n2",
        relationType: "references",
        description: "x",
      }),
    ).toThrow();
  });
});

describe("knowledgeExtractOutputSchema", () => {
  it("validates a complete LLM extraction result", () => {
    const output = {
      nodes: [
        {
          id: "node_001",
          name: "静息电位",
          definition: "细胞安静时膜内外电位差",
          category: "核心概念",
          chapter: "第一章 绪论",
          page: 12,
        },
        {
          id: "node_002",
          name: "钠钾泵",
          definition: "主动转运Na+和K+的膜蛋白",
          category: "方法",
          chapter: "第二章 细胞膜",
          page: 30,
        },
      ],
      relations: [
        {
          source: "node_001",
          target: "node_002",
          relationType: "prerequisite",
          description: "理解钠钾泵需要先理解静息电位",
        },
      ],
    };

    const validated = knowledgeExtractOutputSchema.parse(output);
    expect(validated.nodes).toHaveLength(2);
    expect(validated.relations).toHaveLength(1);
    expect(validated.nodes[0].category).toBe("核心概念");
  });

  it("rejects missing nodes", () => {
    expect(() =>
      knowledgeExtractOutputSchema.parse({ relations: [] }),
    ).toThrow();
  });

  it("rejects invalid node in array", () => {
    expect(() =>
      knowledgeExtractOutputSchema.parse({
        nodes: [{ id: "x", name: "x", definition: "x", category: "bad", chapter: "x", page: 0 }],
        relations: [],
      }),
    ).toThrow();
  });
});
