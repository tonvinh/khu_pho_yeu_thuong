import { NextRequest, NextResponse } from "next/server";
import { one, q } from "@/lib/db";
import { jsonError, requireAdmin } from "@/lib/api";
import { decryptPhone } from "@/lib/crypto";

export const dynamic = "force-dynamic";

// Bấm-để-hiện SĐT — có audit log (07 §2.1 PDPD)
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const lead = await one<{ id: string; phone_encrypted: Buffer }>(
    `SELECT id, phone_encrypted FROM leads WHERE id = $1 AND opted_in`,
    [id]
  );
  if (!lead) return jsonError(404, "Không tìm thấy lead");
  await q(
    `INSERT INTO audit_logs (admin_user_id, action, ref_id) VALUES ($1, 'lead_phone_reveal', $2)`,
    [auth.admin.id, id]
  );
  return NextResponse.json({ phone: decryptPhone(lead.phone_encrypted) });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const status = body?.status as string;
  if (status && !["new", "contacted", "converted", "closed"].includes(status)) {
    return jsonError(400, "Trạng thái không hợp lệ");
  }
  const rows = await q(
    `UPDATE leads SET status = COALESCE($2, status), note = COALESCE($3, note)
     WHERE id = $1 RETURNING id`,
    [id, status || null, body?.note != null ? String(body.note).slice(0, 1000) : null]
  );
  if (rows.length === 0) return jsonError(404, "Không tìm thấy lead");
  return NextResponse.json({ ok: true });
}
