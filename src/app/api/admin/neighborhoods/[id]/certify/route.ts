// Cấp chứng nhận "Khu phố biết thương" chuẩn 4N (04 §5) — admin xác nhận thủ công.
// 7/9: BỎ điều kiện "100% biển đã treo". Chứng nhận là quyết định vận hành của ban tổ
// chức (có buổi trao biển ngoài đời), không phải hệ quả tự động của dữ liệu trên web —
// admin bật/tắt tự do, UI chỉ hiển thị tiến độ biển để tham khảo.
import { NextRequest, NextResponse } from "next/server";
import { one, q } from "@/lib/db";
import { jsonError, requireAdmin } from "@/lib/api";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  const nb = await one<{ id: string; deleted_at: string | null }>(
    `SELECT id, deleted_at FROM neighborhoods WHERE id = $1`, [id]
  ).catch(() => null);
  if (!nb) return jsonError(404, "Không tìm thấy khu phố");
  if (nb.deleted_at) return jsonError(409, "Khu phố đã xoá — khôi phục trước khi sửa");
  if (body?.revoke === true) {
    // Thu hồi chứng nhận — ảnh chứng nhận GIỮ NGUYÊN (độc lập trạng thái 4N từ migration 005)
    await q(
      `UPDATE neighborhoods SET certified_4n=false, certified_at=NULL WHERE id=$1`, [id]
    );
    return NextResponse.json({ ok: true });
  }
  await q(
    `UPDATE neighborhoods SET certified_4n = true,
       certified_at = COALESCE($2::date, CURRENT_DATE)
     WHERE id = $1`,
    [id, body?.certified_at || null]
  );
  return NextResponse.json({ ok: true });
}
