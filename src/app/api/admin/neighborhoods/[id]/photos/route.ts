// Ảnh tổng quan khu phố: TỐI ĐA 4 ảnh, kích thước đồng nhất — server chuẩn hoá
// mọi ảnh về 1280×720 WebP (toCover) nên các slot luôn cùng cỡ, không tin client.
// Key có timestamp (ảnh public cache immutable 1 ngày — thay ảnh phải đổi URL).
import { NextRequest, NextResponse } from "next/server";
import { one, q } from "@/lib/db";
import { jsonError, requireAdmin } from "@/lib/api";
import { putObject, removeObject, imgUrl } from "@/lib/storage";
import { toCover } from "@/lib/stylize";

export const dynamic = "force-dynamic";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB — đồng bộ với upload bản đồ (04 §10)
const MAX_PHOTOS = 4;

// Upload/thay ảnh: form-data { file, position? (1–4) } — không gửi position → slot trống đầu tiên
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;

  const nb = await one<{ id: string }>(`SELECT id FROM neighborhoods WHERE id = $1`, [id]);
  if (!nb) return jsonError(404, "Không tìm thấy khu phố");

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return jsonError(400, "Thiếu file ảnh");
  if (file.size > MAX_SIZE) return jsonError(400, "Ảnh tối đa 10MB");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return jsonError(400, "Chỉ nhận jpg/png/webp");
  }

  const taken = await q<{ position: number; photo_key: string }>(
    `SELECT position, photo_key FROM neighborhood_photos WHERE neighborhood_id = $1 ORDER BY position`,
    [id]
  );
  let position = Number(form?.get("position") || 0);
  if (!position) {
    const used = new Set(taken.map((p) => p.position));
    position = [1, 2, 3, 4].find((p) => !used.has(p)) ?? 0;
    if (!position) return jsonError(409, `Đã đủ ${MAX_PHOTOS} ảnh — xoá hoặc thay một ảnh hiện có`);
  }
  if (!Number.isInteger(position) || position < 1 || position > MAX_PHOTOS) {
    return jsonError(400, `Vị trí ảnh phải từ 1 đến ${MAX_PHOTOS}`);
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const key = `public/neighborhoods/${id}/photo-${position}-${Date.now()}.webp`;
  await putObject(key, await toCover(buf), "image/webp");

  const old = taken.find((p) => p.position === position);
  await q(
    `INSERT INTO neighborhood_photos (neighborhood_id, photo_key, position)
     VALUES ($1,$2,$3)
     ON CONFLICT (neighborhood_id, position) DO UPDATE SET photo_key = EXCLUDED.photo_key`,
    [id, key, position]
  );
  if (old) await removeObject(old.photo_key);

  return NextResponse.json({ ok: true, position, url: imgUrl(key) }, { status: 201 });
}

// Xoá ảnh 1 slot: DELETE ?position=1..4
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const position = Number(new URL(req.url).searchParams.get("position"));
  if (!Number.isInteger(position) || position < 1 || position > MAX_PHOTOS) {
    return jsonError(400, `Vị trí ảnh phải từ 1 đến ${MAX_PHOTOS}`);
  }
  const removed = await one<{ photo_key: string }>(
    `DELETE FROM neighborhood_photos WHERE neighborhood_id = $1 AND position = $2
     RETURNING photo_key`,
    [id, position]
  );
  if (!removed) return jsonError(404, "Slot này chưa có ảnh");
  await removeObject(removed.photo_key);
  return NextResponse.json({ ok: true });
}
