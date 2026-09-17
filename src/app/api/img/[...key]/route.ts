// Stream ảnh từ thư mục upload (UPLOAD_DIR). CHỈ phục vụ key prefix "public/" — ảnh bản
// đồ gốc nằm ở "private/" và chỉ truy cập qua route admin riêng (Q3, quy tắc cứng 10).
// Mọi lỗi (key lạ, traversal, file thiếu, không đọc được) đều trả 404.
import { NextRequest, NextResponse } from "next/server";
import { getObjectBuffer, InvalidKeyError, isMissingFile } from "@/lib/storage";

export const dynamic = "force-dynamic";

const notFound = () => new NextResponse("Not found", { status: 404 });

export async function GET(_req: NextRequest, ctx: { params: Promise<{ key: string[] }> }) {
  const { key } = await ctx.params;
  const fullKey = key.join("/");
  if (!fullKey.startsWith("public/")) return notFound();
  try {
    const buf = await getObjectBuffer(fullKey);
    const type = fullKey.endsWith(".webp") ? "image/webp"
      : fullKey.endsWith(".png") ? "image/png" : "image/jpeg";
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (e) {
    // File thiếu / key lạ là chuyện thường; lỗi khác (EACCES, EIO trên NFS…) mới cần log.
    if (!isMissingFile(e) && !(e instanceof InvalidKeyError)) {
      console.error(`[img] đọc ảnh thất bại code=${(e as NodeJS.ErrnoException)?.code} key=${fullKey}`);
    }
    return notFound();
  }
}
