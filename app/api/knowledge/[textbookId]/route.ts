import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { KnowledgeGraph } from "@/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ textbookId: string }> },
): Promise<NextResponse> {
  const { textbookId } = await params;
  const store = getStore();
  const tocGraph = await store.getTOCGraph(textbookId);
  if (!tocGraph) {
    return NextResponse.json({ tocGraph: null });
  }

  // Merge TOC graph with all drill sub-graphs for persistence
  const drillKeys = await store.listDrillKeys(textbookId);
  const merged: KnowledgeGraph = {
    nodes: [...tocGraph.nodes],
    relations: [...tocGraph.relations],
  };

  for (const chapterId of drillKeys) {
    const sub = await store.getDrillGraph(textbookId, chapterId);
    if (!sub) continue;
    const existingIds = new Set(merged.nodes.map((n) => n.id));
    for (const n of sub.nodes) {
      if (!existingIds.has(n.id)) {
        merged.nodes.push(n);
        existingIds.add(n.id);
      }
    }
    for (const r of sub.relations) {
      if (!merged.relations.some((er) => er.source === r.source && er.target === r.target)) {
        merged.relations.push(r);
      }
    }
  }

  return NextResponse.json({ tocGraph: { ...tocGraph, nodes: merged.nodes, relations: merged.relations } });
}
