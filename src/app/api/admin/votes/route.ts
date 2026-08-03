// Theo dõi thương (admin): câu được thương + người được thương, cho phép SỬA số lượt.
// Điều chỉnh tăng = chèn phiếu votes source='admin' (user_id NULL) → mọi query đếm votes
// hiện có tự đúng. Điều chỉnh giảm = xoá phiếu admin trước, rồi vô hiệu phiếu cư dân mới
// nhất (is_valid=false — giữ bản ghi để trạng thái toggle của người bấm không đổi).
// Điểm luôn đi kèm qua sổ cái score_events (score-service), mỗi phiếu = 1 event.
import { NextRequest, NextResponse } from "next/server";
import type { PoolClient } from "pg";
import { q, tx } from "@/lib/db";
import { jsonError, requireAdmin } from "@/lib/api";
import {
  recordVoteReceivedBulk,
  invalidateVoteReceivedBulk,
} from "@/lib/score-service";

export const dynamic = "force-dynamic";

// Trạng thái câu đang/đã nhận thương — trùng với điều kiện ở API vote public
const VOTABLE = ["approved", "selected", "produced", "installed"];
const MAX_VOTES = 100000;

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;

  const suggestions = await q(
    `SELECT s.id, s.content, s.status, s.created_at,
       u.id AS author_id, u.display_name AS author_name, u.is_shadow_banned,
       i.location_text, n.name AS neighborhood_name,
       (SELECT count(*)::int FROM votes v WHERE v.suggestion_id = s.id AND v.is_valid) AS votes,
       (SELECT count(*)::int FROM votes v
        WHERE v.suggestion_id = s.id AND v.is_valid AND v.source = 'admin') AS admin_votes
     FROM suggestions s
     JOIN users u ON u.id = s.author_id
     JOIN issues i ON i.id = s.issue_id
     JOIN neighborhoods n ON n.id = i.neighborhood_id
     WHERE s.status = ANY($1)
     ORDER BY votes DESC, s.created_at ASC
     LIMIT 300`,
    [VOTABLE]
  );

  const users = await q(
    `SELECT u.id, u.display_name, u.is_shadow_banned, n.name AS neighborhood_name,
       count(DISTINCT s.id)::int AS suggestion_count,
       count(v.id) FILTER (WHERE v.is_valid)::int AS votes,
       count(v.id) FILTER (WHERE v.is_valid AND v.source = 'admin')::int AS admin_votes
     FROM users u
     JOIN suggestions s ON s.author_id = u.id AND s.status = ANY($1)
     LEFT JOIN neighborhoods n ON n.id = u.neighborhood_id
     LEFT JOIN votes v ON v.suggestion_id = s.id
     GROUP BY u.id, u.display_name, u.is_shadow_banned, n.name
     ORDER BY votes DESC, min(u.created_at) ASC
     LIMIT 300`,
    [VOTABLE]
  );

  return NextResponse.json({ suggestions, users });
}

