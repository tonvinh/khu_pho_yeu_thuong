// Trang chủ — SSR dữ liệu ban đầu (LCP < 2.5s), client island lo tương tác + polling
import { getCounters } from "@/lib/counters";
import { q } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { getSiteContent } from "@/lib/site-content";
import { imgUrl } from "@/lib/storage";
import HomeShell from "@/components/home/HomeShell";
import type { HomeData } from "@/components/home/types";

export const dynamic = "force-dynamic";

/** Khối "Biển mới của khu phố" cố định 6 ô, xếp theo NGÀY DUYỆT mới nhất (18/8) */
const SIGN_SLOTS = 6;

async function loadHomeData(): Promise<HomeData> {
  // Người xem hiện tại (cookie kp_session) — để đánh dấu góc phố đã bình chọn hay chưa
  const viewer = await getSessionUser();
  const viewerId = viewer?.id ?? "00000000-0000-0000-0000-000000000000";
  const [counters, issues, neighborhoods, pins, approvedSigns, content] =
    await Promise.all([
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
            GROUP BY s.id ORDER BY count(v.id) DESC, s.created_at ASC LIMIT 1) AS top_quote,
         EXISTS (SELECT 1 FROM votes v JOIN suggestions s ON s.id = v.suggestion_id
            WHERE s.issue_id = i.id AND v.user_id = $1) AS voted
       FROM issues i JOIN neighborhoods n ON n.id = i.neighborhood_id
       WHERE i.status IN ('waiting','voting','signed')
       ORDER BY (i.status = 'signed'), i.approved_at DESC NULLS LAST`,
        [viewerId]),
      q(`SELECT n.id, n.name, n.ward, n.city, n.slug, n.certified_4n, n.certified_at,
         n.is_featured, n.map_stylized_key, n.certificate_photo_key,
         COALESCE((SELECT json_agg(p.photo_key ORDER BY p.position)
           FROM neighborhood_photos p WHERE p.neighborhood_id = n.id), '[]'::json) AS photo_keys
       FROM neighborhoods n WHERE NOT n.hidden
       ORDER BY n.featured_position NULLS LAST, n.name`),
      q(`SELECT id, neighborhood_id, category, location_text, status, pin_x, pin_y
       FROM issues WHERE status IN ('waiting','voting','signed')
         AND pin_x IS NOT NULL AND pin_y IS NOT NULL`),
      // 6 biển MỚI NHẤT theo ngày duyệt (bản cũ: 24 câu xếp theo lượt thương cho 3 tab —
      // block đã bỏ tab, bỏ bình chọn, cố định 6 ô nên chỉ cần đúng 6 bản ghi).
      q(`SELECT s.id, s.content, i.location_text, i.category, n.name AS neighborhood_name,
           u.display_name AS author_name,
           (SELECT count(*)::int FROM votes v WHERE v.suggestion_id = s.id AND v.is_valid) AS votes,
           COALESCE(s.approved_at, s.created_at) AS approved_at
         FROM suggestions s
         JOIN issues i ON i.id = s.issue_id
         JOIN neighborhoods n ON n.id = i.neighborhood_id
         JOIN users u ON u.id = s.author_id
         WHERE s.status IN ('approved','selected','produced','installed')
         ORDER BY approved_at DESC
         LIMIT ${SIGN_SLOTS}`),
      getSiteContent(),
    ]);

  return {
    counters,
    issues: issues as HomeData["issues"],
    map: {
      neighborhoods: neighborhoods.map((n) => ({
        id: n.id as string,
        name: n.name as string,
        ward: n.ward as string | null,
        city: n.city as string | null,
        slug: n.slug as string,
        certified_4n: n.certified_4n as boolean,
        certified_at: n.certified_at as string | null,
        is_featured: n.is_featured as boolean,
        map_url: imgUrl(n.map_stylized_key as string | null),
        certificate_url: imgUrl(n.certificate_photo_key as string | null),
        photo_urls: (n.photo_keys as string[]).map((k) => imgUrl(k)!),
      })),
      pins: pins as HomeData["map"]["pins"],
    },
    approvedSigns: approvedSigns.map((s) => ({
      id: s.id as string,
      content: s.content as string,
      author_name: s.author_name as string,
      location_text: s.location_text as string,
      category: s.category as string,
      neighborhood_name: s.neighborhood_name as string,
      votes: s.votes as number,
      approved_at: String(s.approved_at),
    })),
    content,
  };
}

export default async function HomePage() {
  const data = await loadHomeData();
  return <HomeShell initial={data} />;
}
