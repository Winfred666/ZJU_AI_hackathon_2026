import { NextRequest, NextResponse } from "next/server";
import { textbookStore } from "@/app/api/parse/route";
import { knowledgeExtractSchema, knowledgeExtractOutputSchema } from "@/lib/validators";
import { llmGenerate } from "@/lib/llm";
import { KnowledgeGraph } from "@/types";

export const knowledgeGraphStore = new Map<string, KnowledgeGraph>();

const EXTRACT_SYSTEM = `你是一个学科知识提取专家。从教材章节中提取核心知识点，输出严格JSON。

输出格式：
{
  "nodes": [{ "id": "node_001", "name": "知识点名", "definition": "定义", "category": "核心概念|定理|方法|现象", "chapter": "章节名", "page": 页码 }],
  "relations": [{ "source": "node_001", "target": "node_002", "relationType": "prerequisite|contains", "description": "关系说明" }]
}

规则：每章5-15个知识点，category限"核心概念""定理""方法""现象"，relationType限"prerequisite""contains"。只输出JSON。`;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { textbookId } = knowledgeExtractSchema.parse(body);

    const textbook = textbookStore.get(textbookId);
    if (!textbook) return NextResponse.json({ error: "教材未找到" }, { status: 404 });
    if (textbook.chapters.length === 0) return NextResponse.json({ error: "教材无章节数据" }, { status: 400 });

    const allNodes: KnowledgeGraph["nodes"] = [];
    const allRelations: KnowledgeGraph["relations"] = [];
    let counter = 0;

    for (const chapter of textbook.chapters) {
      if (!chapter.content || chapter.content.length < 50) continue;

      const prompt = `章节标题：${chapter.title}\n正文：${chapter.content.slice(0, 6000)}`;
      const raw = await llmGenerate({ system: EXTRACT_SYSTEM, prompt, temperature: 0.2 });
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;

      try {
        const parsed = JSON.parse(jsonMatch[0]);
        const validated = knowledgeExtractOutputSchema.parse(parsed);
        const idMap = new Map<string, string>();

        for (const node of validated.nodes) {
          counter++;
          const newId = `${textbookId}_node_${String(counter).padStart(3, "0")}`;
          idMap.set(node.id, newId);
          allNodes.push({ ...node, id: newId, textbookId });
        }

        for (const rel of validated.relations) {
          allRelations.push({
            source: idMap.get(rel.source) ?? rel.source,
            target: idMap.get(rel.target) ?? rel.target,
            relationType: rel.relationType,
            description: rel.description,
          });
        }
      } catch { continue; }
    }

    const graph: KnowledgeGraph = { nodes: allNodes, relations: allRelations };
    knowledgeGraphStore.set(textbookId, graph);
    return NextResponse.json({ graph });
  } catch (err) {
    return NextResponse.json({ error: `知识提取失败: ${String(err)}` }, { status: 500 });
  }
}
