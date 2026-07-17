// Upload ảnh biển thực tế (bước installed — 04 §4)
import { NextRequest, NextResponse } from "next/server";
import { q } from "@/lib/db";
import { jsonError, requireAdmin } from "@/lib/api";
import { putObject } from "@/lib/storage";
import { toWebp } from "@/lib/stylize";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return jsonError(400, "Thiếu file ảnh");
  if (file.size > 10 * 1024 * 1024) return jsonError(400, "Ảnh tối đa 10MB");
  const buf = Buffer.from(await file.arrayBuffer());
  const key = `public/signs/${id}/photo.webp`;
  await putObject(key, await toWebp(buf), "image/webp");
  const rows = await q(
    `UPDATE suggestions SET sign_photo_key = $2 WHERE id = $1 RETURNING id`,
    [id, key]
  );
  if (rows.length === 0) return jsonError(404, "Không tìm thấy câu nhắc");
  return NextResponse.json({ ok: true, sign_photo_url: `/api/img/${key}` });
}
