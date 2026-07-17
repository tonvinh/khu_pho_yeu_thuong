import { NextRequest, NextResponse } from "next/server";
import { q } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { jsonError } from "@/lib/api";

export const dynamic = "force-dynamic";

// Banner báo tin vui in-web (Q1 — không SMS): trả thông báo chưa xem
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return jsonError(401, "Chưa định danh");
  const rows = await q(
    `SELECT id, type, ref_id, payload, created_at FROM notifications
     WHERE user_id = $1 AND NOT seen ORDER BY created_at DESC LIMIT 5`,
    [user.id]
  );
  return NextResponse.json({ notifications: rows });
}
