// QC 2/9 · C1 + C2 — hai sai lệch Figma nằm ở tầng CSS.
//  · C1: `.kp-h2 { letter-spacing: -0.01em }` khai báo NGOÀI @layer nên thắng utility
//    `tracking-[-0.03em]` của Tailwind — hero và tiêu đề section đều ra -1% thay vì
//    -3% / -2%. Cùng cái bẫy đã xử lý cho line-height nhưng bỏ sót letter-spacing.
//  · C2: `.kp-input` dùng padding 9px + viền 1.5px nên cao ~44px, .fig vẽ 40px.
// jsdom không dựng cascade từ file .css nên kiểm thẳng trên văn bản stylesheet:
// khai báo có tồn tại và có đứng SAU .kp-h2 hay không (cùng specificity → sau thì thắng).
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const CSS = readFileSync(path.resolve(__dirname, "../src/app/globals.css"), "utf8");

/** Vị trí ký tự của một selector trong file (−1 nếu không có) */
const at = (selector: string) => CSS.indexOf(selector);

/** Thân của khối `selector { ... }` đầu tiên tính từ vị trí `from` */
function block(selector: string, from = 0): string {
  const i = CSS.indexOf(selector, from);
  if (i < 0) return "";
  const open = CSS.indexOf("{", i);
  return CSS.slice(open + 1, CSS.indexOf("}", open));
}

describe("C1 — letter-spacing tiêu đề", () => {
  it("có class riêng cho hero / section / khối ưu đãi với đúng số của .fig", () => {
    expect(block(".kp-hero-title")).toContain("letter-spacing: -0.03em");
    expect(block(".kp-sec-title")).toContain("letter-spacing: -0.02em");
    expect(block(".kp-lead-title")).toContain("letter-spacing: -0.02em");
  });

  it("ba class đó khai báo SAU .kp-h2 nên thắng được -0.01em", () => {
    const h2 = at(".kp-h2 {");
    expect(h2).toBeGreaterThan(-1);
    for (const cls of [".kp-hero-title", ".kp-sec-title", ".kp-lead-title"]) {
      expect(at(cls)).toBeGreaterThan(h2);
    }
  });

  it("letter-spacing đặt ngoài @media nên đúng ở mọi khổ màn hình", () => {
    // khối .kp-hero-title đầu tiên (ngoài @media) phải là khối letter-spacing
    expect(block(".kp-hero-title")).toContain("letter-spacing");
    // khối line-height cũ trong @media vẫn còn nguyên
    const inMedia = CSS.indexOf(".kp-hero-title", at(".kp-hero-title") + 1);
    expect(block(".kp-hero-title", inMedia)).toContain("line-height: 56px");
  });
});

describe("C2 — chiều cao ô nhập", () => {
  it(".kp-input chốt height thay vì để padding tự đẩy lên ~44px", () => {
    const base = block(".kp-input {");
    expect(base).toContain("height: 44px"); // mobile: giữ vùng chạm 44 (quy chuẩn 2/9)
    expect(base).toContain("padding: 0 16px");
    expect(base).not.toContain("padding: 9px 16px");
  });

  it("từ sm (640px) hạ về đúng 40px như .fig", () => {
    const i = CSS.indexOf("@media (min-width: 640px)", at(".kp-input {"));
    expect(block(".kp-input {", i)).toContain("height: 40px");
  });

  it("từ sm phải nhả luôn min-height, nếu không `.tap` (44px) đè mất height 40px", () => {
    const i = CSS.indexOf("@media (min-width: 640px)", at(".kp-input {"));
    expect(block(".kp-input {", i)).toContain("min-height: 0");
  });

  it("textarea trả lại chiều cao tự do + padding dọc (không dính height cố định)", () => {
    const ta = block("textarea.kp-input,");
    expect(ta).toContain("height: auto");
    expect(ta).toContain("padding: 9px 16px");
  });

  it(".kp-input-lg (ô trong popup) vẫn 50px, textarea 90px — không đụng tới", () => {
    expect(block(".kp-input-lg {")).toContain("height: 50px");
    expect(block("textarea.kp-input-lg")).toContain("height: 90px");
  });

  // QC 7/9 — hai khối trên chỉ có tác dụng nếu khai báo SAU hai rule đè nó. Trước khi
  // sửa, ô popup đo trên Chrome ra 40px và textarea 95.4px dù CSS ghi 50/90.
  it(".kp-input-lg khai báo SAU @media(sm){.kp-input{height:40px}} nên không bị đè", () => {
    const media = CSS.indexOf("@media (min-width: 640px)", at(".kp-input {"));
    expect(media).toBeGreaterThan(-1);
    expect(at(".kp-input-lg {")).toBeGreaterThan(media);
  });

  it("textarea.kp-input-lg khai báo SAU textarea.kp-input{height:auto} (cùng specificity)", () => {
    expect(at("textarea.kp-input-lg")).toBeGreaterThan(at("textarea.kp-input,"));
  });
});

describe("Nút trong dòng danh sách — chữ không được xuống 2 dòng", () => {
  it(".kp-btn-row chốt 14px + nowrap (khung .fig rộng cố định 120/137/119)", () => {
    const b = block(".kp-btn-row {");
    expect(b).toContain("font-size: 14px");
    expect(b).toContain("white-space: nowrap");
  });

  it("khai báo SAU .kp-btn — cùng bẫy C1: .kp-btn ngoài @layer đè utility text-[14px]", () => {
    const base = at(".kp-btn {");
    expect(base).toBeGreaterThan(-1);
    expect(at(".kp-btn-row {")).toBeGreaterThan(base);
    expect(block(".kp-btn {")).toContain("font-size: 15px");
  });
});

describe("Dropdown ô tra cứu — .fig `Frame 261`", () => {
  it(".kp-lookup-panel là LỚP NỔI (absolute) nên không đẩy dải 3 con số xuống", () => {
    const b = block(".kp-lookup-panel");
    expect(b).toContain("position: absolute");
    expect(b).toContain("border-radius: 16px");
    // cách ô nhập 8px, chiếm đúng bề ngang 816 của khối tra cứu (left/right = 0 từ sm)
    expect(b).toContain("margin-top: 8px");
  });
});

describe("Chip số của tab — QC 8/9 'số không nằm giữa ô tròn'", () => {
  it(".kp-num-mid kéo số xuống 0.077em để nằm đúng tâm vòng tròn", () => {
    const b = block(".kp-num-mid");
    expect(b).toContain("translateY(0.077em)");
    // phải là block, nếu không transform trên inline không dịch được hộp dòng
    expect(b).toContain("display: block");
  });
});
