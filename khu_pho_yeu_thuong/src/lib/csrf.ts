// CSRF double-submit token — bắt buộc cho mọi POST/PATCH vì auth dựa cookie (07 §2.1)
import type { NextRequest } from "next/server";
import { randomBytes, timingSafeEqual } from "node:crypto";

export const CSRF_COOKIE = "kp_csrf";
export const CSRF_HEADER = "x-csrf-token";

export function newCsrfToken(): string {
  return randomBytes(24).toString("base64url");
}

/** Cookie CSRF KHÔNG HttpOnly (client đọc để gắn header) — an toàn vì token không phải secret phiên */
export function csrfCookieOptions() {
  return {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 24 * 3600,
  };
}

export function verifyCsrf(req: NextRequest): boolean {
  const cookie = req.cookies.get(CSRF_COOKIE)?.value;
  const header = req.headers.get(CSRF_HEADER);
  if (!cookie || !header) return false;
  const a = Buffer.from(cookie);
  const b = Buffer.from(header);
  return a.length === b.length && timingSafeEqual(a, b);
}
