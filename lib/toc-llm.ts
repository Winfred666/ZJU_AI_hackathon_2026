import { llmGenerate } from "./llm";
import { TOCGraph } from "@/types";

const MAX_TOC_BYTES = 50_000; // ~50KB for TOC text (well under 1MB)

const TOC_SYSTEM = `你是一个教材结构分析专家。根据提供的目录文本，提取章节结构并判断章节间的前置依赖和并列关系。

规则：
1. 最多解析2层目录（章 → 节）。三级及以下标题合并到上级节
2. 跳过附录、索引、参考文献、致谢等非核心章节，不为其生成节点
3. 每个章节节点包含: id, name(章节全名), pageStart, pageEnd, parentId(null表示一级章), level(1或2)
4. 关系类型: prerequisite(学B前必须先学A), parallel(同级并列关系)
5. 只输出严格JSON，不要任何其他文字

输出格式：
{
  "nodes": [
    { "id": "toc_01", "name": "第一章 绪论", "definition": "本章概述学科基本概念", "category": "核心概念", "chapter": "第一章 绪论", "page": 1, "isTocNode": true, "pageRange": { "start": 1, "end": 20 } }
  ],
  "relations": [
    { "source": "toc_01", "target": "toc_02", "relationType": "prerequisite", "description": "需先掌握绪论再学习细胞" },
    { "source": "toc_03", "target": "toc_04", "relationType": "parallel", "description": "呼吸系统与循环系统为并列关系" }
  ],
  "tocStructure": [
    { "id": "toc_01", "name": "第一章 绪论", "pageStart": 1, "pageEnd": 20, "parentId": null, "level": 1 },
    { "id": "toc_01_1", "name": "第一节 学科概述", "pageStart": 1, "pageEnd": 10, "parentId": "toc_01", "level": 2 }
  ]
}`;

export async function extractTOCGraph(
  tocText: string,
  textbookId: string,
  chapterPageMap: { title: string; pageStart: number; pageEnd: number }[],
): Promise<TOCGraph | null> {
  // Guard: never send > 50KB TOC text to AI
  const truncated = tocText.length > MAX_TOC_BYTES
    ? tocText.slice(0, MAX_TOC_BYTES)
    : tocText;

  const chapterHints = chapterPageMap
    .map((c) => `"${c.title}" → 第${c.pageStart}-${c.pageEnd}页`)
    .join("\n");

  const prompt = `教材目录文本：
${truncated}

已识别的章节页码映射：
${chapterHints}

请分析上述目录，提取章节结构和关系。`;

  try {
    const raw = await llmGenerate({ system: TOC_SYSTEM, prompt, temperature: 0.2 });
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);

    // Prefix all IDs with textbookId
    const idPrefix = (id: string) =>
      id.startsWith(textbookId) ? id : `${textbookId}_${id}`;

    const nodes = (parsed.nodes ?? []).map((n: Record<string, unknown>) => ({
      ...n,
      id: idPrefix(n.id as string),
      textbookId,
      isTocNode: true,
    }));

    const relations = (parsed.relations ?? []).map((r: Record<string, unknown>) => ({
      ...r,
      source: idPrefix(r.source as string),
      target: idPrefix(r.target as string),
    }));

    const tocStructure = (parsed.tocStructure ?? []).map((t: Record<string, unknown>) => ({
      ...t,
      id: idPrefix(t.id as string),
      parentId: t.parentId ? idPrefix(t.parentId as string) : null,
    }));

    return { nodes, relations, tocStructure };
  } catch {
    return null;
  }
}
