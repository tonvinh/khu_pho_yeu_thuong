import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { loadNeighborhoodDetail } from "@/lib/neighborhood";

export const dynamic = "force-dynamic";

// Hồ sơ khu phố: tiến độ chứng nhận 4N (02 §6) + ảnh + biển đã có.
// Popup khu phố ở trang chủ (NeighborhoodModal) gọi route này bằng SLUG.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const nb = await loadNeighborhoodDetail(id);
  if (!nb) return jsonError(404, "Không tìm thấy khu phố");
  return NextResponse.json({ neighborhood: nb });
}
