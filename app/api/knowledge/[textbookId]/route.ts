import { NextRequest, NextResponse } from "next/server";
import { knowledgeGraphStore } from "@/app/api/knowledge/extract/route";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ textbookId: string }> },
): Promise<NextResponse> {
  const { textbookId } = await params;
  const graph = knowledgeGraphStore.get(textbookId);
  if (!graph) return NextResponse.json({ error: "知识图谱未找到，请先提取知识" }, { status: 404 });
  return NextResponse.json({ graph });
}
