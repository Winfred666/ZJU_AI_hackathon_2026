import { NextRequest, NextResponse } from "next/server";
import { drillRequestSchema, drillOutputSchema } from "@/lib/validators";
import { llmGenerate } from "@/lib/llm";
import { KnowledgeGraph } from "@/types";
import { pdfBufferStore } from "@/app/api/parse/route";

const MAX_CONTENT_BYTES = 900_000;

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

    const buffer = pdfBufferStore.get(textbookId);
    if (!buffer) {
      return NextResponse.json({ error: "PDF 缓存已过期，请重新上传" }, { status: 404 });
    }

    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc: any = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;

    const maxPage = Math.min(pageEnd, doc.numPages);
    const pages: string[] = [];
    for (let i = pageStart; i <= maxPage; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      pages.push(content.items.map((item: { str?: string }) => ("str" in item ? item.str : "")).join(" "));
    }
    let content = pages.join("\n");

    // 1MB guard
    if (new TextEncoder().encode(content).length > MAX_CONTENT_BYTES) {
      content = content.slice(0, Math.floor(MAX_CONTENT_BYTES * 0.5));
    }

    const prompt = `章节：${chapterTitle}（第${pageStart}-${pageEnd}页）\n正文：${content}`;
    const raw = await llmGenerate({ system: DRILL_SYSTEM, prompt, temperature: 0.25 });
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "LLM 返回格式异常" }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const validated = drillOutputSchema.parse(parsed);

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
