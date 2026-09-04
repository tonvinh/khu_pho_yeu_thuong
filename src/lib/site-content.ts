// Nội dung trang chủ sửa được từ admin (/admin/noi-dung) — lưu key–value trong bảng
// site_content (migration 008), CHỈ lưu giá trị ghi đè; key vắng mặt → mặc định trong
// ./site-content-defaults (lấy từ copy.ts nên copy gốc vẫn là nguồn chuẩn).
//
// 18/8 — skin mới (docs/lp): bộ key bám theo các khối trong design. Key cũ
// hero_title_1/hero_title_2 gộp thành hero_title; thêm text khối đóng góp, khối biển,
// footer.
//
// 4/9 (QC · D3): gỡ 4 khoá campaign_* (TVC + ảnh KV) vì khối đó không còn trên trang chủ.
//
// File này CHẠM db + storage nên chỉ server import được. Client component cần hằng số
// thì import "./site-content-defaults" (xem lý do trong file đó).
import { q } from "./db";
import type { SiteContentData } from "@/components/home/types";
import {
  SITE_CONTENT_DEFAULTS,
  SITE_TEXT_KEYS,
  type SiteTextKey,
} from "./site-content-defaults";

// Re-export để server code cũ import từ đây vẫn chạy nguyên
export { SITE_CONTENT_DEFAULTS, SITE_TEXT_KEYS, type SiteTextKey };

/** Toàn bộ ghi đè đang lưu — dùng cho API admin */
export async function getSiteOverrides(): Promise<Record<string, string>> {
  const rows = await q<{ key: string; value: string }>(`SELECT key, value FROM site_content`);
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

/** Nội dung hoàn chỉnh cho trang chủ: mặc định + ghi đè */
export async function getSiteContent(): Promise<SiteContentData> {
  const over = await getSiteOverrides();
  return Object.fromEntries(
    SITE_TEXT_KEYS.map((k) => [k, over[k] || SITE_CONTENT_DEFAULTS[k]])
  ) as unknown as SiteContentData;
}
