// Hồ sơ một khu phố — nguồn dữ liệu DUY NHẤT cho popup khu phố ở trang chủ
// (`/api/v1/neighborhoods/{id}`) và trang share `/khu-pho/[slug]`. Hai chỗ dùng
// chung một query nên nội dung không lệch nhau.
// Figma 2/9 · B9: popup đổi từ "ảnh + tiến độ 4N + 4 biển" sang DANH SÁCH CÂU NHẮC
// kèm trạng thái, nên loader trả `notes` thay cho `signs`. Vẫn giữ ảnh/tiến độ vì
// trang share còn dùng (quyết định Q5).
import { one, q } from "./db";
import { imgUrl } from "./storage";
import type { NeighborhoodDetail } from "@/components/home/types";

/** Số câu nhắc hiện trong popup — .fig vẽ 4 thẻ, cuộn trong popup nếu nhiều hơn */
const NOTE_LIMIT = 8;

/**
 * `key` là slug hoặc UUID — id ép sang text để slug không làm Postgres cast lỗi uuid.
 * `viewerId` là người đang xem (cookie kp_session) để đánh dấu câu đã bình chọn và
 * câu của chính mình; không truyền thì mọi câu đều "chưa bình chọn".
 */
export async function loadNeighborhoodDetail(
  key: string,
  viewerId?: string | null
): Promise<NeighborhoodDetail | null> {
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

  const viewer = viewerId ?? "00000000-0000-0000-0000-000000000000";
  const notes = await q(
    `SELECT s.id, s.content, s.status, u.display_name AS author_name,
       (SELECT count(*)::int FROM votes v WHERE v.suggestion_id = s.id AND v.is_valid) AS votes,
       EXISTS (SELECT 1 FROM votes v WHERE v.suggestion_id = s.id AND v.user_id = $2) AS voted,
       (s.author_id = $2) AS is_mine
     FROM suggestions s
     JOIN issues i ON i.id = s.issue_id
     JOIN users u ON u.id = s.author_id
     WHERE i.neighborhood_id = $1
       AND s.status IN ('approved','selected','produced','installed')
     ORDER BY COALESCE(s.approved_at, s.created_at) DESC
     LIMIT ${NOTE_LIMIT}`,
    [nb.id, viewer]
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
    notes: notes.map((s) => ({
      id: s.id as string,
      content: s.content as string,
      status: s.status as NeighborhoodDetail["notes"][number]["status"],
      author_name: s.author_name as string,
      votes: Number(s.votes) || 0,
      voted: Boolean(s.voted),
      is_mine: Boolean(s.is_mine),
    })),
  };
}
