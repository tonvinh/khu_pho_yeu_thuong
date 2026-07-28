import { NextRequest, NextResponse } from "next/server";
import { revokeAdminSession, ADMIN_COOKIE } from "@/lib/admin-session";
import { verifyCsrf } from "@/lib/csrf";
import { jsonError } from "@/lib/api";

export async function POST(req: NextRequest) {
  if (!verifyCsrf(req)) return jsonError(403, "CSRF token không hợp lệ");
  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  if (token) await revokeAdminSession(token);
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}
