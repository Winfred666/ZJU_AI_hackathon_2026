import { Store } from "./types";
import { Textbook, TOCGraph, KnowledgeGraph } from "@/types";

export class MemoryStore implements Store {
  private textbooks = new Map<string, Textbook>();
  private tocGraphs = new Map<string, TOCGraph>();
  private drillGraphs = new Map<string, KnowledgeGraph>();
  private pdfBuffers = new Map<string, Buffer>();
  private fileHashes = new Map<string, string>();

  async getTextbook(id: string) { return this.textbooks.get(id) ?? null; }
  async setTextbook(id: string, data: Textbook) { this.textbooks.set(id, data); }
  async listTextbooks() { return Array.from(this.textbooks.values()); }
  async deleteTextbook(id: string) { this.textbooks.delete(id); }

  async getTOCGraph(textbookId: string) { return this.tocGraphs.get(textbookId) ?? null; }
  async setTOCGraph(textbookId: string, data: TOCGraph) { this.tocGraphs.set(textbookId, data); }
  async deleteTOCGraph(textbookId: string) { this.tocGraphs.delete(textbookId); }

  async getDrillGraph(textbookId: string, chapterId: string) {
    return this.drillGraphs.get(`${textbookId}:${chapterId}`) ?? null;
  }
  async setDrillGraph(textbookId: string, chapterId: string, data: KnowledgeGraph) {
    this.drillGraphs.set(`${textbookId}:${chapterId}`, data);
  }
  async deleteDrillGraphs(textbookId: string) {
    const prefix = `${textbookId}:`;
    for (const key of this.drillGraphs.keys()) {
      if (key.startsWith(prefix)) this.drillGraphs.delete(key);
    }
  }

  async getPdfBuffer(textbookId: string) { return this.pdfBuffers.get(textbookId) ?? null; }
  async setPdfBuffer(textbookId: string, buffer: Buffer) { this.pdfBuffers.set(textbookId, buffer); }
  async deletePdfBuffer(textbookId: string) { this.pdfBuffers.delete(textbookId); }

  async getTextbookIdByHash(sha256: string) { return this.fileHashes.get(sha256) ?? null; }
  async setFileHash(sha256: string, textbookId: string) { this.fileHashes.set(sha256, textbookId); }

  async deleteAll(textbookId: string) {
    this.textbooks.delete(textbookId);
    this.tocGraphs.delete(textbookId);
    const prefix = `${textbookId}:`;
    for (const key of this.drillGraphs.keys()) {
      if (key.startsWith(prefix)) this.drillGraphs.delete(key);
    }
    this.pdfBuffers.delete(textbookId);
  }
}
