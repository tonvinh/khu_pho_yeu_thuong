// Ảnh chứng nhận "Khu phố biết thương" chuẩn 4N: TỐI ĐA 1 ảnh, upload được bất kỳ
// lúc nào — KHÔNG phụ thuộc trạng thái đạt chuẩn (migration 005 bỏ ràng buộc);
// thu hồi chứng nhận cũng không xoá ảnh.
import { NextRequest, NextResponse } from "next/server";
import { one, q } from "@/lib/db";
import { jsonError, requireAdmin } from "@/lib/api";
import { putObject, removeObject, imgUrl } from "@/lib/storage";
import { toWebp } from "@/lib/stylize";

export const dynamic = "force-dynamic";

const MAX_SIZE = 10 * 1024 * 1024;

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;

  const nb = await one<{ certificate_photo_key: string | null }>(
    `SELECT certificate_photo_key FROM neighborhoods WHERE id = $1`, [id]
  );
  if (!nb) return jsonError(404, "Không tìm thấy khu phố");

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return jsonError(400, "Thiếu file ảnh");
  if (file.size > MAX_SIZE) return jsonError(400, "Ảnh tối đa 10MB");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return jsonError(400, "Chỉ nhận jpg/png/webp");
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const key = `public/neighborhoods/${id}/certificate-${Date.now()}.webp`;
  await putObject(key, await toWebp(buf, 1600, 85), "image/webp");
  await q(`UPDATE neighborhoods SET certificate_photo_key = $2 WHERE id = $1`, [id, key]);
  if (nb.certificate_photo_key) await removeObject(nb.certificate_photo_key);

  return NextResponse.json({ ok: true, url: imgUrl(key) }, { status: 201 });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const nb = await one<{ certificate_photo_key: string | null }>(
    `SELECT certificate_photo_key FROM neighborhoods WHERE id = $1`, [id]
  );
  if (!nb) return jsonError(404, "Không tìm thấy khu phố");
  await q(`UPDATE neighborhoods SET certificate_photo_key = NULL WHERE id = $1`, [id]);
  if (nb.certificate_photo_key) await removeObject(nb.certificate_photo_key);
  return NextResponse.json({ ok: true });
}
