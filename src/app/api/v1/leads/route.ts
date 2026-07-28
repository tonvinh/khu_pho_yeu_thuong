// Lead tầng 2 — section "Ưu đãi cư dân" (02 §7.2).
// Server đối chiếu hash SĐT nhập vào với định danh cookie (02 §8.3):
// lệch → 409 kèm luồng xác nhận chuyển định danh; không bao giờ ghi chéo tài khoản.
import { NextRequest, NextResponse } from "next/server";
import { one, q } from "@/lib/db";
import { jsonError, requireUserWrite, ipHash, uaHash } from "@/lib/api";
import { normalizePhone, looksFake, maskPhone } from "@/lib/phone";
import { phoneHash, encryptPhone, randomSlug } from "@/lib/crypto";
import { createSession, sessionCookieOptions, SESSION_COOKIE } from "@/lib/session";
import { INTERESTS } from "@/lib/taxonomy";

export async function POST(req: NextRequest) {
  const auth = await requireUserWrite(req);
  if ("error" in auth) return auth.error;
  const user = auth.user;

  const body = await req.json().catch(() => null);
  if (!body) return jsonError(400, "Dữ liệu không hợp lệ");

  const { name, phone, neighborhood_text, interests, opted_in, confirm_switch } = body;

  // Lead chỉ ghi khi opt-in (quy tắc cứng 5) — checkbox mặc định KHÔNG tick
  if (opted_in !== true) {
    return jsonError(400, "Cần tick đồng ý nhận ưu đãi thì tụi mình mới lưu số nhé");
  }

  const normalized = normalizePhone(String(phone || ""));
  if (!normalized || looksFake(normalized)) {
    return jsonError(400, "Số điện thoại chưa đúng — kiểm tra lại giúp mình nhé");
  }

  const hash = phoneHash(normalized);
  let leadUserId = user.id;
  let switched = false;
  let sessionToken: string | null = null;

  if (hash !== user.phone_hash) {
    // SĐT nhập lệch với định danh cookie
    if (confirm_switch !== true) {
      return jsonError(409, "Số này khác với số bạn đã dùng. Bạn muốn tiếp tục với số mới?", {
        need_confirm_switch: true,
      });
    }
    // Chuyển định danh sang tài khoản của số mới (02 §8.3) — không gộp dữ liệu
    const other = await one<{ id: string }>(`SELECT id FROM users WHERE phone_hash = $1`, [hash]);
    if (other) {
      leadUserId = other.id;
    } else {
      const created = await one<{ id: string }>(
        `INSERT INTO users (phone_hash, display_name, share_slug, last_login_at)
         VALUES ($1, $2, $3, now()) RETURNING id`,
        [hash, String(name || "Cư dân").trim().slice(0, 120) || "Cư dân", randomSlug()]
      );
      leadUserId = created!.id;
    }
    sessionToken = await createSession(leadUserId, ipHash(req), uaHash(req));
    switched = true;
  }

  const validInterests = Array.isArray(interests)
    ? interests.filter((i: string) => i in INTERESTS)
    : [];

  await q(
    `INSERT INTO leads (name, phone_encrypted, phone_masked, phone_hash, neighborhood_text,
       interests, source, opted_in, user_id)
     VALUES ($1,$2,$3,$4,$5,$6,'active_section', true, $7)`,
    [String(name || "").trim().slice(0, 200) || null, encryptPhone(normalized),
     maskPhone(normalized), hash, String(neighborhood_text || "").trim().slice(0, 300) || null,
     validInterests, leadUserId]
  );
  await q(
    `UPDATE users SET phone_encrypted = $2,
       phone_purpose = array_append(array_remove(phone_purpose, 'lead'), 'lead')
     WHERE id = $1`,
    [leadUserId, encryptPhone(normalized)]
  );

  const res = NextResponse.json({ ok: true, switched });
  if (sessionToken) res.cookies.set(SESSION_COOKIE, sessionToken, sessionCookieOptions());
  return res;
}
