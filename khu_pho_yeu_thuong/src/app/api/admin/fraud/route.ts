// Chống gian lận (04 §7, 03 §5): heuristics gắn cờ — xử lý IM LẶNG
import { NextRequest, NextResponse } from "next/server";
import { q } from "@/lib/db";
import { requireAdmin } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;

  // Cụm tài khoản đăng ký cùng IP (qua ip_hash session) trong 24h
  const ipClusters = await q(
    `SELECT s.ip_hash, count(DISTINCT s.user_id)::int AS accounts,
       array_agg(DISTINCT u.display_name) AS names,
       array_agg(DISTINCT u.id::text) AS user_ids
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.created_at > now() - interval '24 hours' AND s.ip_hash IS NOT NULL
     GROUP BY s.ip_hash HAVING count(DISTINCT s.user_id) >= 3
     ORDER BY accounts DESC LIMIT 20`
  );

  // Một người nhận thương hàng loạt từ tài khoản mới (<48h tuổi)
  const burstTargets = await q(
    `SELECT u.id AS author_id, u.display_name, count(v.id)::int AS votes_from_new_accounts
     FROM votes v
     JOIN suggestions s ON s.id = v.suggestion_id
     JOIN users u ON u.id = s.author_id
     JOIN users voter ON voter.id = v.user_id
     WHERE v.created_at > now() - interval '48 hours'
       AND voter.created_at > now() - interval '48 hours' AND v.is_valid
     GROUP BY u.id, u.display_name
     HAVING count(v.id) >= 10
     ORDER BY votes_from_new_accounts DESC LIMIT 20`
  );

  // Tốc độ vote bất thường: >20 vote/giờ từ 1 tài khoản
  const fastVoters = await q(
    `SELECT u.id AS user_id, u.display_name, u.is_shadow_banned, count(v.id)::int AS votes_last_hour
     FROM votes v JOIN users u ON u.id = v.user_id
     WHERE v.created_at > now() - interval '1 hour'
     GROUP BY u.id, u.display_name, u.is_shadow_banned
     HAVING count(v.id) >= 20 ORDER BY votes_last_hour DESC LIMIT 20`
  );

  return NextResponse.json({ ipClusters, burstTargets, fastVoters });
}

// Hành động: vô hiệu phiếu / shadow-ban — không thông báo, không đổi UI phía user
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;
  const body = await req.json().catch(() => null);
  const action = body?.action as string;
  const userId = body?.user_id as string;
  if (!userId) return NextResponse.json({ error: "Thiếu user_id" }, { status: 400 });

  if (action === "shadow_ban" || action === "unban") {
    await q(`UPDATE users SET is_shadow_banned = $2 WHERE id = $1`, [userId, action === "shadow_ban"]);
    return NextResponse.json({ ok: true });
  }
  if (action === "invalidate_votes") {
    // Vô hiệu phiếu user này đã bấm + thu hồi ĐÚNG 1 event điểm cho mỗi phiếu
    await q(
      `UPDATE score_events SET is_valid = false
       WHERE id IN (
         SELECT (SELECT se.id FROM score_events se
                 WHERE se.type = 'vote_received' AND se.ref_id = v.suggestion_id
                   AND se.user_id = s.author_id AND se.is_valid
                 ORDER BY se.created_at DESC LIMIT 1)
         FROM votes v JOIN suggestions s ON s.id = v.suggestion_id
         WHERE v.user_id = $1 AND v.is_valid
       )`,
      [userId]
    );
    await q(`UPDATE votes SET is_valid = false WHERE user_id = $1 AND is_valid`, [userId]);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Hành động không hợp lệ" }, { status: 400 });
}
