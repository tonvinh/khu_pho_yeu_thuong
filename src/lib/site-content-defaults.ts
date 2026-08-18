// Phần THUẦN của site-content: hằng số + parse, KHÔNG chạm db/storage.
//
// Tách riêng vì màn admin "Lời nhắc" là client component nhưng cần
// SITE_CONTENT_DEFAULTS để preview biển (SignCard). Import thẳng từ
// ./site-content sẽ kéo cả `pg` và `minio` vào bundle client → webpack báo
// "Can't resolve 'tls'/'net'/'fs'/'dns'" và build production CHẾT (dev server
// biên dịch lười nên không lộ ra khi chạy `pnpm dev`).
//
// Quy tắc: client import file này; server cứ import ./site-content như cũ
// (file đó re-export lại toàn bộ).
import { COPY } from "./copy";

/** Row đặc biệt: key MinIO của ảnh KV chiến dịch (không phải text hiển thị) */
export const SITE_KV_KEY = "campaign_kv_key";

export const SITE_CONTENT_DEFAULTS = {
  // Hero
  hero_title: "Hãy gửi một lời thương cho xóm mình!",
  hero_body: COPY.heroBody,
  hero_search_placeholder: "Tìm kiếm khu phố của bạn tại đây",
  // Khối đóng góp
  board_title: "Đóng góp một câu cho khu phố mình nhé",
  board_hint: "Chọn một góc phố, để lại lời nhắn dễ thương và bình chọn cho lời thương ấm áp nhất",
  // Khối biển
  signs_title: "Lời nhắc khi lên biển trông như thế nào?",
  // Banner khuyến mãi in trên biển (SignCard)
  sign_promo_line1: "Đăng ký Internet nhanh",
  sign_promo_line2: "Xem Ngoại Hạng Anh cùng FPT",
  sign_sale_phone: "098.420.xxxx",
  sign_hotline: "1900.6600",
  // Khối ưu đãi
  lead_title: COPY.leadTitle,
  lead_body: COPY.leadBody,
  lead_privacy: COPY.leadPrivacy,
  // Footer
  footer_line1: "Một hoạt động thuộc chiến dịch “Khu phố biết thương” của FPT Telecom",
  footer_line2: "Nhắc · Nhở · Nhỏ · Nhẹ",
  footer_support: COPY.footerSupport,
  footer_tagline: COPY.ctaCampaign,
  // Khối TVC/KV — TẠM ẨN khỏi trang chủ (email 18/8), giữ nội dung để bật lại
  campaign_title: "Câu chuyện “Khu phố biết thương”",
  campaign_hint: "",
  /** Nhiều video, ngăn cách dấu phẩy — phát lần lượt. Key cũ campaign_youtube_id vẫn đọc được */
  campaign_youtube_ids: "M7lc1UVf-VE",
} as const;

export type SiteTextKey = keyof typeof SITE_CONTENT_DEFAULTS;
export const SITE_TEXT_KEYS = Object.keys(SITE_CONTENT_DEFAULTS) as SiteTextKey[];

/** Key video cũ (1 video) — vẫn dùng làm fallback khi chưa ai lưu danh sách mới */
export const LEGACY_VIDEO_KEY = "campaign_youtube_id";

/** Tách "id1, id2" hoặc URL YouTube đầy đủ → mảng videoId sạch */
export function parseYoutubeIds(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const m = s.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/)([\w-]{11})/);
      return m ? m[1] : s;
    })
    .filter((s) => /^[\w-]{11}$/.test(s));
}
