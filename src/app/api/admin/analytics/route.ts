import { NextRequest, NextResponse } from "next/server";
import { one, q } from "@/lib/db";
import { requireAdmin } from "@/lib/api";
import { CATEGORY_CODES } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";

// Dashboard phân tích (/admin) — gộp toàn bộ số liệu trang trong 1 response.
// Bộ lọc: days=7|30|90, neighborhood_id, category. Kỳ so sánh = cùng độ dài liền trước.
// Leads & cư dân mới không có category; leads không gắn neighborhood_id → 2 khối đó
// bỏ qua bộ lọc tương ứng (UI ghi chú). Hàng đợi vận hành + chất lượng: không theo bộ lọc.

const DAYS_ALLOWED = [7, 30, 90];
const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { at: number; data: unknown }>();

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;

  const sp = req.nextUrl.searchParams;
  const days = DAYS_ALLOWED.includes(Number(sp.get("days"))) ? Number(sp.get("days")) : 30;
  const nb = /^[0-9a-f-]{36}$/i.test(sp.get("neighborhood_id") || "") ? sp.get("neighborhood_id") : null;
  const cat = CATEGORY_CODES.includes((sp.get("category") || "") as never) ? sp.get("category") : null;

  const key = `${days}:${nb}:${cat}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return NextResponse.json(hit.data);

  // $1=days $2=neighborhood_id $3=category — điều kiện nullable áp lại được cho mọi query
  const P = [days, nb, cat];
  const CUR = `>= now() - make_interval(days => $1)`;
  const PREV = `< now() - make_interval(days => $1) AND %COL% >= now() - make_interval(days => $1 * 2)`;
  const prev = (col: string) => `${col} ${PREV.replace("%COL%", col)}`;
  const FI = `($2::uuid IS NULL OR i.neighborhood_id = $2) AND ($3::text IS NULL OR i.category = $3)`;
  const FS = `($2::uuid IS NULL OR s.neighborhood_id = $2) AND ($3::text IS NULL OR s.category = $3)`;
  const INSTALLED_AT = `COALESCE(s.installed_at, s.installed_date::timestamptz)`;

  const [kpis, daily, funnelIssues, funnelSuggestions, categories, leadsBreak, rank, ops, fraud, quality, neighborhoods] =
    await Promise.all([
      one(
        `SELECT
          (SELECT count(*) FILTER (WHERE ${INSTALLED_AT} ${CUR})::int FROM suggestions s WHERE ${FS}) AS installed_cur,
          (SELECT count(*) FILTER (WHERE ${prev(INSTALLED_AT)})::int FROM suggestions s WHERE ${FS}) AS installed_prev,
          (SELECT count(*) FILTER (WHERE i.created_at ${CUR})::int FROM issues i WHERE ${FI}) AS issues_cur,
          (SELECT count(*) FILTER (WHERE ${prev("i.created_at")})::int FROM issues i WHERE ${FI}) AS issues_prev,
          (SELECT count(*) FILTER (WHERE s.created_at ${CUR})::int FROM suggestions s WHERE ${FS}) AS suggestions_cur,
          (SELECT count(*) FILTER (WHERE ${prev("s.created_at")})::int FROM suggestions s WHERE ${FS}) AS suggestions_prev,
          (SELECT count(*) FILTER (WHERE v.created_at ${CUR})::int
             FROM votes v JOIN suggestions s ON s.id = v.suggestion_id WHERE v.is_valid AND ${FS}) AS votes_cur,
          (SELECT count(*) FILTER (WHERE ${prev("v.created_at")})::int
             FROM votes v JOIN suggestions s ON s.id = v.suggestion_id WHERE v.is_valid AND ${FS}) AS votes_prev,
          (SELECT count(*) FILTER (WHERE u.created_at ${CUR})::int
             FROM users u WHERE ($2::uuid IS NULL OR u.neighborhood_id = $2)) AS new_users_cur,
          (SELECT count(*) FILTER (WHERE ${prev("u.created_at")})::int
             FROM users u WHERE ($2::uuid IS NULL OR u.neighborhood_id = $2)) AS new_users_prev,
          (SELECT count(*) FILTER (WHERE l.created_at ${CUR})::int FROM leads l WHERE l.opted_in) AS leads_cur,
          (SELECT count(*) FILTER (WHERE ${prev("l.created_at")})::int FROM leads l WHERE l.opted_in) AS leads_prev`,
        P
      ),
      q(
        `SELECT d::date AS day,
           (SELECT count(*)::int FROM issues i WHERE i.created_at::date = d::date AND ${FI}) AS issues,
           (SELECT count(*)::int FROM suggestions s WHERE s.created_at::date = d::date AND ${FS}) AS suggestions,
           (SELECT count(*)::int FROM votes v JOIN suggestions s ON s.id = v.suggestion_id
             WHERE v.is_valid AND v.created_at::date = d::date AND ${FS}) AS votes,
           (SELECT count(*)::int FROM leads l WHERE l.opted_in AND l.created_at::date = d::date) AS leads,
           (SELECT count(*)::int FROM suggestions s
             WHERE ${INSTALLED_AT}::date = d::date AND ${FS}) AS installed,
           (SELECT count(*)::int FROM users u
             WHERE u.created_at::date = d::date AND ($2::uuid IS NULL OR u.neighborhood_id = $2)) AS new_users
         FROM generate_series(CURRENT_DATE - ($1::int - 1), CURRENT_DATE, interval '1 day') d
         ORDER BY d`,
        P
      ),
      // Phễu cohort: đề xuất TẠO trong kỳ, đếm số đã đạt từng mốc (bất kể đạt lúc nào)
      one(
        `SELECT count(*)::int AS submitted,
           count(*) FILTER (WHERE i.approved_at IS NOT NULL)::int AS approved,
           count(*) FILTER (WHERE i.status IN ('voting','signed'))::int AS voting,
           count(*) FILTER (WHERE i.signed_at IS NOT NULL OR i.status = 'signed')::int AS signed
         FROM issues i WHERE i.created_at ${CUR} AND ${FI}`,
        P
      ),
      one(
        `SELECT count(*)::int AS submitted,
           count(*) FILTER (WHERE s.approved_at IS NOT NULL
             OR s.status IN ('approved','selected','produced','installed'))::int AS approved,
           count(*) FILTER (WHERE s.status IN ('selected','produced','installed'))::int AS selected,
           count(*) FILTER (WHERE s.status IN ('produced','installed'))::int AS produced,
           count(*) FILTER (WHERE s.status = 'installed')::int AS installed
         FROM suggestions s WHERE s.created_at ${CUR} AND ${FS}`,
        P
      ),
      q(
        `SELECT c.code AS category,
           (SELECT count(*)::int FROM issues i WHERE i.category = c.code AND i.created_at ${CUR}
              AND ($2::uuid IS NULL OR i.neighborhood_id = $2)) AS issues,
           (SELECT count(*)::int FROM suggestions s WHERE s.category = c.code AND s.created_at ${CUR}
              AND ($2::uuid IS NULL OR s.neighborhood_id = $2)) AS suggestions
         FROM unnest($4::text[]) AS c(code)
         WHERE ($3::text IS NULL OR c.code = $3)`,
        [...P, CATEGORY_CODES]
      ),
      q(
        `SELECT l.source,
           count(*) FILTER (WHERE l.status = 'new')::int AS new,
           count(*) FILTER (WHERE l.status = 'contacted')::int AS contacted,
           count(*) FILTER (WHERE l.status = 'converted')::int AS converted,
           count(*) FILTER (WHERE l.status = 'closed')::int AS closed
         FROM leads l WHERE l.opted_in AND l.created_at ${CUR}
         GROUP BY l.source ORDER BY l.source DESC`,
        [days]
      ),
      q(
        `SELECT n.id, n.name, n.ward, n.city, n.certified_4n,
           pt.points, ins.c AS installed, iss.c AS issues, vt.c AS votes
         FROM neighborhoods n
         LEFT JOIN LATERAL (
           SELECT COALESCE(sum(se.points), 0)::int AS points
           FROM score_events se JOIN users u ON u.id = se.user_id
           WHERE u.neighborhood_id = n.id AND se.is_valid AND se.created_at ${CUR}) pt ON true
         LEFT JOIN LATERAL (
           SELECT count(*)::int AS c FROM suggestions s
           WHERE s.neighborhood_id = n.id AND ${INSTALLED_AT} ${CUR}
             AND ($3::text IS NULL OR s.category = $3)) ins ON true
         LEFT JOIN LATERAL (
           SELECT count(*)::int AS c FROM issues i
           WHERE i.neighborhood_id = n.id AND i.created_at ${CUR}
             AND ($3::text IS NULL OR i.category = $3)) iss ON true
         LEFT JOIN LATERAL (
           SELECT count(*)::int AS c FROM votes v JOIN suggestions s ON s.id = v.suggestion_id
           WHERE s.neighborhood_id = n.id AND v.is_valid AND v.created_at ${CUR}
             AND ($3::text IS NULL OR s.category = $3)) vt ON true
         WHERE NOT n.hidden AND ($2::uuid IS NULL OR n.id = $2)
         ORDER BY pt.points DESC, ins.c DESC, vt.c DESC
         LIMIT 15`,
        P
      ),
      one(
        `SELECT
          (SELECT count(*)::int FROM issues WHERE status = 'pending_review') AS issues_pending,
          (SELECT count(*)::int FROM issues
            WHERE status = 'pending_review' AND created_at < now() - interval '24 hours') AS issues_pending_over_24h,
          (SELECT COALESCE(floor(extract(epoch FROM now() - min(created_at)) / 3600), 0)::int
            FROM issues WHERE status = 'pending_review') AS issues_oldest_hours,
          (SELECT count(*)::int FROM suggestions WHERE status = 'submitted') AS suggestions_pending,
          (SELECT COALESCE(floor(extract(epoch FROM now() - min(created_at)) / 86400), 0)::int
            FROM suggestions WHERE status = 'submitted') AS suggestions_oldest_days,
          (SELECT count(*)::int FROM leads
            WHERE opted_in AND status = 'new' AND created_at < now() - interval '48 hours') AS leads_new_over_48h,
          (SELECT count(*)::int FROM suggestions
            WHERE status = 'selected'
              AND COALESCE(approved_at, created_at) < now() - interval '14 days') AS selected_over_14d`
      ),
      // Đếm nhanh 3 heuristic của /api/admin/fraud (chi tiết xem màn Chống gian lận)
      one(
        `SELECT
          (SELECT count(*)::int FROM (
            SELECT 1 FROM sessions s
            WHERE s.created_at > now() - interval '24 hours' AND s.ip_hash IS NOT NULL
            GROUP BY s.ip_hash HAVING count(DISTINCT s.user_id) >= 3) t) AS ip_clusters,
          (SELECT count(*)::int FROM (
            SELECT 1 FROM votes v
            JOIN suggestions s ON s.id = v.suggestion_id
            JOIN users voter ON voter.id = v.user_id
            WHERE v.created_at > now() - interval '48 hours'
              AND voter.created_at > now() - interval '48 hours' AND v.is_valid
            GROUP BY s.author_id HAVING count(v.id) >= 10) t) AS burst_targets,
          (SELECT count(*)::int FROM (
            SELECT 1 FROM votes v WHERE v.created_at > now() - interval '1 hour'
            GROUP BY v.user_id HAVING count(v.id) >= 20) t) AS fast_voters`
      ),
      one(
        `SELECT
          (SELECT count(*)::int FROM issues WHERE approved_at IS NOT NULL) AS issues_approved,
          (SELECT count(*)::int FROM issues WHERE status = 'rejected') AS issues_rejected,
          (SELECT count(*)::int FROM suggestions
            WHERE approved_at IS NOT NULL OR status IN ('approved','selected','produced','installed')) AS sug_approved,
          (SELECT count(*)::int FROM suggestions WHERE status = 'rejected') AS sug_rejected,
          (SELECT count(*)::int FROM votes WHERE NOT is_valid) AS votes_invalid,
          (SELECT count(*)::int FROM votes) AS votes_total,
          (SELECT count(*)::int FROM users WHERE is_shadow_banned) AS shadow_banned`
      ),
      q(`SELECT id, name FROM neighborhoods WHERE NOT hidden ORDER BY name`),
    ]);

  const data = {
    range: { days, neighborhood_id: nb, category: cat },
    kpis,
    daily,
    funnel_issues: funnelIssues,
    funnel_suggestions: funnelSuggestions,
    categories,
    leads_break: leadsBreak,
    rank,
    ops,
    fraud,
    quality,
    neighborhoods,
  };
  cache.set(key, { at: Date.now(), data });
  return NextResponse.json(data);
}
