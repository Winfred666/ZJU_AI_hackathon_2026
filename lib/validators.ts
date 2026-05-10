import { z } from "zod";

// ---- TOC Graph (LLM output) ----

export const tocNodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  definition: z.string(),
  category: z.enum(["核心概念", "定理", "方法", "现象"]),
  chapter: z.string(),
  page: z.number().int().positive(),
  isTocNode: z.boolean(),
  pageRange: z.object({ start: z.number(), end: z.number() }).optional(),
});

export const tocRelationSchema = z.object({
  source: z.string(),
  target: z.string(),
  relationType: z.enum(["prerequisite", "contains", "parallel"]),
  description: z.string(),
});

export const tocStructureItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  pageStart: z.number(),
  pageEnd: z.number(),
  parentId: z.string().nullable(),
  level: z.union([z.literal(1), z.literal(2)]),
});

export const tocGraphOutputSchema = z.object({
  nodes: z.array(tocNodeSchema),
  relations: z.array(tocRelationSchema),
  tocStructure: z.array(tocStructureItemSchema),
});

// ---- Drill-down ----

export const drillRequestSchema = z.object({
  textbookId: z.string().min(1),
  chapterId: z.string().min(1),
  pageStart: z.number().int().positive(),
  pageEnd: z.number().int().positive(),
  chapterTitle: z.string().min(1),
});

// Drill LLM output: detail nodes with "contains" relations
export const drillNodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  definition: z.string(),
  category: z.enum(["核心概念", "定理", "方法", "现象"]),
  chapter: z.string(),
  page: z.number().int().positive(),
});

export const drillOutputSchema = z.object({
  nodes: z.array(drillNodeSchema),
  relations: z.array(z.object({
    source: z.string(),
    target: z.string(),
    relationType: z.literal("contains"),
    description: z.string(),
  })),
});

// ---- RAG (unchanged) ----

export const ragQuerySchema = z.object({
  textbookId: z.string().min(1),
  question: z.string().min(1).max(1000),
});
