import { z } from "zod";

export const knowledgeExtractSchema = z.object({
  textbookId: z.string().min(1),
});

export const ragQuerySchema = z.object({
  textbookId: z.string().min(1),
  question: z.string().min(1).max(1000),
});

export const knowledgeNodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  definition: z.string(),
  category: z.enum(["核心概念", "定理", "方法", "现象"]),
  chapter: z.string(),
  page: z.number().int().positive(),
});

export const knowledgeRelationSchema = z.object({
  source: z.string(),
  target: z.string(),
  relationType: z.enum(["prerequisite", "contains"]),
  description: z.string(),
});

export const knowledgeExtractOutputSchema = z.object({
  nodes: z.array(knowledgeNodeSchema),
  relations: z.array(knowledgeRelationSchema),
});

export type KnowledgeExtractOutput = z.infer<typeof knowledgeExtractOutputSchema>;
