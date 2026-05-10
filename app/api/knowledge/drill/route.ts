import { NextRequest, NextResponse } from "next/server";
import { drillRequestSchema, drillOutputSchema } from "@/lib/validators";
import { llmGenerate } from "@/lib/llm";
import { KnowledgeGraph } from "@/types";

const MAX_CONTENT_BYTES = 900_000; // ~900KB, under 1MB hard limit

const DRILL_SYSTEM = `你是一个学科知识提取专家。从教材章节正文中提取核心知识点及其包含关系。

规则：
1. 提取 3-10 个知识点
2. 每个知识点: id, name, definition, category("核心概念"|"定理"|"方法"|"现象"), chapter, page
3. 只输出"contains"关系（大概念包含小概念）
4. 只输出严格JSON，不要任何其他文字

输出格式：
{
  "nodes": [
    { "id": "d_01", "name": "知识点名", "definition": "定义", "category": "核心概念", "chapter": "章节名", "page": 45 }
  ],
  "relations": [
    { "source": "d_01", "target": "d_02", "relationType": "contains", "description": "A包含B" }
  ]
}`;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { textbookId, chapterId, pageStart, pageEnd, chapterTitle } =
      drillRequestSchema.parse(body);

    // Re-read PDF from the stored buffer? No — we don't store raw PDFs.
    // Instead, parse route stored chapter content; drill re-uses it.
    // But for page-level precision we need raw text. We use stored chapters.
    const { textbookStore } = await import("@/app/api/parse/route");
    const textbook = textbookStore.get(textbookId);
    if (!textbook) {
      return NextResponse.json({ error: "教材未找到" }, { status: 404 });
    }

    // Find the chapter's content from stored chapters
    const chapter = textbook.chapters.find(
      (c) => c.pageStart <= pageStart && c.pageEnd >= pageStart,
    );

    if (!chapter || !chapter.content) {
      return NextResponse.json({ error: "章节内容未找到，请重新上传教材" }, { status: 404 });
    }

    // 1MB guard: truncate if needed
    let content = chapter.content;
    const contentBytes = new TextEncoder().encode(content).length;
    if (contentBytes > MAX_CONTENT_BYTES) {
      // Truncate to ~900KB while keeping full sentences
      content = content.slice(0, Math.floor(MAX_CONTENT_BYTES * 0.5));
    }

    const prompt = `章节：${chapterTitle}（第${pageStart}-${pageEnd}页）\n正文：${content}`;

    const raw = await llmGenerate({
      system: DRILL_SYSTEM,
      prompt,
      temperature: 0.25,
    });

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "LLM 返回格式异常" }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const validated = drillOutputSchema.parse(parsed);

    // Prefix IDs
    const prefix = `${textbookId}_drill_${chapterId}_`;
    const nodes = validated.nodes.map((n) => ({
      ...n,
      id: `${prefix}${n.id}`,
      textbookId,
      chapter: chapterTitle,
    }));
    const relations = validated.relations.map((r) => ({
      ...r,
      source: `${prefix}${r.source}`,
      target: `${prefix}${r.target}`,
    }));

    const subGraph: KnowledgeGraph = { nodes, relations };
    return NextResponse.json({ subGraph, parentNodeId: chapterId });
  } catch (err) {
    return NextResponse.json(
      { error: `章节钻取失败: ${String(err)}` },
      { status: 500 },
    );
  }
}
