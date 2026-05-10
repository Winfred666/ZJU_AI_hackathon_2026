import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";

/** Check if a file with this SHA-256 hash was already parsed. If so, return cached data. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const hash = searchParams.get("hash");
  if (!hash) {
    return NextResponse.json({ error: "缺少 hash 参数" }, { status: 400 });
  }

  const store = getStore();
  const textbookId = await store.getTextbookIdByHash(hash);
  if (!textbookId) {
    return NextResponse.json({ found: false });
  }

  const textbook = await store.getTextbook(textbookId);
  const tocGraph = await store.getTOCGraph(textbookId);
  if (!textbook) {
    return NextResponse.json({ found: false });
  }

  return NextResponse.json({ found: true, textbook, tocGraph });
}
