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

export const SITE_CONTENT_DEFAULTS = {
  // Hero
  hero_title: "Hãy gửi một lời thương cho xóm mình nhé!",
  hero_body: COPY.heroBody,
  hero_search_placeholder: "Tìm kiếm khu phố của bạn tại đây",
  // Khối đóng góp
  board_title: "Đóng góp một câu cho khu phố mình nhé",
  // Figma bản 2/9 · B4: mô tả dài thành 2 dòng (x=296 y=1417 w=848 h=48) — bản 18/8
  // mới có vế đầu nên card danh sách bị đẩy lên 64px so với design.
  board_hint:
    "Chọn một góc phố, để lại lời nhắn dễ thương và bình chọn cho lời thương ấm áp nhất. " +
    "Câu được nhiều lượt “Thương” nhất sẽ được đưa lên biển treo tại khu phố",
  // Khối biển
  signs_title: "Lời nhắc khi lên biển trông như thế nào?",
  // Khối ưu đãi
  lead_title: COPY.leadTitle,
  lead_body: COPY.leadBody,
  lead_privacy: COPY.leadPrivacy,
  // Footer
  footer_line1: "Một hoạt động thuộc chiến dịch “Khu phố biết thương” của FPT Telecom",
  footer_line2: "Nhắc · Nhở · Nhỏ · Nhẹ",
  footer_support: COPY.footerSupport,
  footer_tagline: COPY.ctaCampaign,
  // 4/9 (D3): 4 khoá campaign_* (tiêu đề/mô tả/video TVC/ảnh KV) ĐÃ GỠ — khối
  // "Câu chuyện Khu phố biết thương" bỏ khỏi trang chủ từ 18/8 và component
  // CampaignMedia đã xoá 2/9, để lại thì admin sửa được thứ không hiện ở đâu
  // (đúng loại trường chết đã dọn với sign_promo_* hôm 3/9). Hàng cũ trong bảng
  // site_content chỉ bị lơ đi, không cần migration. Chuỗi copy vẫn nằm ở copy.ts.
} as const;

export type SiteTextKey = keyof typeof SITE_CONTENT_DEFAULTS;
export const SITE_TEXT_KEYS = Object.keys(SITE_CONTENT_DEFAULTS) as SiteTextKey[];

