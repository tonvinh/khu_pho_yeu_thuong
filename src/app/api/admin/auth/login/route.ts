// Đăng nhập admin (D11): email @fpt.com (validate SERVER-SIDE) + Argon2id,
// khoá 15 phút sau 5 lần sai, lỗi chung không lộ email tồn tại, TOTP nếu đã bật.
import { NextRequest, NextResponse } from "next/server";
import { verify as argonVerify, hash as argonHash } from "@node-rs/argon2";
import { one, q } from "@/lib/db";
import { jsonError, ipHash } from "@/lib/api";
import { verifyCsrf } from "@/lib/csrf";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import { createAdminSession, adminCookieOptions, ADMIN_COOKIE } from "@/lib/admin-session";
import { createPendingTotp } from "@/lib/admin-totp";

const GENERIC_ERROR = "Email hoặc mật khẩu không đúng";
const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@fpt\.com$/;

export async function POST(req: NextRequest) {
  if (!verifyCsrf(req)) return jsonError(403, "CSRF token không hợp lệ");
  if (!rateLimit(`admin-login:${ipHash(req)}`, LIMITS.ADMIN_LOGIN_PER_IP_15MIN, LIMITS.MIN15)) {
    return jsonError(429, "Thử lại sau ít phút");
  }

  const body = await req.json().catch(() => null);
  if (!body) return jsonError(400, "Dữ liệu không hợp lệ");
  const email = String(body.email || "").toLowerCase().trim();
  const password = String(body.password || "");

  // Defense in depth: từ chối email khác đuôi @fpt.com kể cả khi tồn tại trong DB
  if (!EMAIL_RE.test(email)) return jsonError(401, GENERIC_ERROR);

  const admin = await one<{
    id: string; password_hash: string; totp_secret: string | null;
    failed_attempts: number; locked_until: string | null; is_active: boolean;
  }>(
    `SELECT id, password_hash, totp_secret, failed_attempts, locked_until, is_active
     FROM admin_users WHERE email = $1`,
    [email]
  );

  // Chạy verify với hash giả khi không tìm thấy — chống timing attack lộ email
  const dummyHash = await argonHash("dummy-password-for-timing", {
    memoryCost: 19456, timeCost: 2, parallelism: 1,
  });
  const hashToCheck = admin?.password_hash ?? dummyHash;
  const passwordOk = await argonVerify(hashToCheck, password).catch(() => false);

  if (!admin || !admin.is_active) return jsonError(401, GENERIC_ERROR);
  if (admin.locked_until && new Date(admin.locked_until) > new Date()) {
    return jsonError(423, "Tài khoản tạm khoá — thử lại sau 15 phút");
  }

  if (!passwordOk) {
    await q(
      `UPDATE admin_users SET failed_attempts = failed_attempts + 1,
         locked_until = CASE WHEN failed_attempts + 1 >= 5
           THEN now() + interval '15 minutes' ELSE locked_until END
       WHERE id = $1`,
      [admin.id]
    );
    return jsonError(401, GENERIC_ERROR);
  }

  await q(`UPDATE admin_users SET failed_attempts = 0, locked_until = NULL WHERE id = $1`, [admin.id]);

  // Đã bật TOTP → trả bước 2, chưa cấp session
  if (admin.totp_secret) {
    const token = createPendingTotp(admin.id);
    return NextResponse.json({ ok: true, totp_required: true, totp_token: token });
  }

  const token = await createAdminSession(admin.id, ipHash(req));
  await q(`UPDATE admin_users SET last_login_at = now() WHERE id = $1`, [admin.id]);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, adminCookieOptions());
  return res;
}
