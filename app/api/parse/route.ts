import { NextRequest, NextResponse } from "next/server";
import { Textbook, TOCGraph } from "@/types";
import { processFile, makeError } from "@/lib/process-file";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: "请上传至少一个文件" }, { status: 400 });
    }

    const results: Textbook[] = [];
    const tocGraphs: Record<string, TOCGraph | null> = {};

    for (const file of files) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!ext || !["pdf", "txt", "md"].includes(ext)) {
        results.push(makeError(crypto.randomUUID(), file.name, `不支持的文件格式: .${ext}`));
        continue;
      }
      const arrayBuffer = await file.arrayBuffer();
      const { textbook, tocGraph } = await processFile(
        Buffer.from(arrayBuffer), file.name, file.size,
      );
      results.push(textbook);
      if (tocGraph !== undefined) tocGraphs[textbook.textbookId] = tocGraph;
    }

    return NextResponse.json({ textbooks: results, tocGraphs });
  } catch (err) {
    return NextResponse.json({ error: `解析失败: ${String(err)}` }, { status: 500 });
  }
}
