import { Textbook, TOCGraph, KnowledgeGraph } from "@/types";

export interface Store {
  getTextbook(id: string): Promise<Textbook | null>;
  setTextbook(id: string, data: Textbook): Promise<void>;
  listTextbooks(): Promise<Textbook[]>;
  deleteTextbook(id: string): Promise<void>;

  getTOCGraph(textbookId: string): Promise<TOCGraph | null>;
  setTOCGraph(textbookId: string, data: TOCGraph): Promise<void>;
  deleteTOCGraph(textbookId: string): Promise<void>;

  getDrillGraph(textbookId: string, chapterId: string): Promise<KnowledgeGraph | null>;
  setDrillGraph(textbookId: string, chapterId: string, data: KnowledgeGraph): Promise<void>;
  deleteDrillGraphs(textbookId: string): Promise<void>;

  getPdfBuffer(textbookId: string): Promise<Buffer | null>;
  setPdfBuffer(textbookId: string, buffer: Buffer): Promise<void>;
  deletePdfBuffer(textbookId: string): Promise<void>;

  getTextbookIdByHash(sha256: string): Promise<string | null>;
  setFileHash(sha256: string, textbookId: string): Promise<void>;

  /** Delete all data for a textbook (textbook, TOC graph, drill graphs, PDF buffer) */
  deleteAll(textbookId: string): Promise<void>;
}
