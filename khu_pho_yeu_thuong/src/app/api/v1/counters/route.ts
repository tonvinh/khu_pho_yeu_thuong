import { NextResponse } from "next/server";
import { getCounters } from "@/lib/counters";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getCounters());
}
