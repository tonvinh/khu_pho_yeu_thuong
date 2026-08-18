// Bảng xếp hạng Đại sứ + Khu phố tử tế nhất tháng (02 §5, 05 §3)
import { q, one } from "./db";

export interface AmbassadorRow {
  user_id: string;
  display_name: string;
  share_slug: string;
  neighborhood_name: string | null;
  score: number;
  signs_installed: number;
  votes_received: number;
  /** Điểm ghi trong 7 ngày gần nhất — tab "Tuần này" + tính hạng tuần trước */
  week_points: number;
  /** Câu được thương nhất của cây bút (đã duyệt trở lên) — hiện dưới tên */
  top_quote: string | null;
  top_quote_spot: string | null;
  /** Câu đó đã lên biển chưa — đổi wording "đang treo ở" / "viết cho" */
  top_quote_installed: boolean;
}

export async function getAmbassadors(limit = 10): Promise<AmbassadorRow[]> {
  return q<AmbassadorRow>(
    `SELECT u.id AS user_id, u.display_name, u.share_slug, n.name AS neighborhood_name,
       COALESCE(se.score, 0)::int AS score,
       COALESCE(si.n, 0)::int AS signs_installed,
       COALESCE(vr.n, 0)::int AS votes_received,
       COALESCE(wk.p, 0)::int AS week_points,
       tq.content AS top_quote,
       tq.location_text AS top_quote_spot,
       COALESCE(tq.installed, false) AS top_quote_installed
     FROM users u
     LEFT JOIN neighborhoods n ON n.id = u.neighborhood_id
     JOIN LATERAL (SELECT sum(points) AS score FROM score_events
                   WHERE user_id = u.id AND is_valid) se ON true
     LEFT JOIN LATERAL (SELECT count(*) AS n FROM suggestions
                        WHERE author_id = u.id AND status = 'installed') si ON true
     LEFT JOIN LATERAL (SELECT count(*) AS n FROM votes v
                        JOIN suggestions s ON s.id = v.suggestion_id
                        WHERE s.author_id = u.id AND v.is_valid) vr ON true
     LEFT JOIN LATERAL (SELECT sum(points) AS p FROM score_events
                        WHERE user_id = u.id AND is_valid
                          AND created_at >= now() - interval '7 days') wk ON true
     LEFT JOIN LATERAL (
       SELECT s.content, i.location_text, s.status = 'installed' AS installed
       FROM suggestions s
       JOIN issues i ON i.id = s.issue_id
       WHERE s.author_id = u.id AND s.status IN ('approved','selected','produced','installed')
       ORDER BY (SELECT count(*) FROM votes v
                 WHERE v.suggestion_id = s.id AND v.is_valid) DESC,
         s.status = 'installed' DESC, s.created_at ASC
       LIMIT 1) tq ON true
     WHERE NOT u.is_shadow_banned AND COALESCE(se.score, 0) > 0
     ORDER BY score DESC, u.created_at ASC
     LIMIT $1`,
    [limit]
  );
}

export interface ViewerRank {
  rank: number;
  score: number;
  /** Người đứng ngay trên (null nếu đang dẫn đầu) */
  above_name: string | null;
  above_score: number | null;
}

/** Hạng của người xem trên bảng cây bút — cho hàng "Bạn đang ở hạng #N".
 *  Trả null nếu chưa có điểm (chưa lên bảng). */
export async function getViewerRank(userId: string): Promise<ViewerRank | null> {
  return one<ViewerRank>(
    `WITH ranked AS (
       SELECT u.id, u.display_name,
         sum(e.points)::int AS score,
         row_number() OVER (ORDER BY sum(e.points) DESC, u.created_at ASC) AS rank
       FROM users u
       JOIN score_events e ON e.user_id = u.id AND e.is_valid
       WHERE NOT u.is_shadow_banned
       GROUP BY u.id
       HAVING sum(e.points) > 0
     )
     SELECT r.rank::int, r.score,
       ab.display_name AS above_name, ab.score AS above_score
     FROM ranked r
     LEFT JOIN ranked ab ON ab.rank = r.rank - 1
     WHERE r.id = $1`,
    [userId]
  );
}
