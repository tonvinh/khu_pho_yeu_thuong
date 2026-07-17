// Đặt pin bằng click (toạ độ %) + upload ảnh thật địa điểm (04 §10)
import { NextRequest, NextResponse } from "next/server";
import { q, one } from "@/lib/db";
import { jsonError, requireAdmin } from "@/lib/api";
import { putObject } from "@/lib/storage";
import { toWebp } from "@/lib/stylize";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;

  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    // Upload ảnh địa điểm
    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) return jsonError(400, "Thiếu file ảnh");
    if (file.size > 10 * 1024 * 1024) return jsonError(400, "Ảnh tối đa 10MB");
    const buf = Buffer.from(await file.arrayBuffer());
    const key = `public/issues/${id}/photo.webp`;
    await putObject(key, await toWebp(buf), "image/webp");
    const rows = await q(`UPDATE issues SET photo_key = $2 WHERE id = $1 RETURNING id`, [id, key]);
    if (rows.length === 0) return jsonError(404, "Không tìm thấy vấn đề");
    return NextResponse.json({ ok: true, photo_url: `/api/img/${key}` });
  }

  const body = await req.json().catch(() => null);
  const x = Number(body?.pin_x);
  const y = Number(body?.pin_y);
  if (!(x >= 0 && x <= 100 && y >= 0 && y <= 100)) {
    return jsonError(400, "Toạ độ pin phải là % trong khoảng 0–100");
  }
  const issue = await one(
    `UPDATE issues SET pin_x = $2, pin_y = $3 WHERE id = $1 RETURNING id`,
    [id, x, y]
  );
  if (!issue) return jsonError(404, "Không tìm thấy vấn đề");
  return NextResponse.json({ ok: true });
}
