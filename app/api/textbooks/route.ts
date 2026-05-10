import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";

export async function GET(): Promise<NextResponse> {
  const store = getStore();
  return NextResponse.json({ textbooks: await store.listTextbooks() });
}
