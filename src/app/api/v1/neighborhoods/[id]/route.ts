import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { loadNeighborhoodDetail } from "@/lib/neighborhood";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

// Hồ sơ khu phố: ảnh + tiến độ chứng nhận 4N (02 §6) + danh sách câu nhắc.
// Popup khu phố ở trang chủ (NeighborhoodModal) gọi route này bằng SLUG.
// Cần người xem để đánh dấu câu đã bình chọn / câu của chính mình (Figma 2/9 · B9).
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const viewer = await getSessionUser(req);
  const nb = await loadNeighborhoodDetail(id, viewer?.id ?? null);
  if (!nb) return jsonError(404, "Không tìm thấy khu phố");
  return NextResponse.json({ neighborhood: nb });
}
