import fs from "fs/promises";
import path from "path";
import { Store } from "./types";
import { NS } from "./key-namespace";
import { Textbook, TOCGraph, KnowledgeGraph } from "@/types";

// On Vercel: /tmp is the only writable directory
// Repo .data/ ships pre-loaded knowledge graphs (read-only on Vercel)
const WRITE_DIR = process.env.VERCEL
  ? path.join("/tmp", ".data")
  : path.join(process.cwd(), ".data");
const REPO_DATA_DIR = path.join(process.cwd(), ".data");

let seeded = false;

/** Copy pre-loaded .data/ files from repo into /tmp on Vercel cold start */
async function seed(): Promise<void> {
  if (seeded) return;
  seeded = true;
  if (!process.env.VERCEL) return;
  try {
    const entries = await fs.readdir(REPO_DATA_DIR);
    await fs.mkdir(WRITE_DIR, { recursive: true }).catch(() => {});
    for (const entry of entries) {
      if (entry.endsWith(".bin")) continue; // skip large PDF buffers
      const src = path.join(REPO_DATA_DIR, entry);
      const dst = path.join(WRITE_DIR, entry);
      try {
        await fs.stat(dst); // already copied
      } catch {
        await fs.copyFile(src, dst);
        console.log(`[store] seeded ${entry}`);
      }
    }
  } catch { /* repo .data/ may not exist yet */ }
}

async function ensureDir(): Promise<void> {
  await seed();
  await fs.mkdir(WRITE_DIR, { recursive: true }).catch(() => {});
}

function writePath(key: string): string {
  return path.join(WRITE_DIR, `${encodeURIComponent(key)}.json`);
}

/** Try to read from write dir first, fall back to repo dir (pre-loaded) */
async function readJson<T>(key: string): Promise<T | null> {
  await seed();
  // Try write dir first (latest data)
  try {
    const raw = await fs.readFile(writePath(key), "utf-8");
    return JSON.parse(raw) as T;
  } catch {}
  // Fallback: repo dir (shipped with deployment)
  if (process.env.VERCEL) {
    try {
      const repoPath = path.join(REPO_DATA_DIR, `${encodeURIComponent(key)}.json`);
      const raw = await fs.readFile(repoPath, "utf-8");
      return JSON.parse(raw) as T;
    } catch {}
  }
  return null;
}

async function writeJson(key: string, data: unknown): Promise<void> {
  await ensureDir();
  await fs.writeFile(writePath(key), JSON.stringify(data, null, 2), "utf-8");
}

async function removeJson(key: string): Promise<void> {
  await seed();
  try { await fs.unlink(writePath(key)); } catch {}
  // Also remove from repo dir if it exists there
  if (process.env.VERCEL) {
    try { await fs.unlink(path.join(REPO_DATA_DIR, `${encodeURIComponent(key)}.json`)); } catch {}
  }
}

async function listKeys(prefix: string): Promise<string[]> {
  await ensureDir();
  const keys: string[] = [];
  // Write dir
  try {
    const entries = await fs.readdir(WRITE_DIR);
    for (const e of entries) {
      if (e.startsWith(prefix)) keys.push(e);
    }
  } catch {}
  // Repo dir (dedup)
  if (process.env.VERCEL) {
    try {
      const entries = await fs.readdir(REPO_DATA_DIR);
      for (const e of entries) {
        if (e.startsWith(prefix) && !keys.includes(e)) keys.push(e);
      }
    } catch {}
  }
  return keys;
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
    const textbooks: Textbook[] = [];
    const keys = await listKeys("textbook%3A");
    for (const entry of keys) {
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
  async listDrillKeys(textbookId: string): Promise<string[]> {
    await ensureDir();
    const prefix = `drill%3A${textbookId}%3A`;
    const entries = await listKeys(prefix);
    return entries
      .map((e) => {
        const rest = decodeURIComponent(e.replace(/\.json$/, ""));
        return rest.slice(`drill:${textbookId}:`.length);
      });
  }
  async deleteDrillGraphs(textbookId: string) {
    await ensureDir();
    const prefix = `drill%3A${textbookId}%3A`;
    const entries = await listKeys(prefix);
    for (const entry of entries) {
      await fs.unlink(path.join(WRITE_DIR, entry)).catch(() => {});
    }
  }

  async getPdfBuffer(textbookId: string): Promise<Buffer | null> {
    await seed();
    try {
      return await fs.readFile(
        path.join(WRITE_DIR, `${encodeURIComponent(NS.pdfBuffer(textbookId))}.bin`),
      );
    } catch {
      return null;
    }
  }
  async setPdfBuffer(textbookId: string, buffer: Buffer) {
    await ensureDir();
    await fs.writeFile(
      path.join(WRITE_DIR, `${encodeURIComponent(NS.pdfBuffer(textbookId))}.bin`),
      buffer,
    );
  }
  async deletePdfBuffer(textbookId: string) {
    try {
      await fs.unlink(
        path.join(WRITE_DIR, `${encodeURIComponent(NS.pdfBuffer(textbookId))}.bin`),
      );
    } catch {}
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
