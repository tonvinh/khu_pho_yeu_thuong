// Hồ sơ một khu phố (ảnh, tiến độ 4N, biển đã có) — nguồn dữ liệu DUY NHẤT cho
// popup khu phố ở trang chủ (`/api/v1/neighborhoods/{idOrSlug}`) và trang share
// `/khu-pho/[slug]`. Hai chỗ dùng chung một query nên nội dung không lệch nhau.
import { one, q } from "./db";
import { imgUrl } from "./storage";
import type { NeighborhoodDetail } from "@/components/home/types";

/** Số biển hiện trong popup (design: lưới 2 cột) */
const SIGN_LIMIT = 4;

/** `key` là slug hoặc UUID — id ép sang text để slug không làm Postgres cast lỗi uuid */
export async function loadNeighborhoodDetail(key: string): Promise<NeighborhoodDetail | null> {
  const nb = await one(
    `SELECT n.id, n.name, n.slug, n.ward, n.city, n.certified_4n, n.certified_at,
       n.certificate_photo_key, n.map_stylized_key,
       COALESCE((SELECT json_agg(p.photo_key ORDER BY p.position)
         FROM neighborhood_photos p WHERE p.neighborhood_id = n.id), '[]'::json) AS photo_keys,
       (SELECT count(*)::int FROM issues WHERE neighborhood_id = n.id
         AND status IN ('waiting','voting','signed')) AS total_issues,
       (SELECT count(*)::int FROM issues WHERE neighborhood_id = n.id
         AND status = 'signed') AS signed_issues,
       (SELECT count(*)::int FROM suggestions s JOIN issues i ON i.id = s.issue_id
         WHERE i.neighborhood_id = n.id
           AND s.status IN ('approved','selected','produced','installed')) AS suggestions_total
     FROM neighborhoods n WHERE n.slug = $1 OR n.id::text = $1`,
    [key]
  );
  if (!nb) return null;

  const signs = await q(
    `SELECT s.id, s.content, u.display_name AS author_name, i.location_text, i.category
     FROM suggestions s
     JOIN issues i ON i.id = s.issue_id
     JOIN users u ON u.id = s.author_id
     WHERE i.neighborhood_id = $1
       AND s.status IN ('approved','selected','produced','installed')
     ORDER BY COALESCE(s.approved_at, s.created_at) DESC
     LIMIT ${SIGN_LIMIT}`,
    [nb.id]
  );

  const total = Number(nb.total_issues) || 0;
  const signed = Number(nb.signed_issues) || 0;
  return {
    id: nb.id as string,
    name: nb.name as string,
    slug: nb.slug as string,
    ward: nb.ward as string | null,
    city: nb.city as string | null,
    certified_4n: nb.certified_4n as boolean,
    certified_at: nb.certified_at ? String(nb.certified_at) : null,
    photo_urls: (nb.photo_keys as string[]).map((k) => imgUrl(k)!).filter(Boolean),
    certificate_url: imgUrl(nb.certificate_photo_key as string | null),
    map_url: imgUrl(nb.map_stylized_key as string | null),
    total_issues: total,
    signed_issues: signed,
    suggestions_total: Number(nb.suggestions_total) || 0,
    progress_pct: total === 0 ? 0 : Math.round((signed / total) * 100),
    signs: signs.map((s) => ({
      id: s.id as string,
      content: s.content as string,
      author_name: s.author_name as string,
      location_text: s.location_text as string,
      category: s.category as string,
    })),
  };
}
