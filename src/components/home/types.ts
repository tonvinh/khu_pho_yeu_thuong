export interface CounterData {
  signs_installed: number;
  /** Góc phố đã duyệt còn mở — ô thứ 2 của dải 3 con số (design lp1) */
  issues_open: number;
  neighborhoods_joined: number;
  /** Số câu nhắc ĐÃ DUYỆT — thay 2 ô "góc phố đang chờ"/"người đóng góp" (18/8) */
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
  sign_promo_line1: string;
  sign_promo_line2: string;
  sign_sale_phone: string;
  sign_hotline: string;
  lead_title: string;
  lead_body: string;
  lead_privacy: string;
  footer_line1: string;
  footer_line2: string;
  footer_support: string;
  footer_tagline: string;
  campaign_title: string;
  campaign_hint: string;
  /** Danh sách video TVC phát lần lượt (khối TVC hiện tạm ẩn khỏi trang chủ) */
  campaign_youtube_ids: string[];
  /** URL ảnh KV chiến dịch — null → placeholder "chờ thiết kế final" */
  campaign_kv_url: string | null;
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

export interface HomeData {
  counters: CounterData;
  issues: IssueCard[];
  map: MapData;
  approvedSigns: ApprovedSign[];
  content: SiteContentData;
}

/** Một biển đã duyệt/đã treo của khu phố — hiện trong popup khu phố */
export interface NeighborhoodSign {
  id: string;
  content: string;
  author_name: string;
  location_text: string;
  category: string;
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
  signs: NeighborhoodSign[];
}
