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
}

export async function getAmbassadors(limit = 10): Promise<AmbassadorRow[]> {
  return q<AmbassadorRow>(
    `SELECT u.id AS user_id, u.display_name, u.share_slug, n.name AS neighborhood_name,
       COALESCE(se.score, 0)::int AS score,
       COALESCE(si.n, 0)::int AS signs_installed,
       COALESCE(vr.n, 0)::int AS votes_received
     FROM users u
     LEFT JOIN neighborhoods n ON n.id = u.neighborhood_id
     JOIN LATERAL (SELECT sum(points) AS score FROM score_events
                   WHERE user_id = u.id AND is_valid) se ON true
     LEFT JOIN LATERAL (SELECT count(*) AS n FROM suggestions
                        WHERE author_id = u.id AND status = 'installed') si ON true
     LEFT JOIN LATERAL (SELECT count(*) AS n FROM votes v
                        JOIN suggestions s ON s.id = v.suggestion_id
                        WHERE s.author_id = u.id AND v.is_valid) vr ON true
     WHERE NOT u.is_shadow_banned AND COALESCE(se.score, 0) > 0
     ORDER BY score DESC, u.created_at ASC
     LIMIT $1`,
    [limit]
  );
}

export interface NeighborhoodOfMonth {
  name: string;
  slug: string;
  new_signs: number;
  votes: number;
}

/** Khu phố tử tế nhất tháng = tổng điểm cư dân trong tháng + số biển mới treo trong khu */
export async function getNeighborhoodOfMonth(): Promise<NeighborhoodOfMonth | null> {
  return one<NeighborhoodOfMonth>(
    `SELECT n.name, n.slug,
       COALESCE(ns.n, 0)::int AS new_signs,
       COALESCE(vm.n, 0)::int AS votes,
       COALESCE(pm.p, 0)::int + COALESCE(ns.n, 0)::int AS month_score
     FROM neighborhoods n
     LEFT JOIN LATERAL (
       SELECT count(*) AS n FROM suggestions s JOIN issues i ON i.id = s.issue_id
       WHERE i.neighborhood_id = n.id AND s.status = 'installed'
         AND date_trunc('month', s.installed_at) = date_trunc('month', now())) ns ON true
     LEFT JOIN LATERAL (
       SELECT count(*) AS n FROM votes v
       JOIN suggestions s ON s.id = v.suggestion_id
       JOIN issues i ON i.id = s.issue_id
       WHERE i.neighborhood_id = n.id AND v.is_valid
         AND date_trunc('month', v.created_at) = date_trunc('month', now())) vm ON true
     LEFT JOIN LATERAL (
       SELECT sum(e.points) AS p FROM score_events e
       JOIN users u ON u.id = e.user_id
       WHERE u.neighborhood_id = n.id AND e.is_valid
         AND date_trunc('month', e.created_at) = date_trunc('month', now())) pm ON true
     ORDER BY month_score DESC, new_signs DESC
     LIMIT 1`
  );
}
