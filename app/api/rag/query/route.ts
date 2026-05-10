import { NextRequest, NextResponse } from "next/server";
import { textbookStore } from "@/app/api/parse/route";
import { ragQuerySchema } from "@/lib/validators";
import { chunkText } from "@/lib/chunker";
import { embedSingle } from "@/lib/embedder";
import { getVectorStore } from "@/lib/vector-store";
import { llmGenerate } from "@/lib/llm";

const RAG_SYSTEM = `你是一个学科知识问答助手。仅根据提供的教材内容回答。规则：
1. 仅使用提供的上下文
2. 找不到答案时回复"当前知识库中未找到相关信息"
3. 引用来源格式: [教材名, 章节, 页码]`;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { textbookId, question } = ragQuerySchema.parse(body);

    const textbook = textbookStore.get(textbookId);
    if (!textbook) return NextResponse.json({ error: "教材未找到" }, { status: 404 });

    const store = getVectorStore();

    if (store.size === 0) {
      const chunks = textbook.chapters.flatMap((ch) =>
        chunkText(ch.content, { textbookId, textbookName: textbook.title, chapter: ch.title, page: ch.pageStart }),
      );
      for (let i = 0; i < chunks.length; i += 20) {
        const batch = chunks.slice(i, i + 20);
        const embeddings = await Promise.all(batch.map((c) => embedSingle(c.text)));
        store.upsert(batch.map((c, idx) => ({ id: c.id, text: c.text, vector: embeddings[idx], metadata: c.metadata })));
      }
    }

    const queryVector = await embedSingle(question);
    const results = store.query(queryVector, 5, textbookId);

    if (results.length === 0) {
      return NextResponse.json({
        answer: "当前知识库中未找到相关信息", citations: [], sourceChunks: [],
      });
    }

    const context = results.map((r, i) =>
      `[片段${i + 1}] ${r.metadata.textbookName}, ${r.metadata.chapter}, 第${r.metadata.page}页\n${r.text}`
    ).join("\n\n");

    const answer = await llmGenerate({ system: RAG_SYSTEM, prompt: `上下文：\n${context}\n\n问题：${question}`, temperature: 0.3 });

    return NextResponse.json({
      answer,
      citations: results.map((r) => ({
        textbook: r.metadata.textbookName,
        chapter: r.metadata.chapter,
        page: r.metadata.page,
        relevanceScore: Math.round(r.score * 100) / 100,
      })),
      sourceChunks: results.map((r) => r.text),
    });
  } catch (err) {
    return NextResponse.json({ error: `问答失败: ${String(err)}` }, { status: 500 });
  }
}
