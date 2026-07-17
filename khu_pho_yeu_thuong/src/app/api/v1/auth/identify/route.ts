// Định danh KHÔNG OTP (02 §8): SĐT → HMAC-SHA256+PEPPER → upsert user → cookie phiên.
// Response KHÔNG BAO GIỜ trả lại SĐT hay hash (quy tắc cứng 3b).
import { NextRequest, NextResponse } from "next/server";
import { one, q } from "@/lib/db";
import { normalizePhone, looksFake } from "@/lib/phone";
import { phoneHash, randomSlug, encryptPhone } from "@/lib/crypto";
import { createSession, sessionCookieOptions, SESSION_COOKIE } from "@/lib/session";
import { verifyCsrf } from "@/lib/csrf";
import { jsonError, ipHash, uaHash } from "@/lib/api";
import { rateLimit, LIMITS } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  if (!verifyCsrf(req)) return jsonError(403, "CSRF token không hợp lệ");

  const body = await req.json().catch(() => null);
  if (!body) return jsonError(400, "Dữ liệu không hợp lệ");
  const { phone, display_name, neighborhood_id } = body;

  const normalized = normalizePhone(String(phone || ""));
  if (!normalized) return jsonError(400, "Số điện thoại chưa đúng — kiểm tra lại giúp mình nhé");
  if (looksFake(normalized)) return jsonError(400, "Số điện thoại chưa đúng — kiểm tra lại giúp mình nhé");

  const hash = phoneHash(normalized);
  const ip = ipHash(req);
  const ua = uaHash(req);

  const existing = await one<{ id: string; display_name: string }>(
    `SELECT id, display_name FROM users WHERE phone_hash = $1`,
    [hash]
  );

  let userId: string;
  if (existing) {
    userId = existing.id;
    // Cập nhật hồ sơ nếu có gửi kèm
    if (display_name?.trim() || neighborhood_id) {
      await q(
        `UPDATE users SET
           display_name = COALESCE(NULLIF($2, ''), display_name),
           neighborhood_id = COALESCE($3, neighborhood_id),
           last_login_at = now()
         WHERE id = $1`,
        [userId, (display_name || "").trim().slice(0, 120), neighborhood_id || null]
      );
    } else {
      await q(`UPDATE users SET last_login_at = now() WHERE id = $1`, [userId]);
    }
  } else {
    // Rate limit TẠO ĐỊNH DANH MỚI: 3 SĐT mới/thiết bị+IP/giờ (02 §8.4)
    if (!rateLimit(`identify:${ip}:${ua}`, LIMITS.IDENTIFY_PER_DEVICE_HOUR, LIMITS.HOUR)) {
      return jsonError(429, "Tạo định danh hơi nhiều — thử lại sau 1 giờ nhé");
    }
    if (!display_name?.trim()) return jsonError(400, "Cho xóm biết tên bạn với nhé");
    const created = await one<{ id: string }>(
      `INSERT INTO users (phone_hash, display_name, share_slug, neighborhood_id, last_login_at)
       VALUES ($1, $2, $3, $4, now()) RETURNING id`,
      [hash, display_name.trim().slice(0, 120), randomSlug(), neighborhood_id || null]
    );
    userId = created!.id;
  }

  // SĐT mã hoá gắn với phiên (server-side) — chỉ dùng tạo lead tầng 1 khi opt-in
  const token = await createSession(userId, ip, ua, encryptPhone(normalized));
  const me = await one(
    `SELECT u.display_name, u.share_slug, u.neighborhood_id, n.name AS neighborhood_name
     FROM users u LEFT JOIN neighborhoods n ON n.id = u.neighborhood_id WHERE u.id = $1`,
    [userId]
  );

  const res = NextResponse.json({ ok: true, me });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}
