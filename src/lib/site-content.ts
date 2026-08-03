// Nội dung trang chủ sửa được từ admin (/admin/noi-dung) — lưu key–value trong bảng
// site_content (migration 008), CHỈ lưu giá trị ghi đè; key vắng mặt → mặc định bên
// dưới (lấy từ copy.ts nên copy gốc vẫn là nguồn chuẩn). Ảnh KV chiến dịch lưu key
// MinIO ở row SITE_KV_KEY (public/site/...).
import { q } from "./db";
import { COPY } from "./copy";
import { imgUrl } from "./storage";
import type { SiteContentData } from "@/components/home/types";

/** Row đặc biệt: key MinIO của ảnh KV chiến dịch (không phải text hiển thị) */
export const SITE_KV_KEY = "campaign_kv_key";

export const SITE_CONTENT_DEFAULTS = {
  hero_title_1: COPY.heroTitle1,
  hero_title_2: COPY.heroTitle2,
  hero_body: COPY.heroBody,
  campaign_title: "Câu chuyện “Khu phố biết thương”",
  campaign_hint: "", // mặc định trống — admin có thể thêm dòng mô tả ở /admin/noi-dung
  campaign_youtube_id: "M7lc1UVf-VE", // video demo theo action list #19 — thay khi có TVC final
  lead_title: COPY.leadTitle,
  lead_body: COPY.leadBody,
  lead_privacy: COPY.leadPrivacy,
} as const;

export type SiteTextKey = keyof typeof SITE_CONTENT_DEFAULTS;
export const SITE_TEXT_KEYS = Object.keys(SITE_CONTENT_DEFAULTS) as SiteTextKey[];

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
  return { ...merged, campaign_kv_url: imgUrl(over[SITE_KV_KEY] || null) };
}
