// Kiểm chứng pentest 5.1.1 trên môi trường thật: app đang coi IP nào là IP của mình.
// Mở bằng trình duyệt khi đã đăng nhập admin, rồi gửi lại kèm `X-Forwarded-For: 1.2.3.4`
// — `resolved_ip` PHẢI giữ nguyên. Chỉ trả về thông tin của CHÍNH request admin này.
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, clientIp } from "@/lib/api";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;
  const hops = env.TRUSTED_PROXY_HOPS;
  return NextResponse.json(
    {
      resolved_ip: clientIp(req),
      mode: hops ? `TRUSTED_PROXY_HOPS=${hops}` : "auto (IP công khai đầu tiên tính từ phải)",
      x_forwarded_for: req.headers.get("x-forwarded-for"),
      x_real_ip: req.headers.get("x-real-ip"),
    },
    { headers: { "cache-control": "no-store" } }
  );
}
