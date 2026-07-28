import { NextRequest, NextResponse } from "next/server";
import { authenticator } from "otplib";
import { one, q } from "@/lib/db";
import { jsonError, ipHash } from "@/lib/api";
import { verifyCsrf } from "@/lib/csrf";
import { takePendingTotp } from "@/lib/admin-totp";
import { createAdminSession, adminCookieOptions, ADMIN_COOKIE } from "@/lib/admin-session";

export async function POST(req: NextRequest) {
  if (!verifyCsrf(req)) return jsonError(403, "CSRF token không hợp lệ");
  const body = await req.json().catch(() => null);
  if (!body?.totp_token || !body?.code) return jsonError(400, "Thiếu mã xác thực");

  const adminId = takePendingTotp(String(body.totp_token));
  if (!adminId) return jsonError(401, "Phiên xác thực hết hạn — đăng nhập lại");

  const admin = await one<{ totp_secret: string | null }>(
    `SELECT totp_secret FROM admin_users WHERE id = $1 AND is_active`,
    [adminId]
  );
  if (!admin?.totp_secret) return jsonError(401, "Phiên xác thực không hợp lệ");

  const ok = authenticator.verify({ token: String(body.code), secret: admin.totp_secret });
  if (!ok) return jsonError(401, "Mã xác thực không đúng");

  const token = await createAdminSession(adminId, ipHash(req));
  await q(`UPDATE admin_users SET last_login_at = now() WHERE id = $1`, [adminId]);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, adminCookieOptions());
  return res;
}
