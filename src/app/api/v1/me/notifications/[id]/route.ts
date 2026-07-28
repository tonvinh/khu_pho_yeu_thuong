import { NextRequest, NextResponse } from "next/server";
import { q } from "@/lib/db";
import { jsonError, requireUserWrite } from "@/lib/api";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUserWrite(req);
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const rows = await q(
    `UPDATE notifications SET seen = true WHERE id = $1 AND user_id = $2 RETURNING id`,
    [id, auth.user.id]
  );
  if (rows.length === 0) return jsonError(404, "Không tìm thấy thông báo");
  return NextResponse.json({ ok: true });
}
