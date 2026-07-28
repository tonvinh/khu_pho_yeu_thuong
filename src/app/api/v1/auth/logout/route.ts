import { NextRequest, NextResponse } from "next/server";
import { revokeSession, SESSION_COOKIE } from "@/lib/session";
import { verifyCsrf } from "@/lib/csrf";
import { jsonError } from "@/lib/api";

export async function POST(req: NextRequest) {
  if (!verifyCsrf(req)) return jsonError(403, "CSRF token không hợp lệ");
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token) await revokeSession(token);
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
