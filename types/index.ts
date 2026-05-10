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
}

export interface Textbook extends ParseResult {
  status: "parsing" | "ready" | "error";
  errorMessage?: string;
  uploadedAt: number;
}

export interface KnowledgeNode {
  id: string;
  name: string;
  definition: string;
  category: "核心概念" | "定理" | "方法" | "现象";
  chapter: string;
  page: number;
  textbookId: string;
}

export type RelationType = "prerequisite" | "contains";

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
