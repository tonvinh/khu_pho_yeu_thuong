// Bảng "Cây bút của khu phố" — 18/8: bỏ "Khu phố dễ thương nhất tháng" khỏi trang chủ
// (email review) nên response không còn field neighborhood_of_month.
import { NextRequest, NextResponse } from "next/server";
import { getAmbassadors, getViewerRank } from "@/lib/leaderboard";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Hạng của người xem (cookie kp_session) — hàng "Bạn đang ở hạng #N" cuối bảng
  const viewer = await getSessionUser(req);
  const [ambassadors, viewerRank] = await Promise.all([
    getAmbassadors(10),
    viewer ? getViewerRank(viewer.id) : Promise.resolve(null),
  ]);
  return NextResponse.json({ ambassadors, viewer_rank: viewerRank });
}
