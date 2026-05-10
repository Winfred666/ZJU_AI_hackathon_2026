import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ textbookId: string }> },
): Promise<NextResponse> {
  const { textbookId } = await params;
  const store = getStore();
  const tocGraph = await store.getTOCGraph(textbookId);
  if (!tocGraph) {
    return NextResponse.json({ error: "知识图谱未找到" }, { status: 404 });
  }
  return NextResponse.json({ tocGraph });
}
