import { NextRequest, NextResponse } from "next/server";
import { getAmbassadors, getNeighborhoodOfMonth } from "@/lib/leaderboard";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") || "ambassador";
  if (type === "neighborhood") {
    return NextResponse.json({ neighborhood_of_month: await getNeighborhoodOfMonth() });
  }
  return NextResponse.json({
    ambassadors: await getAmbassadors(10),
    neighborhood_of_month: await getNeighborhoodOfMonth(),
  });
}
