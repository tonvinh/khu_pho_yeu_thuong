// Lời nhắc ĐANG CHỜ BÌNH CHỌN — nguồn dữ liệu cho tab 2 của IssueBoard.
//
// Figma bản LIVE (đọc 4/9 trên figma.com, mới hơn file .fig 2/9 trong docs/lp):
// tab 2 "Lời nhắc chờ bạn bình chọn" mỗi dòng là MỘT CÂU NHẮC — tiêu đề là nội dung
// câu, meta là phường · tác giả · số lượt bình chọn, nút "Bình chọn" (viền xanh) bấm
// thẳng tại dòng. Bản 2/9 mỗi dòng còn là một GÓC PHỐ với nút "Xem câu nhắc" mở popup.
//
// Không cần migration: `suggestions` + `votes` + `users` + `issues` + `neighborhoods`
// đã đủ mọi trường design cần.
import { q } from "./db";

/** Người xem chưa định danh — uuid rỗng để so sánh không khớp ai cả */
const ANON = "00000000-0000-0000-0000-000000000000";

export interface VotingNote {
  id: string;
  content: string;
  issue_id: string;
  /** Phường/xã của khu phố (thiếu thì rơi về tên khu) — mục meta thứ nhất */
  ward_label: string;
  author_name: string;
  votes: number;
  /** Người xem đã bình chọn câu này chưa — đã bấm là khoá (Q6, không rút phiếu) */
  voted: boolean;
  /** Câu của chính người xem → không được tự thương (quy tắc cứng 3) */
  is_mine: boolean;
}

/**
 * Câu đã duyệt của những góc phố CHƯA treo biển, tức còn đang tranh phiếu.
 * Xếp: câu người xem chưa bình chọn lên trước (đúng tinh thần "chờ bạn bình chọn"),
 * rồi nhiều thương nhất, rồi mới nhất.
 */
export async function getVotingNotes(viewerId: string | null, limit = 50): Promise<VotingNote[]> {
  const rows = await q(
    `SELECT s.id, s.content, s.issue_id,
       COALESCE(NULLIF(n.ward, ''), n.name) AS ward_label,
       u.display_name AS author_name,
       (SELECT count(*)::int FROM votes v WHERE v.suggestion_id = s.id AND v.is_valid) AS votes,
       EXISTS (SELECT 1 FROM votes v WHERE v.suggestion_id = s.id AND v.user_id = $1) AS voted,
       (s.author_id = $1) AS is_mine
     FROM suggestions s
     JOIN issues i ON i.id = s.issue_id
     JOIN neighborhoods n ON n.id = i.neighborhood_id
     JOIN users u ON u.id = s.author_id
     WHERE s.status = 'approved' AND i.status IN ('waiting', 'voting')
     ORDER BY voted ASC, votes DESC, s.created_at DESC
     LIMIT $2`,
    [viewerId ?? ANON, limit]
  );
  return rows as unknown as VotingNote[];
}
