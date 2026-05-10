import { NextResponse } from "next/server";
import { textbookStore } from "@/app/api/parse/route";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ textbooks: Array.from(textbookStore.values()) });
}
