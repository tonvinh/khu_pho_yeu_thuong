// Tiện ích dùng chung cho bộ test giao diện (jsdom).
// Mỗi file test tự khai `@vitest-environment jsdom` ở dòng đầu — cấu hình vitest
// vẫn để môi trường `node` cho bộ test logic cũ (four-n/phone/scoring/stylize).
import type { MapNeighborhood, SiteContentData } from "@/components/home/types";
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
