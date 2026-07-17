// Session định danh public — cookie kp_session (HttpOnly, Secure, SameSite=Lax, 180 ngày)
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { q, one } from "./db";
import { newSessionToken, sha256Hex } from "./crypto";

export const SESSION_COOKIE = "kp_session";
const SESSION_TTL_DAYS = 180;

export interface SessionUser {
  id: string;
  phone_hash: string;
  display_name: string;
  share_slug: string;
  neighborhood_id: string | null;
  is_shadow_banned: boolean;
  session_id: string;
}

export async function createSession(
  userId: string,
  ipHash: string | null,
  uaHash: string | null,
  phoneEncrypted?: Buffer | null
): Promise<string> {
  const { token, tokenHash } = newSessionToken();
  await q(
    `INSERT INTO sessions (user_id, token_hash, expires_at, ip_hash, ua_hash, phone_encrypted)
     VALUES ($1, $2, now() + interval '${SESSION_TTL_DAYS} days', $3, $4, $5)`,
    [userId, tokenHash, ipHash, uaHash, phoneEncrypted ?? null]
  );
  return token;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 3600,
  };
}

export async function getSessionUser(req?: NextRequest): Promise<SessionUser | null> {
  const token = req
    ? req.cookies.get(SESSION_COOKIE)?.value
    : (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const tokenHash = sha256Hex(token);
  const row = await one<SessionUser & { expires_at: string }>(
    `SELECT u.id, u.phone_hash, u.display_name, u.share_slug, u.neighborhood_id,
            u.is_shadow_banned, s.id AS session_id
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND NOT s.revoked AND s.expires_at > now()`,
    [tokenHash]
  );
  if (!row) return null;
  // Gia hạn theo hoạt động (không await để không chậm request)
  void q(
    `UPDATE sessions SET last_seen_at = now(),
       expires_at = now() + interval '${SESSION_TTL_DAYS} days'
     WHERE id = $1`,
    [row.session_id]
  ).catch(() => {});
  return row;
}

export async function revokeSession(token: string): Promise<void> {
  await q(`UPDATE sessions SET revoked = true WHERE token_hash = $1`, [sha256Hex(token)]);
}
