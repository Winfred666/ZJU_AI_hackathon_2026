import { NextRequest, NextResponse } from "next/server";
import { processFile } from "@/lib/process-file";

export const maxDuration = 60; // Vercel Pro: allow up to 60s for LLM TOC extraction

// In-memory chunk assembly — survives warm invocations on Vercel
const chunkStore = new Map<string, { chunks: Buffer[]; totalChunks: number; filename: string; received: number; expires: number }>();

// Clean up stale uploads every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, s] of chunkStore) {
    if (now > s.expires) chunkStore.delete(id);
  }
}, 5 * 60_000);

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const fileId = formData.get("fileId") as string;
    const chunkIndex = parseInt(formData.get("chunkIndex") as string, 10);
    const totalChunks = parseInt(formData.get("totalChunks") as string, 10);
    const filename = formData.get("filename") as string;
    const chunkFile = formData.get("chunk") as File;

    if (!fileId || isNaN(chunkIndex) || isNaN(totalChunks) || !chunkFile) {
      return NextResponse.json({ error: "缺少参数" }, { status: 400 });
    }

    const ext = filename.split(".").pop()?.toLowerCase();
    if (!ext || !["pdf", "txt", "md"].includes(ext)) {
      return NextResponse.json({ error: `不支持的文件格式: .${ext}` }, { status: 400 });
    }

    let entry = chunkStore.get(fileId);
    if (!entry) {
      entry = {
        chunks: new Array(totalChunks),
        totalChunks,
        filename,
        received: 0,
        expires: Date.now() + 10 * 60_000, // 10 min timeout
      };
      chunkStore.set(fileId, entry);
    }

    const chunkBuf = Buffer.from(await chunkFile.arrayBuffer());
    if (!entry.chunks[chunkIndex]) {
      entry.chunks[chunkIndex] = chunkBuf;
      entry.received++;
    }

    console.log(`[chunk] ${filename} — chunk ${chunkIndex + 1}/${totalChunks} (${entry.received}/${totalChunks} received)`);

    // Not all chunks received yet — acknowledge and continue
    if (entry.received < entry.totalChunks) {
      return NextResponse.json({ status: "chunk_ok", received: entry.received, totalChunks });
    }

    // All chunks received — reassemble and process
    const fullBuffer = Buffer.concat(entry.chunks.filter(Boolean));
    chunkStore.delete(fileId);

    console.log(`[chunk] ${filename} — reassembled ${(fullBuffer.length / 1024).toFixed(0)}KB, processing`);

    const { textbook, tocGraph } = await processFile(fullBuffer, filename, fullBuffer.length);

    return NextResponse.json({
      status: "complete",
      textbooks: [textbook],
      tocGraphs: tocGraph !== undefined ? { [textbook.textbookId]: tocGraph } : {},
    });
  } catch (err) {
    return NextResponse.json({ error: `上传失败: ${String(err)}` }, { status: 500 });
  }
}
