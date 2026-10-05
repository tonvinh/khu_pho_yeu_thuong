// Hình DUY NHẤT của câu duyệt (yêu cầu 3/8) — upload/thay bất kỳ lúc nào từ bảng
// quản lý; cũng chính là ảnh biển thật hiển thị ở trang share /bien/[id].
import { NextRequest, NextResponse } from "next/server";
import { q } from "@/lib/db";
import { jsonError, requireAdmin } from "@/lib/api";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import { putObject } from "@/lib/storage";
import { toWebp, ImageError } from "@/lib/stylize";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;
  if (!rateLimit(`upload:${auth.admin.id}`, LIMITS.UPLOADS_PER_ADMIN_5MIN, LIMITS.MIN5)) {
    return jsonError(429, "Tải ảnh hơi nhiều — thử lại sau ít phút nhé");
  }
  const { id } = await ctx.params;
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return jsonError(400, "Thiếu file ảnh");
  if (file.size > 10 * 1024 * 1024) return jsonError(400, "Ảnh tối đa 10MB");
  const buf = Buffer.from(await file.arrayBuffer());
  const key = `public/signs/${id}/photo.webp`;
  // Định dạng thật (magic bytes) + trần điểm ảnh kiểm trong stylize (pentest 5.2.2).
  let webp: Buffer;
  try {
    webp = await toWebp(buf);
  } catch (e) {
    if (e instanceof ImageError) return jsonError(e.status, e.message);
    throw e;
  }
  const saved = await putObject(key, webp).catch(() => null);
  if (!saved) return jsonError(500, "Không lưu được ảnh, vui lòng thử lại sau");
  const rows = await q(
    `UPDATE suggestions SET image_key = $2 WHERE id = $1 RETURNING id`,
    [id, key]
  );
  if (rows.length === 0) return jsonError(404, "Không tìm thấy câu nhắc");
  return NextResponse.json({ ok: true, image_url: `/api/img/${key}` });
}
