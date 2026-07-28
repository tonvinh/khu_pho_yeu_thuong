// Ghi sổ cái điểm + side-effects vòng đời (03 §3, 05 §5). Mọi ghi điểm đi qua đây.
import type { PoolClient } from "pg";
import { pointsFor, type ScoreEventType } from "./scoring";

/**
 * Ghi 1 event điểm. User shadow-ban → event is_valid=false (lọc lặng lẽ).
 * issue_approved: áp trần 3/tuần ISO — đếm event points>0 cùng loại trong tuần hiện tại.
 */
export async function recordScoreEvent(
  client: PoolClient,
  userId: string,
  type: ScoreEventType,
  refId: string
): Promise<void> {
  const banned = await client.query(
    `SELECT is_shadow_banned FROM users WHERE id = $1`,
    [userId]
  );
  const isValid = !(banned.rows[0]?.is_shadow_banned === true);

  let points: number;
  if (type === "issue_approved") {
    const cnt = await client.query(
      `SELECT count(*)::int AS n FROM score_events
       WHERE user_id = $1 AND type = 'issue_approved' AND points > 0 AND is_valid
         AND date_trunc('week', created_at) = date_trunc('week', now())`,
      [userId]
    );
    points = pointsFor(type, cnt.rows[0].n);
  } else {
    points = pointsFor(type);
  }

  await client.query(
    `INSERT INTO score_events (user_id, type, points, ref_id, is_valid)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, type, points, refId, isValid]
  );
}

/** Vô hiệu event (bỏ thương / lọc gian lận) — không xoá, sổ cái append-only */
export async function invalidateScoreEvent(
  client: PoolClient,
  userId: string,
  type: ScoreEventType,
  refId: string
): Promise<void> {
  await client.query(
    `UPDATE score_events SET is_valid = false
     WHERE id = (SELECT id FROM score_events
                 WHERE user_id=$1 AND type=$2 AND ref_id=$3 AND is_valid
                 ORDER BY created_at DESC LIMIT 1)`,
    [userId, type, refId]
  );
}

/**
 * Side-effects khi câu nhắc chuyển installed (02 §9):
 * issue → signed (pin xanh), +30 điểm tác giả, tạo notification in-web (KHÔNG SMS — Q1).
 */
export async function applyInstalledSideEffects(
  client: PoolClient,
  suggestionId: string
): Promise<void> {
  const res = await client.query(
    `SELECT s.id, s.author_id, s.issue_id, s.content, i.location_text
     FROM suggestions s JOIN issues i ON i.id = s.issue_id WHERE s.id = $1`,
    [suggestionId]
  );
  const s = res.rows[0];
  if (!s) throw new Error("Không tìm thấy câu nhắc");

  await client.query(
    `UPDATE issues SET status='signed', signed_at=now() WHERE id=$1`,
    [s.issue_id]
  );
  await recordScoreEvent(client, s.author_id, "sign_installed", s.id);
  await client.query(
    `INSERT INTO notifications (user_id, type, ref_id, payload)
     VALUES ($1, 'sign_installed', $2, $3)`,
    [s.author_id, s.id, JSON.stringify({ location_text: s.location_text, content: s.content })]
  );
}
