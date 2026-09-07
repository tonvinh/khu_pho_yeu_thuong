// Hồ sơ một cây bút + danh sách câu đã duyệt của người đó — dữ liệu cho popup
// "Cây bút khu phố" (Figma bản 2/9 · B10, frame 7727:1743), mở từ nút Bình chọn ở
// tab 3 của IssueBoard.
//
// KHÔNG trả về số điện thoại (quy tắc cứng 3b: SĐT không rời server) và bỏ qua tài
// khoản shadow-ban như mọi chỗ công khai khác.
import { one, q } from "./db";

/** Số câu hiện trong popup — .fig vẽ 3 thẻ, cuộn trong popup nếu nhiều hơn */
const NOTE_LIMIT = 8;

/** Một câu của cây bút — thẻ 636×81 nền #E8F8FF trong .fig */
export interface AmbassadorNote {
  id: string;
  content: string;
  /** Phường – tỉnh của góc phố chứa câu, hiện ở dòng pin dưới nội dung */
  ward: string | null;
  city: string | null;
  votes: number;
  /** Người xem đã thương câu này chưa (1 phiếu/câu, không rút — Q6) */
  voted: boolean;
  /** Câu của chính người xem → không được tự thương (quy tắc cứng 3) */
  is_mine: boolean;
}

export interface AmbassadorDetail {
  display_name: string;
  share_slug: string;
  ward: string | null;
  city: string | null;
  notes: AmbassadorNote[];
}

export async function loadAmbassadorDetail(
  slug: string,
  viewerId?: string | null
): Promise<AmbassadorDetail | null> {
  const u = await one<{ id: string; display_name: string; share_slug: string; ward: string | null; city: string | null }>(
    `SELECT u.id, u.display_name, u.share_slug, n.ward, n.city
     FROM users u LEFT JOIN neighborhoods n ON n.id = u.neighborhood_id AND n.deleted_at IS NULL
     WHERE u.share_slug = $1 AND NOT u.is_shadow_banned`,
    [slug]
  );
  if (!u) return null;

  const viewer = viewerId ?? "00000000-0000-0000-0000-000000000000";
  const notes = await q(
    `SELECT s.id, s.content, n.ward, n.city,
       (SELECT count(*)::int FROM votes v WHERE v.suggestion_id = s.id AND v.is_valid) AS votes,
       EXISTS (SELECT 1 FROM votes v WHERE v.suggestion_id = s.id AND v.user_id = $2) AS voted,
       (s.author_id = $2) AS is_mine
     FROM suggestions s
     JOIN issues i ON i.id = s.issue_id
     JOIN neighborhoods n ON n.id = i.neighborhood_id
     WHERE s.author_id = $1 AND n.deleted_at IS NULL
       AND s.status IN ('approved','selected','produced','installed')
     ORDER BY votes DESC, s.created_at ASC
     LIMIT ${NOTE_LIMIT}`,
    [u.id, viewer]
  );

  return {
    display_name: u.display_name,
    share_slug: u.share_slug,
    ward: u.ward,
    city: u.city,
    notes: notes.map((s) => ({
      id: s.id as string,
      content: s.content as string,
      ward: (s.ward as string | null) ?? null,
      city: (s.city as string | null) ?? null,
      votes: Number(s.votes) || 0,
      voted: Boolean(s.voted),
      is_mine: Boolean(s.is_mine),
    })),
  };
}
