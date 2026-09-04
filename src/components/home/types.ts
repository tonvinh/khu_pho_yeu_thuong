export interface CounterData {
  signs_installed: number;
  /** Khu phố đang tham gia — ô thứ 2 của dải 3 con số (Figma 2/9 · B2) */
  neighborhoods_joined: number;
  /** Số câu nhắc ĐÃ DUYỆT — ô thứ 3 (Figma 2/9 · B2) */
  suggestions_total: number;
}

export interface IssueCard {
  id: string;
  category: string;
  location_text: string;
  description: string | null;
  status: "waiting" | "voting" | "signed";
  neighborhood_id: string;
  neighborhood_name: string;
  suggestion_count: number;
  top_votes: number;
  top_quote: string | null;
  /** Tên người viết câu nhiều thương nhất — dòng meta tab 2 (Figma 2/9 · B4) */
  top_author_name: string | null;
  /** Người xem (cookie kp_session) đã thương câu nào trong góc này chưa */
  voted: boolean;
}

export interface MapNeighborhood {
  id: string;
  name: string;
  ward: string | null;
  city: string | null;
  slug: string;
  certified_4n: boolean;
  certified_at: string | null;
  /** Bật ở admin → xuất hiện trong block "Khu phố tiêu biểu" đầu trang chủ */
  is_featured: boolean;
  map_url: string | null;
  /** Ảnh bảng chứng nhận 4N (admin upload) — hiện ở trang /khu-pho/[slug] */
  certificate_url: string | null;
  /** Tối đa 4 ảnh tổng quan, kích thước đồng nhất (admin upload, theo position) */
  photo_urls: string[];
}

export interface MapPin {
  id: string;
  neighborhood_id: string;
  category: string;
  location_text: string;
  status: "waiting" | "voting" | "signed";
  pin_x: number;
  pin_y: number;
}

export interface MapData {
  neighborhoods: MapNeighborhood[];
  pins: MapPin[];
}

export interface Me {
  display_name: string;
  share_slug: string;
  neighborhood_id: string | null;
  neighborhood_name?: string | null;
  score?: number;
}

export interface SuggestionItem {
  id: string;
  content: string;
  status: string;
  author_name: string;
  is_mine: boolean;
  votes: number;
  voted: boolean;
  sign_photo_url: string | null;
}

export interface IssueDetail {
  id: string;
  category: string;
  location_text: string;
  description: string | null;
  status: string;
  photo_url: string | null;
  neighborhood_id: string;
  neighborhood_name: string;
}

export interface NotificationItem {
  id: string;
  type: string;
  ref_id: string;
  payload: { location_text?: string; content?: string };
  created_at: string;
}

/** Nội dung trang chủ admin sửa được ở /admin/noi-dung (mặc định từ copy.ts) */
export interface SiteContentData {
  hero_title: string;
  hero_body: string;
  hero_search_placeholder: string;
  board_title: string;
  board_hint: string;
  signs_title: string;
  lead_title: string;
  lead_body: string;
  lead_privacy: string;
  footer_line1: string;
  footer_line2: string;
  footer_support: string;
  footer_tagline: string;
}

/** Một cây bút trên bảng vinh danh — hình dạng đúng bằng `AmbassadorRow` của
 *  `src/lib/leaderboard.ts` (khai lại ở đây để component client không phải import
 *  module có `pg`). Cả trang chủ SSR lẫn GET /api/v1/leaderboard đều trả về nó. */
export interface AmbassadorRow {
  user_id: string;
  display_name: string;
  share_slug: string;
  neighborhood_name: string | null;
  score: number;
  signs_installed: number;
  /** Số câu ĐÃ DUYỆT — dòng meta tab 3 (Figma 2/9 · B4) */
  suggestions_count: number;
  votes_received: number;
  week_points: number;
  /** Câu được thương nhất của cây bút (đã duyệt trở lên) */
  top_quote: string | null;
  top_quote_spot: string | null;
  top_quote_installed: boolean;
}

/** Lời nhắc đã duyệt — hiện trong block "Biển mới của khu phố" */
export interface ApprovedSign {
  id: string;
  content: string;
  author_name: string;
  location_text: string;
  /** Chủ đề của góc phố — hiện ở dòng meta dưới biển */
  category: string;
  neighborhood_name: string;
  votes: number;
  /** Ngày duyệt câu (fallback ngày gửi) — thứ tự 6 biển mới nhất */
  approved_at: string;
}

/**
 * Một lời nhắc đang chờ bình chọn — hàng của tab 2 "Lời nhắc chờ bạn bình chọn".
 * Hình dạng đúng bằng `VotingNote` của `src/lib/notes.ts` (khai lại ở đây để
 * component client không phải import module có `pg`), giống cách làm của
 * `AmbassadorRow`.
 */
export interface VotingNote {
  id: string;
  content: string;
  issue_id: string;
  ward_label: string;
  author_name: string;
  votes: number;
  voted: boolean;
  is_mine: boolean;
}

export interface HomeData {
  counters: CounterData;
  issues: IssueCard[];
  /** Tab 2 của IssueBoard — hàng là CÂU NHẮC, không phải góc phố (Figma live 4/9) */
  notes: VotingNote[];
  map: MapData;
  approvedSigns: ApprovedSign[];
  content: SiteContentData;
  /** TOP cây bút cho tab thứ 3 của IssueBoard (quyết định F3: hàng = NGƯỜI) */
  ambassadors: AmbassadorRow[];
}

/**
 * Một câu nhắc của khu phố — hiện trong popup "Thông tin khu phố" (Figma 2/9 · B9).
 * Thay `NeighborhoodSign` của bản 18/8: design mới không còn vẽ biển bằng SignCard
 * mà liệt kê câu nhắc kèm PILL TRẠNG THÁI và nút bình chọn.
 */
export interface NeighborhoodNote {
  id: string;
  content: string;
  /** approved → "Đang chờ bạn bình chọn" · selected/produced → "Chờ treo biển" ·
   *  installed → "Đã lên biển" */
  status: "approved" | "selected" | "produced" | "installed";
  author_name: string;
  votes: number;
  /** Người xem đã thương câu này chưa (1 phiếu/câu, không rút — Q6) */
  voted: boolean;
  /** Câu của chính người xem → không được tự thương (quy tắc cứng 3) */
  is_mine: boolean;
}

/**
 * Hồ sơ một khu phố — dùng CHUNG cho popup `NeighborhoodModal` (fetch qua
 * `/api/v1/neighborhoods/{idOrSlug}`) và trang share `/khu-pho/[slug]` (SSR),
 * để hai chỗ hiện y hệt nhau.
 */
export interface NeighborhoodDetail {
  id: string;
  name: string;
  slug: string;
  ward: string | null;
  city: string | null;
  certified_4n: boolean;
  certified_at: string | null;
  /** Ảnh tổng quan (theo position); rỗng thì rơi về `map_url` */
  photo_urls: string[];
  /** Ảnh bảng chứng nhận 4N — chỉ có khi admin đã upload */
  certificate_url: string | null;
  map_url: string | null;
  total_issues: number;
  signed_issues: number;
  /** Số câu nhắc đã duyệt của cả khu */
  suggestions_total: number;
  progress_pct: number;
  /** Câu nhắc của khu phố, mới nhất trước (Figma 2/9 · B9) */
  notes: NeighborhoodNote[];
}
