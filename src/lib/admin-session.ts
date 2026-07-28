// Session admin — cookie kp_admin_session (SameSite=Strict, TTL 8h, KHÔNG gia hạn)
// Tách hoàn toàn khỏi hệ định danh SĐT public (D11).
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { q, one } from "./db";
import { newSessionToken, sha256Hex } from "./crypto";

export const ADMIN_COOKIE = "kp_admin_session";
const ADMIN_TTL_HOURS = 8;

export interface AdminUser {
  id: string;
  email: string;
  session_id: string;
}

export async function createAdminSession(adminId: string, ipHash: string | null): Promise<string> {
  const { token, tokenHash } = newSessionToken();
  await q(
    `INSERT INTO admin_sessions (admin_user_id, token_hash, expires_at, ip_hash)
     VALUES ($1, $2, now() + interval '${ADMIN_TTL_HOURS} hours', $3)`,
    [adminId, tokenHash, ipHash]
  );
  return token;
}

export function adminCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: ADMIN_TTL_HOURS * 3600,
  };
}

export async function getAdminUser(req?: NextRequest): Promise<AdminUser | null> {
  const token = req
    ? req.cookies.get(ADMIN_COOKIE)?.value
    : (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  return one<AdminUser>(
    `SELECT a.id, a.email, s.id AS session_id
     FROM admin_sessions s JOIN admin_users a ON a.id = s.admin_user_id
     WHERE s.token_hash = $1 AND NOT s.revoked AND s.expires_at > now() AND a.is_active`,
    [sha256Hex(token)]
  );
}

export async function revokeAdminSession(token: string): Promise<void> {
  await q(`UPDATE admin_sessions SET revoked = true WHERE token_hash = $1`, [sha256Hex(token)]);
}
