// Khởi tạo CSRF token (double-submit): client gọi 1 lần, đọc cookie kp_csrf gắn vào header
import { NextRequest, NextResponse } from "next/server";
import { CSRF_COOKIE, newCsrfToken, csrfCookieOptions } from "@/lib/csrf";

export async function GET(req: NextRequest) {
  const existing = req.cookies.get(CSRF_COOKIE)?.value;
  const token = existing || newCsrfToken();
  const res = NextResponse.json({ ok: true });
  if (!existing) res.cookies.set(CSRF_COOKIE, token, csrfCookieOptions());
  return res;
}
