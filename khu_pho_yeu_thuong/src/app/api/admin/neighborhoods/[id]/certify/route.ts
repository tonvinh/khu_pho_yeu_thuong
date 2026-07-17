// Cấp chứng nhận "Khu phố biết thương" chuẩn 4N (04 §5) — admin xác nhận thủ công
import { NextRequest, NextResponse } from "next/server";
import { one, q } from "@/lib/db";
import { jsonError, requireAdmin } from "@/lib/api";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  const nb = await one<{ total: number; signed: number }>(
    `SELECT
       (SELECT count(*)::int FROM issues WHERE neighborhood_id = $1
          AND status IN ('waiting','voting','signed')) AS total,
       (SELECT count(*)::int FROM issues WHERE neighborhood_id = $1
          AND status = 'signed') AS signed`,
    [id]
  );
  if (!nb) return jsonError(404, "Không tìm thấy khu phố");
  if (body?.revoke === true) {
    await q(`UPDATE neighborhoods SET certified_4n=false, certified_at=NULL WHERE id=$1`, [id]);
    return NextResponse.json({ ok: true });
  }
  // Điều kiện: 100% biển của các vấn đề đã duyệt trong khu được treo (02 §6)
  if (nb.total === 0 || nb.signed < nb.total) {
    return jsonError(409, `Chưa đạt 100% biển đã treo (${nb.signed}/${nb.total})`);
  }
  await q(
    `UPDATE neighborhoods SET certified_4n = true,
       certified_at = COALESCE($2::date, CURRENT_DATE)
     WHERE id = $1`,
    [id, body?.certified_at || null]
  );
  return NextResponse.json({ ok: true });
}
