export interface CounterData {
  signs_installed: number;
  issues_waiting: number;
  contributors: number;
  neighborhoods_joined: number;
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
  /** Ảnh bảng chứng nhận 4N (admin upload) — hiện trong block chứng nhận trang chủ */
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

export interface Ambassador {
  user_id: string;
  display_name: string;
  share_slug: string;
  neighborhood_name: string | null;
  score: number;
  signs_installed: number;
  votes_received: number;
}

export interface NeighborhoodOfMonth {
  name: string;
  slug: string;
  new_signs: number;
  votes: number;
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
  hero_title_1: string;
  hero_title_2: string;
  hero_body: string;
  campaign_title: string;
  campaign_hint: string;
  campaign_youtube_id: string;
  /** URL ảnh KV chiến dịch — null → placeholder "chờ thiết kế final" */
  campaign_kv_url: string | null;
  lead_title: string;
  lead_body: string;
  lead_privacy: string;
}

/** Lời nhắc đã duyệt — hiện trong block "Lời nhắc khi lên biển trông như thế nào?" */
export interface ApprovedSign {
  id: string;
  content: string;
  author_name: string;
  location_text: string;
  image_url: string | null;
  voted: boolean;
}

export interface HomeData {
  counters: CounterData;
  issues: IssueCard[];
  map: MapData;
  ambassadors: Ambassador[];
  neighborhoodOfMonth: NeighborhoodOfMonth | null;
  approvedSigns: ApprovedSign[];
  content: SiteContentData;
}
