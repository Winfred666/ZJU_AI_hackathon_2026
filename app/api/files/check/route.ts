import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";

/** Check if a file was already parsed — by SHA-256 hash first, then by filename. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const hash = searchParams.get("hash");
  const filename = searchParams.get("filename");

  const store = getStore();

  // 1) Exact match by SHA-256 hash
  if (hash) {
    const textbookId = await store.getTextbookIdByHash(hash);
    if (textbookId) {
      const textbook = await store.getTextbook(textbookId);
      const tocGraph = await store.getTOCGraph(textbookId);
      if (textbook) {
        return NextResponse.json({ found: true, textbook, tocGraph, matchBy: "hash" });
      }
    }
  }

  // 2) Fallback: match by filename (same name, different byte content)
  if (filename) {
    const all = await store.listTextbooks();
    const match = all.find((tb) => tb.filename === filename || tb.title === filename);
    if (match) {
      const tocGraph = await store.getTOCGraph(match.textbookId);
      return NextResponse.json({ found: true, textbook: match, tocGraph, matchBy: "filename" });
    }
  }

  return NextResponse.json({ found: false });
}
