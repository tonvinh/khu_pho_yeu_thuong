// Helpers cho route handlers: auth, CSRF, rate limit, IP/UA hash, response chuẩn
import { NextRequest, NextResponse } from "next/server";
import { sha256Hex } from "./crypto";
import { verifyCsrf } from "./csrf";
import { getSessionUser, type SessionUser } from "./session";
import { getAdminUser, type AdminUser } from "./admin-session";
import { rateLimit, LIMITS } from "./rate-limit";

export function jsonError(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "0.0.0.0"
  );
}

export function ipHash(req: NextRequest): string {
  return sha256Hex("ip:" + clientIp(req));
}

export function uaHash(req: NextRequest): string {
  return sha256Hex("ua:" + (req.headers.get("user-agent") || ""));
}

/** Guard chung cho mọi hành động ghi của cư dân: session + CSRF + rate limit */
export async function requireUserWrite(
  req: NextRequest
): Promise<{ user: SessionUser } | { error: NextResponse }> {
  if (!verifyCsrf(req)) return { error: jsonError(403, "CSRF token không hợp lệ") };
  const user = await getSessionUser(req);
  if (!user) return { error: jsonError(401, "Cần định danh trước khi thực hiện") };
  if (!rateLimit(`write:${user.id}`, LIMITS.WRITES_PER_USER_HOUR, LIMITS.HOUR)) {
    return { error: jsonError(429, "Bạn thao tác hơi nhanh — nghỉ chút rồi quay lại nhé") };
  }
  return { user };
}

/** Guard cho API admin: session admin + CSRF với mọi method ghi */
export async function requireAdmin(
  req: NextRequest
): Promise<{ admin: AdminUser } | { error: NextResponse }> {
  const admin = await getAdminUser(req);
  if (!admin) return { error: jsonError(401, "Chưa đăng nhập admin") };
  if (req.method !== "GET" && !verifyCsrf(req)) {
    return { error: jsonError(403, "CSRF token không hợp lệ") };
  }
  return { admin };
}
