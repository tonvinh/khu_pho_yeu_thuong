import { NextRequest, NextResponse } from "next/server";
import { one, q } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { jsonError, requireUserWrite } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return jsonError(401, "Chưa định danh");
  const me = await one(
    `SELECT u.display_name, u.share_slug, u.neighborhood_id, n.name AS neighborhood_name,
       COALESCE((SELECT sum(points)::int FROM score_events
                 WHERE user_id = u.id AND is_valid), 0) AS score
     FROM users u LEFT JOIN neighborhoods n ON n.id = u.neighborhood_id
     WHERE u.id = $1`,
    [user.id]
  );
  return NextResponse.json({ me });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireUserWrite(req);
  if ("error" in auth) return auth.error;
  const body = await req.json().catch(() => null);
  if (!body) return jsonError(400, "Dữ liệu không hợp lệ");
  await q(
    `UPDATE users SET
       display_name = COALESCE(NULLIF($2,''), display_name),
       neighborhood_id = COALESCE($3, neighborhood_id)
     WHERE id = $1`,
    [auth.user.id, (body.display_name || "").trim().slice(0, 120), body.neighborhood_id || null]
  );
  return NextResponse.json({ ok: true });
}
