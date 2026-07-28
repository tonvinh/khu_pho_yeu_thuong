import { NextRequest, NextResponse } from "next/server";
import { q } from "@/lib/db";
import { requireAdmin } from "@/lib/api";
import { imgUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

// Hàng chờ duyệt đề xuất + danh sách issue theo trạng thái (04 §2)
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;
  const status = req.nextUrl.searchParams.get("status") || "pending_review";
  const rows = await q(
    `SELECT i.id, i.category, i.location_text, i.description, i.status, i.pin_x, i.pin_y,
       i.photo_key, i.created_at, i.review_note,
       n.id AS neighborhood_id, n.name AS neighborhood_name,
       u.display_name AS proposer_name
     FROM issues i
     JOIN neighborhoods n ON n.id = i.neighborhood_id
     LEFT JOIN users u ON u.id = i.proposed_by
     WHERE i.status = $1
     ORDER BY i.created_at ASC`,
    [status]
  );
  return NextResponse.json({
    issues: rows.map((r) => ({ ...r, photo_url: imgUrl(r.photo_key as string | null) })),
  });
}
