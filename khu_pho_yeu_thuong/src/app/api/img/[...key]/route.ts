// Stream ảnh từ MinIO. CHỈ phục vụ key prefix "public/" — ảnh bản đồ gốc nằm ở
// "private/" và chỉ truy cập qua route admin riêng (Q3, quy tắc cứng 10).
import { NextRequest, NextResponse } from "next/server";
import { getObjectBuffer } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ key: string[] }> }) {
  const { key } = await ctx.params;
  const fullKey = key.join("/");
  if (!fullKey.startsWith("public/") || fullKey.includes("..")) {
    return new NextResponse("Not found", { status: 404 });
  }
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
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
