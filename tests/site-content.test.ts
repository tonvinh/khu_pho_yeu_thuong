// Bộ khoá nội dung sửa được ở /admin/noi-dung.
// QC 4/9 · D3: 4 khoá campaign_* (khối TVC + ảnh KV) đã GỠ HẲN vì khối đó không còn
// trên trang chủ — để lại thì admin sửa được thứ không hiển thị ở đâu.
import { describe, expect, it } from "vitest";
import { SITE_CONTENT_DEFAULTS, SITE_TEXT_KEYS } from "@/lib/site-content-defaults";

describe("site content · bộ khoá", () => {
  it("KHÔNG còn khoá campaign_* nào", () => {
    const campaign = SITE_TEXT_KEYS.filter((k) => k.startsWith("campaign"));
    expect(campaign).toEqual([]);
  });

  it("giữ đúng 13 khoá của các khối đang có trên trang chủ", () => {
    expect([...SITE_TEXT_KEYS].sort()).toEqual([
      "board_hint", "board_title",
      "footer_line1", "footer_line2", "footer_support", "footer_tagline",
      "hero_body", "hero_search_placeholder", "hero_title",
      "lead_body", "lead_privacy", "lead_title",
      "signs_title",
    ]);
  });

  it("mọi khoá đều có giá trị mặc định là chuỗi (rơi về copy gốc khi admin bỏ trống)", () => {
    for (const k of SITE_TEXT_KEYS) expect(typeof SITE_CONTENT_DEFAULTS[k]).toBe("string");
  });
});
