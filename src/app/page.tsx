// Trang chủ — SSR dữ liệu ban đầu (LCP < 2.5s), client island lo tương tác + polling
import { getCounters } from "@/lib/counters";
import { q } from "@/lib/db";
import { getAmbassadors, getNeighborhoodOfMonth } from "@/lib/leaderboard";
import { imgUrl } from "@/lib/storage";
import HomeShell from "@/components/home/HomeShell";
import type { HomeData } from "@/components/home/types";

export const dynamic = "force-dynamic";

async function loadHomeData(): Promise<HomeData> {
  const [counters, issues, neighborhoods, pins, ambassadors, nom] = await Promise.all([
    getCounters(),
    q(`SELECT i.id, i.category, i.location_text, i.description, i.status,
         i.neighborhood_id, n.name AS neighborhood_name,
         (SELECT count(*)::int FROM suggestions s
           WHERE s.issue_id = i.id AND s.status IN ('approved','selected','produced','installed')) AS suggestion_count,
         (SELECT COALESCE(max(vc.n), 0)::int FROM (
            SELECT count(*) AS n FROM votes v JOIN suggestions s ON s.id = v.suggestion_id
            WHERE s.issue_id = i.id AND v.is_valid GROUP BY v.suggestion_id) vc) AS top_votes,
         (SELECT s.content FROM suggestions s
            LEFT JOIN votes v ON v.suggestion_id = s.id AND v.is_valid
            WHERE s.issue_id = i.id AND s.status IN ('approved','selected','produced','installed')
            GROUP BY s.id ORDER BY count(v.id) DESC, s.created_at ASC LIMIT 1) AS top_quote
       FROM issues i JOIN neighborhoods n ON n.id = i.neighborhood_id
       WHERE i.status IN ('waiting','voting','signed')
       ORDER BY (i.status = 'signed'), i.approved_at DESC NULLS LAST`),
    q(`SELECT id, name, slug, certified_4n, certified_at, map_stylized_key, photo_key
       FROM neighborhoods ORDER BY name`),
    q(`SELECT id, neighborhood_id, category, location_text, status, pin_x, pin_y
       FROM issues WHERE status IN ('waiting','voting','signed')
         AND pin_x IS NOT NULL AND pin_y IS NOT NULL`),
    getAmbassadors(10),
    getNeighborhoodOfMonth(),
  ]);

  return {
    counters,
    issues: issues as HomeData["issues"],
    map: {
      neighborhoods: neighborhoods.map((n) => ({
        id: n.id as string,
        name: n.name as string,
        slug: n.slug as string,
        certified_4n: n.certified_4n as boolean,
        certified_at: n.certified_at as string | null,
        map_url: imgUrl(n.map_stylized_key as string | null),
        photo_url: imgUrl(n.photo_key as string | null),
      })),
      pins: pins as HomeData["map"]["pins"],
    },
    ambassadors,
    neighborhoodOfMonth: nom,
  };
}

export default async function HomePage() {
  const data = await loadHomeData();
  return <HomeShell initial={data} />;
}
