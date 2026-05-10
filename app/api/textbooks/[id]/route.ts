import { NextRequest, NextResponse } from "next/server";
import { textbookStore } from "@/app/api/parse/route";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const textbook = textbookStore.get(id);
  if (!textbook) return NextResponse.json({ error: "教材未找到" }, { status: 404 });
  return NextResponse.json({ textbook });
}
