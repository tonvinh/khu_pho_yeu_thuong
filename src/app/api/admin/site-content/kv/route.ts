// Ảnh KV chiến dịch (khu "Câu chuyện Khu phố biết thương" trang chủ) — 1 ảnh duy nhất.
// Giữ nguyên tỷ lệ ảnh gốc (KV có thể đứng/ngang tuỳ thiết kế), chỉ resize + WebP.
// Key có timestamp (ảnh public cache immutable — thay ảnh phải đổi URL); lưu key vào
// site_content row SITE_KV_KEY. Xoá row = trang chủ quay về placeholder demo.
import { NextRequest, NextResponse } from "next/server";
import { one, q } from "@/lib/db";
import { jsonError, requireAdmin } from "@/lib/api";
import { imgUrl, putObject, removeObject } from "@/lib/storage";
import { toWebp } from "@/lib/stylize";
import { SITE_KV_KEY } from "@/lib/site-content";

export const dynamic = "force-dynamic";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB — đồng bộ các upload ảnh admin khác

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return jsonError(400, "Thiếu file ảnh");
  if (file.size > MAX_SIZE) return jsonError(400, "Ảnh tối đa 10MB");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return jsonError(400, "Chỉ nhận jpg/png/webp");
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const key = `public/site/campaign-kv-${Date.now()}.webp`;
  await putObject(key, await toWebp(buf, 1600), "image/webp");

  const old = await one<{ value: string }>(`SELECT value FROM site_content WHERE key = $1`, [SITE_KV_KEY]);
  await q(
    `INSERT INTO site_content (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [SITE_KV_KEY, key]
  );
  if (old) await removeObject(old.value);

  return NextResponse.json({ ok: true, kv_url: imgUrl(key) }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;

  const removed = await one<{ value: string }>(
    `DELETE FROM site_content WHERE key = $1 RETURNING value`,
    [SITE_KV_KEY]
  );
  if (!removed) return jsonError(404, "Chưa có ảnh KV");
  await removeObject(removed.value);
  return NextResponse.json({ ok: true });
}
