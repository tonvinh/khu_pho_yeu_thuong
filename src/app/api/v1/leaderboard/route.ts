import { NextRequest, NextResponse } from "next/server";
import { getAmbassadors, getNeighborhoodOfMonth, getViewerRank } from "@/lib/leaderboard";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") || "ambassador";
  if (type === "neighborhood") {
    return NextResponse.json({ neighborhood_of_month: await getNeighborhoodOfMonth() });
  }
  // Hạng của người xem (cookie kp_session) — hàng "Bạn đang ở hạng #N" cuối bảng
  const viewer = await getSessionUser(req);
  const [ambassadors, nom, viewerRank] = await Promise.all([
    getAmbassadors(10),
    getNeighborhoodOfMonth(),
    viewer ? getViewerRank(viewer.id) : Promise.resolve(null),
  ]);
  return NextResponse.json({
    ambassadors,
    neighborhood_of_month: nom,
    viewer_rank: viewerRank,
  });
}
