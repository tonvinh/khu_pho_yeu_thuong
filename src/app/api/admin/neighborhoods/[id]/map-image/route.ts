// Upload ảnh bản đồ GỐC (Q3): lưu private/, render bản cách điệu tự động → public/
import { NextRequest, NextResponse } from "next/server";
import { one, q } from "@/lib/db";
import { jsonError, requireAdmin } from "@/lib/api";
import { putObject, getObjectBuffer } from "@/lib/storage";
import { stylizeMap, toWebp } from "@/lib/stylize";

export const dynamic = "force-dynamic";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB (04 §10)

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

  const buf = Buffer.from(await file.arrayBuffer());
  const originalKey = `private/maps/${id}/original.webp`;
  const stylizedKey = `public/maps/${id}/stylized.webp`;

  await putObject(originalKey, await toWebp(buf, 2400, 90), "image/webp");
  await putObject(stylizedKey, await stylizeMap(buf), "image/webp");

  // Thay ảnh: pins giữ nguyên toạ độ %, admin được cảnh báo kiểm tra lại (04 §10)
  await q(
    `UPDATE neighborhoods SET map_image_key = $2, map_stylized_key = $3 WHERE id = $1`,
    [id, originalKey, stylizedKey]
  );
  return NextResponse.json({ ok: true, stylized_url: `/api/img/${stylizedKey}` });
}

// Admin xem ảnh gốc (public không bao giờ truy cập được private/)
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const nb = await one<{ map_image_key: string | null }>(
    `SELECT map_image_key FROM neighborhoods WHERE id = $1`, [id]
  );
  if (!nb?.map_image_key) return jsonError(404, "Chưa có ảnh bản đồ");
  try {
    const buf = await getObjectBuffer(nb.map_image_key);
    return new NextResponse(new Uint8Array(buf), {
      headers: { "Content-Type": "image/webp", "Cache-Control": "private, no-store" },
    });
  } catch {
    return jsonError(404, "Không đọc được ảnh");
  }
}
