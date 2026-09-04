// Tiện ích dùng chung cho bộ test giao diện (jsdom).
// Mỗi file test tự khai `@vitest-environment jsdom` ở dòng đầu — cấu hình vitest
// vẫn để môi trường `node` cho bộ test logic cũ (four-n/phone/scoring/stylize).
import type {
  AmbassadorRow,
  HomeData,
  IssueCard,
  MapNeighborhood,
  SiteContentData,
  VotingNote,
} from "@/components/home/types";
import { SITE_CONTENT_DEFAULTS } from "@/lib/site-content-defaults";

export function nb(over: Partial<MapNeighborhood> = {}): MapNeighborhood {
  return {
    id: "nb-1",
    name: "Xóm Lò Gốm",
    ward: "Phường Bàn Cờ",
    city: "Thành phố Hồ Chí Minh",
    slug: "xom-lo-gom",
    certified_4n: false,
    certified_at: null,
    is_featured: false,
    map_url: null,
    certificate_url: null,
    photo_urls: [],
    ...over,
  };
}

export function siteContent(over: Partial<SiteContentData> = {}): SiteContentData {
  return {
    ...SITE_CONTENT_DEFAULTS,
    campaign_youtube_ids: ["M7lc1UVf-VE"],
    campaign_kv_url: null,
    ...over,
  };
}

/** Chạy hành động ngay, thay cho luồng hỏi định danh của HomeShell */
export const runNow = (fn: () => void) => fn();

export function issue(over: Partial<IssueCard> = {}): IssueCard {
  return {
    id: "is-1",
    category: "sach_dep",
    location_text: "Hẻm 42 Lê Lợi",
    description: null,
    status: "voting",
    neighborhood_id: "nb-1",
    neighborhood_name: "Xóm Lò Gốm",
    suggestion_count: 0,
    top_votes: 0,
    top_quote: null,
    top_author_name: null,
    voted: false,
    ...over,
  };
}

/** Một dòng của tab 2 — lời nhắc đang chờ bình chọn (Figma live 4/9) */
export function note(over: Partial<VotingNote> = {}): VotingNote {
  return {
    id: "n-1",
    content: "Đường sạch, ngõ xinh - Xin đừng vứt rác",
    issue_id: "is-1",
    ward_label: "Phường Bàn Cờ",
    author_name: "Trà FPT",
    votes: 150,
    voted: false,
    is_mine: false,
    ...over,
  };
}

export function ambassador(over: Partial<AmbassadorRow> = {}): AmbassadorRow {
  return {
    user_id: "u-1",
    display_name: "Cô Bảy",
    share_slug: "co-bay-abc",
    neighborhood_name: "Xóm Lò Gốm",
    score: 82,
    signs_installed: 1,
    suggestions_count: 10,
    votes_received: 45,
    week_points: 5,
    top_quote: "Đi chậm chút nha, có trẻ con đang chơi.",
    top_quote_spot: "Hẻm 42 Lê Lợi",
    top_quote_installed: true,
    ...over,
  };
}

/** Dữ liệu SSR tối thiểu cho HomeShell */
export function homeData(over: Partial<HomeData> = {}): HomeData {
  return {
    counters: { signs_installed: 3, neighborhoods_joined: 21, suggestions_total: 10 },
    issues: [],
    notes: [],
    map: { neighborhoods: [], pins: [] },
    approvedSigns: [],
    content: siteContent(),
    ambassadors: [],
    ...over,
  };
}
