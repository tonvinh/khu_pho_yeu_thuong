// Nội dung trang chủ sửa được từ admin (/admin/noi-dung) — lưu key–value trong bảng
// site_content (migration 008), CHỈ lưu giá trị ghi đè; key vắng mặt → mặc định trong
// ./site-content-defaults (lấy từ copy.ts nên copy gốc vẫn là nguồn chuẩn). Ảnh KV
// chiến dịch lưu key MinIO ở row SITE_KV_KEY (public/site/...).
//
// 18/8 — skin mới (docs/lp): bộ key bám theo các khối trong design. Key cũ
// hero_title_1/hero_title_2 gộp thành hero_title; thêm text khối đóng góp, khối biển,
// footer, banner khuyến mãi in trên biển, và DANH SÁCH video (campaign_youtube_ids)
// thay cho 1 video duy nhất.
//
// File này CHẠM db + storage nên chỉ server import được. Client component cần hằng số
// thì import "./site-content-defaults" (xem lý do trong file đó).
import { q } from "./db";
import { imgUrl } from "./storage";
import type { SiteContentData } from "@/components/home/types";
import {
  LEGACY_VIDEO_KEY,
  parseYoutubeIds,
  SITE_CONTENT_DEFAULTS,
  SITE_KV_KEY,
  SITE_TEXT_KEYS,
  type SiteTextKey,
} from "./site-content-defaults";

// Re-export để server code cũ import từ đây vẫn chạy nguyên
export {
  SITE_CONTENT_DEFAULTS,
  SITE_KV_KEY,
  SITE_TEXT_KEYS,
  parseYoutubeIds,
  type SiteTextKey,
};

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
