// Nội dung trang chủ sửa được từ admin (/admin/noi-dung) — lưu key–value trong bảng
// site_content (migration 008), CHỈ lưu giá trị ghi đè; key vắng mặt → mặc định bên
// dưới (lấy từ copy.ts nên copy gốc vẫn là nguồn chuẩn). Ảnh KV chiến dịch lưu key
// MinIO ở row SITE_KV_KEY (public/site/...).
//
// 18/8 — skin mới (docs/lp): bộ key bám theo các khối trong design. Key cũ
// hero_title_1/hero_title_2 gộp thành hero_title; thêm text khối đóng góp, khối biển,
// footer, banner khuyến mãi in trên biển, và DANH SÁCH video (campaign_youtube_ids)
// thay cho 1 video duy nhất.
import { q } from "./db";
import { COPY } from "./copy";
import { imgUrl } from "./storage";
import type { SiteContentData } from "@/components/home/types";

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
const LEGACY_VIDEO_KEY = "campaign_youtube_id";

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

/** Toàn bộ ghi đè đang lưu (gồm cả row ảnh KV) — dùng cho API admin */
export async function getSiteOverrides(): Promise<Record<string, string>> {
  const rows = await q<{ key: string; value: string }>(`SELECT key, value FROM site_content`);
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

/** Nội dung hoàn chỉnh cho trang chủ: mặc định + ghi đè, kèm URL ảnh KV (null → placeholder) */
export async function getSiteContent(): Promise<SiteContentData> {
  const over = await getSiteOverrides();
  const merged = Object.fromEntries(
    SITE_TEXT_KEYS.map((k) => [k, over[k] || SITE_CONTENT_DEFAULTS[k]])
  ) as Record<SiteTextKey, string>;
  // Chưa ai lưu danh sách mới nhưng còn ghi đè video cũ → dùng lại giá trị cũ
  const rawIds = over.campaign_youtube_ids || over[LEGACY_VIDEO_KEY] || SITE_CONTENT_DEFAULTS.campaign_youtube_ids;
  return {
    ...merged,
    campaign_youtube_ids: parseYoutubeIds(rawIds),
    campaign_kv_url: imgUrl(over[SITE_KV_KEY] || null),
  };
}
