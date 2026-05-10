import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const store = getStore();
  const textbook = await store.getTextbook(id);
  if (!textbook) return NextResponse.json({ error: "教材未找到" }, { status: 404 });
  return NextResponse.json({ textbook });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const store = getStore();
  await store.deleteAll(id);
  return NextResponse.json({ success: true });
}
