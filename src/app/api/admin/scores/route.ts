// Sổ cái điểm chi tiết từng user (04 §8) — phục vụ giải trình khi trao giải Đại sứ
import { NextRequest, NextResponse } from "next/server";
import { q } from "@/lib/db";
import { requireAdmin } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;
  const userId = req.nextUrl.searchParams.get("user");

  if (userId) {
    const events = await q(
      `SELECT id, type, points, ref_id, is_valid, created_at
       FROM score_events WHERE user_id = $1 ORDER BY created_at DESC LIMIT 500`,
      [userId]
    );
    return NextResponse.json({ events });
  }

  const users = await q(
    `SELECT u.id, u.display_name, u.is_shadow_banned, n.name AS neighborhood_name,
       COALESCE(sum(e.points) FILTER (WHERE e.is_valid), 0)::int AS score,
       count(e.id)::int AS event_count
     FROM users u
     LEFT JOIN neighborhoods n ON n.id = u.neighborhood_id
     LEFT JOIN score_events e ON e.user_id = u.id
     GROUP BY u.id, u.display_name, u.is_shadow_banned, n.name
     HAVING count(e.id) > 0
     ORDER BY score DESC LIMIT 100`
  );
  return NextResponse.json({ users });
}
