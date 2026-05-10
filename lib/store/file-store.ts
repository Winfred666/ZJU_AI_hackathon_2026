import fs from "fs/promises";
import path from "path";
import { Store } from "./types";
import { NS } from "./key-namespace";
import { Textbook, TOCGraph, KnowledgeGraph } from "@/types";

const DATA_DIR = path.join(process.cwd(), ".data");

async function ensureDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true }).catch(() => {});
}

function fpath(key: string): string {
  return path.join(DATA_DIR, `${encodeURIComponent(key)}.json`);
}

async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(fpath(key), "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function writeJson(key: string, data: unknown): Promise<void> {
  await ensureDir();
  await fs.writeFile(fpath(key), JSON.stringify(data, null, 2), "utf-8").catch(() => {});
}

async function removeJson(key: string): Promise<void> {
  try { await fs.unlink(fpath(key)); } catch {}
}

async function listJsonKeys(prefix: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(DATA_DIR);
    return entries.filter((e) => e.startsWith(prefix));
  } catch {
    return [];
  }
}

export class FileStore implements Store {
  async getTextbook(id: string) { return readJson<Textbook>(NS.textbook(id)); }
  async setTextbook(id: string, d: Textbook) { await writeJson(NS.textbook(id), d); }
  async listTextbooks(): Promise<Textbook[]> {
    const tbs: Textbook[] = [];
    for (const e of await listJsonKeys("textbook%3A")) {
      const tb = await readJson<Textbook>(decodeURIComponent(e.replace(/\.json$/, "")));
      if (tb) tbs.push(tb);
    }
    return tbs;
  }
  async deleteTextbook(id: string) { await removeJson(NS.textbook(id)); }

  async getTOCGraph(id: string) { return readJson<TOCGraph>(NS.tocGraph(id)); }
  async setTOCGraph(id: string, d: TOCGraph) { await writeJson(NS.tocGraph(id), d); }
  async deleteTOCGraph(id: string) { await removeJson(NS.tocGraph(id)); }

  async getDrillGraph(tid: string, cid: string) { return readJson<KnowledgeGraph>(NS.drillGraph(tid, cid)); }
  async setDrillGraph(tid: string, cid: string, d: KnowledgeGraph) { await writeJson(NS.drillGraph(tid, cid), d); }
  async listDrillKeys(tid: string): Promise<string[]> {
    const prefix = `drill%3A${tid}%3A`;
    return (await listJsonKeys(prefix)).map((e) => {
      const rest = decodeURIComponent(e.replace(/\.json$/, ""));
      return rest.slice(`drill:${tid}:`.length);
    });
  }
  async deleteDrillGraphs(tid: string) {
    for (const e of await listJsonKeys(`drill%3A${tid}%3A`)) {
      await fs.unlink(path.join(DATA_DIR, e)).catch(() => {});
    }
  }

  async getPdfBuffer(id: string): Promise<Buffer | null> {
    try { return await fs.readFile(path.join(DATA_DIR, `${encodeURIComponent(NS.pdfBuffer(id))}.bin`)); }
    catch { return null; }
  }
  async setPdfBuffer(id: string, buf: Buffer) {
    await ensureDir();
    await fs.writeFile(path.join(DATA_DIR, `${encodeURIComponent(NS.pdfBuffer(id))}.bin`), buf).catch(() => {});
  }
  async deletePdfBuffer(id: string) {
    try { await fs.unlink(path.join(DATA_DIR, `${encodeURIComponent(NS.pdfBuffer(id))}.bin`)); } catch {}
  }

  async getTextbookIdByHash(h: string) { return readJson<string>(NS.fileHash(h)); }
  async setFileHash(h: string, tid: string) { await writeJson(NS.fileHash(h), tid); }

  async deleteAll(tid: string) {
    await Promise.all([
      this.deleteTextbook(tid), this.deleteTOCGraph(tid),
      this.deleteDrillGraphs(tid), this.deletePdfBuffer(tid),
    ]);
  }
}