/** Gỡ bớt `count` phiếu hợp lệ khỏi tập câu — phiếu admin xoá hẳn, phiếu cư dân vô hiệu */
async function removeVotes(
  c: PoolClient,
  suggestionIds: string[],
  count: number
): Promise<void> {
  const picked = await c.query(
    `SELECT v.id, v.suggestion_id, v.source, s.author_id
     FROM votes v JOIN suggestions s ON s.id = v.suggestion_id
     WHERE v.suggestion_id = ANY($1) AND v.is_valid
     ORDER BY (v.source = 'admin') DESC, v.created_at DESC
     LIMIT $2`,
    [suggestionIds, count]
  );
  const adminIds = picked.rows.filter((r) => r.source === "admin").map((r) => r.id);
  const userIds = picked.rows.filter((r) => r.source !== "admin").map((r) => r.id);
  if (adminIds.length) await c.query(`DELETE FROM votes WHERE id = ANY($1)`, [adminIds]);
  if (userIds.length) {
    await c.query(`UPDATE votes SET is_valid = false WHERE id = ANY($1)`, [userIds]);
  }
  // Thu hồi đúng 1 event điểm cho mỗi phiếu gỡ, gom theo câu (ref_id = suggestion_id)
  const bySuggestion = new Map<string, { authorId: string; n: number }>();
  for (const r of picked.rows) {
    const cur = bySuggestion.get(r.suggestion_id);
    if (cur) cur.n += 1;
    else bySuggestion.set(r.suggestion_id, { authorId: r.author_id, n: 1 });
  }
  for (const [sid, { authorId, n }] of bySuggestion) {
    await invalidateVoteReceivedBulk(c, authorId, sid, n);
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;
  const body = await req.json().catch(() => null);
  const suggestionId = typeof body?.suggestion_id === "string" ? body.suggestion_id : null;
  const userId = typeof body?.user_id === "string" ? body.user_id : null;
  const target = body?.votes;

  if (!Number.isInteger(target) || target < 0 || target > MAX_VOTES) {
    return jsonError(400, `Số thương phải là số nguyên 0–${MAX_VOTES}`);
  }
  if ((suggestionId ? 1 : 0) + (userId ? 1 : 0) !== 1) {
    return jsonError(400, "Cần đúng một trong hai: suggestion_id hoặc user_id");
  }

  try {
    const result = await tx(async (c) => {
      if (suggestionId) {
        const s = await c.query(
          `SELECT s.id, s.author_id FROM suggestions s
           WHERE s.id = $1 AND s.status = ANY($2) FOR UPDATE`,
          [suggestionId, VOTABLE]
        );
        const sugg = s.rows[0];
        if (!sugg) throw new Error("NOT_FOUND");
        const cnt = await c.query(
          `SELECT count(*)::int AS n FROM votes WHERE suggestion_id = $1 AND is_valid`,
          [suggestionId]
        );
        const current: number = cnt.rows[0].n;
        if (target > current) {
          await c.query(
            `INSERT INTO votes (suggestion_id, user_id, is_valid, source)
             SELECT $1, NULL, true, 'admin' FROM generate_series(1, $2)`,
            [suggestionId, target - current]
          );
          await recordVoteReceivedBulk(c, sugg.author_id, suggestionId, target - current);
        } else if (target < current) {
          await removeVotes(c, [suggestionId], current - target);
        }
        return { from: current, to: target, ref: suggestionId };
      }

      // Theo người nhận: tổng thương trên mọi câu của họ. Tăng → dồn phiếu admin vào
      // câu cao phiếu nhất; giảm → gỡ phiếu mới nhất trên toàn bộ câu (admin trước).
      const su = await c.query(
        `SELECT s.id,
           (SELECT count(*)::int FROM votes v WHERE v.suggestion_id = s.id AND v.is_valid) AS votes
         FROM suggestions s
         WHERE s.author_id = $1 AND s.status = ANY($2)
         ORDER BY votes DESC, s.created_at ASC
         FOR UPDATE OF s`,
        [userId, VOTABLE]
      );
      if (su.rowCount === 0) throw new Error("NO_SUGGESTION");
      const current = su.rows.reduce((sum: number, r) => sum + r.votes, 0);
      if (target > current) {
        const topId = su.rows[0].id;
        await c.query(
          `INSERT INTO votes (suggestion_id, user_id, is_valid, source)
           SELECT $1, NULL, true, 'admin' FROM generate_series(1, $2)`,
          [topId, target - current]
        );
        await recordVoteReceivedBulk(c, userId!, topId, target - current);
      } else if (target < current) {
        await removeVotes(c, su.rows.map((r) => r.id), current - target);
      }
      return { from: current, to: target, ref: userId! };
    });

    // Audit: điều chỉnh thương là hành động nhạy cảm — ghi vết như reveal SĐT lead
    await q(
      `INSERT INTO audit_logs (admin_user_id, action, ref_id, detail)
       VALUES ($1, 'votes_adjust', $2, $3)`,
      [auth.admin.id, result.ref, JSON.stringify({ from: result.from, to: result.to })]
    );
    return NextResponse.json({ ok: true, votes: result.to });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NOT_FOUND") return jsonError(404, "Không tìm thấy câu nhắc (hoặc câu chưa được duyệt)");
    if (msg === "NO_SUGGESTION") {
      return jsonError(409, "Người này chưa có câu nào được duyệt để gắn thương");
    }
    throw e;
  }
}
