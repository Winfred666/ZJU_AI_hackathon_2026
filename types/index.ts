// ---- Textbook & Parsing ----

export interface Chapter {
  chapterId: string;
  title: string;
  pageStart: number;
  pageEnd: number;
  content: string;
  charCount: number;
}

export interface ParseResult {
  textbookId: string;
  filename: string;
  title: string;
  totalPages: number;
  totalChars: number;
  chapters: Chapter[];
  /** Raw TOC text extracted from PDF front matter */
  tocText: string;
  /** Pages where TOC was found (inclusive) */
  tocPageRange: { start: number; end: number } | null;
}

export interface Textbook extends ParseResult {
  status: "parsing" | "ready" | "error";
  errorMessage?: string;
  uploadedAt: number;
}

// ---- Knowledge Graph ----

export interface KnowledgeNode {
  id: string;
  name: string;
  definition: string;
  category: "核心概念" | "定理" | "方法" | "现象";
  chapter: string;
  page: number;
  textbookId: string;
  /** If true, this is a TOC-level chapter node (can be drilled into) */
  isTocNode?: boolean;
  /** Chapter page range for drill-down (only on TOC nodes) */
  pageRange?: { start: number; end: number };
}

export type RelationType = "prerequisite" | "contains" | "parallel";

export interface KnowledgeRelation {
  source: string;
  target: string;
  relationType: RelationType;
  description: string;
}

export interface KnowledgeGraph {
  nodes: KnowledgeNode[];
  relations: KnowledgeRelation[];
}

// ---- TOC Graph (returned by parse API) ----

export interface TOCNode {
  id: string;
  name: string;
  pageStart: number;
  pageEnd: number;
  parentId: string | null;
  level: 1 | 2;
}

export interface TOCGraph {
  nodes: KnowledgeNode[];
  relations: KnowledgeRelation[];
  tocStructure: TOCNode[];
}

// ---- Drill-down ----

export interface DrillRequest {
  textbookId: string;
  chapterId: string;
  pageStart: number;
  pageEnd: number;
  chapterTitle: string;
}

// ---- RAG ----

export interface Citation {
  textbook: string;
  chapter: string;
  page: number;
  relevanceScore: number;
}

export interface RAGQueryResponse {
  answer: string;
  citations: Citation[];
  sourceChunks: string[];
}

export interface RAGQueryRequest {
  textbookId: string;
  question: string;
}

// ---- Vector Store ----

export interface ChunkMetadata {
  textbookId: string;
  textbookName: string;
  chapter: string;
  page: number;
  chunkIndex: number;
}

export interface VectorChunk {
  id: string;
  vector: number[];
  text: string;
  metadata: ChunkMetadata;
}

export interface VectorSearchResult {
  id: string;
  text: string;
  metadata: ChunkMetadata;
  score: number;
}
