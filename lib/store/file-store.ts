import fs from "fs/promises";
import path from "path";
import { Store } from "./types";
import { NS } from "./key-namespace";
import { Textbook, TOCGraph, KnowledgeGraph } from "@/types";

const DATA_DIR = path.join(process.cwd(), ".data");

async function ensureDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true }).catch(() => {});
}

function filePath(key: string): string {
  return path.join(DATA_DIR, `${encodeURIComponent(key)}.json`);
}

async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath(key), "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function writeJson(key: string, data: unknown): Promise<void> {
  await ensureDir();
  await fs.writeFile(filePath(key), JSON.stringify(data, null, 2), "utf-8");
}

async function removeJson(key: string): Promise<void> {
  try {
    await fs.unlink(filePath(key));
  } catch { /* missing file is fine */ }
}

export class FileStore implements Store {
  async getTextbook(id: string) {
    return readJson<Textbook>(NS.textbook(id));
  }
  async setTextbook(id: string, data: Textbook) {
    await writeJson(NS.textbook(id), data);
  }
  async listTextbooks(): Promise<Textbook[]> {
    await ensureDir();
    const entries = await fs.readdir(DATA_DIR);
    const textbooks: Textbook[] = [];
    for (const entry of entries) {
      if (!entry.startsWith("textbook%3A")) continue;
      const key = decodeURIComponent(entry.replace(/\.json$/, ""));
      const tb = await readJson<Textbook>(key);
      if (tb) textbooks.push(tb);
    }
    return textbooks;
  }
  async deleteTextbook(id: string) {
    await removeJson(NS.textbook(id));
  }

  async getTOCGraph(textbookId: string) {
    return readJson<TOCGraph>(NS.tocGraph(textbookId));
  }
  async setTOCGraph(textbookId: string, data: TOCGraph) {
    await writeJson(NS.tocGraph(textbookId), data);
  }
  async deleteTOCGraph(textbookId: string) {
    await removeJson(NS.tocGraph(textbookId));
  }

  async getDrillGraph(textbookId: string, chapterId: string) {
    return readJson<KnowledgeGraph>(NS.drillGraph(textbookId, chapterId));
  }
  async setDrillGraph(textbookId: string, chapterId: string, data: KnowledgeGraph) {
    await writeJson(NS.drillGraph(textbookId, chapterId), data);
  }
  async deleteDrillGraphs(textbookId: string) {
    await ensureDir();
    const prefix = `drill%3A${textbookId}%3A`;
    const entries = await fs.readdir(DATA_DIR);
    for (const entry of entries) {
      if (entry.startsWith(prefix)) {
        await fs.unlink(path.join(DATA_DIR, entry));
      }
    }
  }

  async getPdfBuffer(textbookId: string): Promise<Buffer | null> {
    try {
      return await fs.readFile(
        path.join(DATA_DIR, `${encodeURIComponent(NS.pdfBuffer(textbookId))}.bin`),
      );
    } catch {
      return null;
    }
  }
  async setPdfBuffer(textbookId: string, buffer: Buffer) {
    await ensureDir();
    await fs.writeFile(
      path.join(DATA_DIR, `${encodeURIComponent(NS.pdfBuffer(textbookId))}.bin`),
      buffer,
    );
  }
  async deletePdfBuffer(textbookId: string) {
    try {
      await fs.unlink(
        path.join(DATA_DIR, `${encodeURIComponent(NS.pdfBuffer(textbookId))}.bin`),
      );
    } catch { /* missing file is fine */ }
  }

  async getTextbookIdByHash(sha256: string) {
    return readJson<string>(NS.fileHash(sha256));
  }
  async setFileHash(sha256: string, textbookId: string) {
    await writeJson(NS.fileHash(sha256), textbookId);
  }

  async deleteAll(textbookId: string) {
    await Promise.all([
      this.deleteTextbook(textbookId),
      this.deleteTOCGraph(textbookId),
      this.deleteDrillGraphs(textbookId),
      this.deletePdfBuffer(textbookId),
    ]);
  }
}
