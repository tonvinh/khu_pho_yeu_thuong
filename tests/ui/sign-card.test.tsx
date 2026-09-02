// @vitest-environment jsdom
// Biển "Khu phố biết thương" — QC Figma bản 2/9 · khối biển (docs/22 §B5 bổ sung).
//
// docs/22 §B5 kết luận "khớp, không cần sửa" nhưng chỉ đối chiếu TOẠ ĐỘ y=2186, không
// đối chiếu CHIỀU CAO. Đo trên Chrome: khối biển cao 872 vs Figma 648 (+224px), do mỗi
// ô 330 vs 262 — tấm biển đang dựng tỉ lệ 404/269 của bản 18/8.
//
// .fig bản 2/9: `INT - EPL-01 1` là 404×199 r=8, `Frame 226` (ô) = biển 199 + gap 16 +
// caption 46 = 262. Đối chiếu ảnh export `docs/lp/Landing page.png`: panel trắng nở ra
// chiếm ~95% chiều cao biển và DẢI KHUYẾN MÃI Ở ĐÁY BIẾN MẤT (ô QR fpt.vn, 2 dòng
// banner, 2 chip số, artwork FPT Play).
//
// Quyết định 3/9: bỏ hẳn dải khuyến mãi và gỡ luôn 4 trường admin đổ vào nó
// (sign_promo_line1/2, sign_sale_phone, sign_hotline) để không để lại trường chết.
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import SignCard from "@/components/home/SignCard";
import SignGallery from "@/components/home/SignGallery";
import { SITE_CONTENT_DEFAULTS } from "@/lib/site-content-defaults";
import type { ApprovedSign } from "@/components/home/types";
import { siteContent } from "./helpers";

afterEach(cleanup);

const sign = (over: Partial<ApprovedSign> = {}): ApprovedSign => ({
  id: "s1",
  content: "Một lời chào hỏi, ấm cả xóm giềng",
  author_name: "Trà - FPT Telecom",
  location_text: "Hẻm 42",
  category: "ngo_nho_nha_toi",
  neighborhood_name: "Phường Bàn Cờ",
  votes: 5,
  approved_at: "2026-09-01T00:00:00.000Z",
  ...over,
});

describe("SignCard — tỉ lệ và ruột theo .fig bản 2/9", () => {
  it("tỉ lệ biển là 404/199, không còn 404/269 của bản 18/8", () => {
    const { container } = render(<SignCard content="Đi chậm chút nha" />);
    const card = container.firstElementChild!;
    expect(card.className).toContain("aspect-[404/199]");
    expect(card.className).not.toContain("404/269");
  });

  it("KHÔNG còn dải khuyến mãi: mất ô QR fpt.vn, 2 chip số và artwork FPT Play", () => {
    const { container } = render(<SignCard content="Đi chậm chút nha" />);
    expect(container.textContent).not.toContain("fpt.vn");
    expect(container.textContent).not.toContain("Liên hệ");
    expect(container.textContent).not.toContain("Hotline");
    expect(container.querySelector('img[src*="sign-fptplay"]')).toBeNull();
  });

  it("giữ lockup logo và câu nhắc — phần design vẫn vẽ", () => {
    const { container } = render(<SignCard content="Đi chậm chút nha" />);
    expect(container.querySelector('img[src="/brand/sign-logos.webp"]')).toBeTruthy();
    expect(screen.getByText("Đi chậm chút nha")).toBeTruthy();
  });

  it("panel trắng chiếm gần hết biển (đo export: cao ~95%, không phải 68%)", () => {
    const { container } = render(<SignCard content="X" />);
    const panel = container.querySelector(".bg-white")!;
    expect(panel.className).not.toContain("h-[68%]");
    expect(panel.className).toMatch(/bottom-\[/);
  });
});

describe("SignCard — cỡ chữ co theo độ dài câu", () => {
  // Panel mới thấp hơn (199 vs 269) mà design lại vẽ chữ TO hơn vì chỉ có câu 2 dòng.
  // Câu thật dài tới 120 ký tự (trần ô nhập) — để cỡ cố định là tràn khỏi panel, đo
  // trên Chrome thấy câu 3–4 dòng bị cắt cụt đáy.
  const size = (content: string) => {
    const { container } = render(<SignCard content={content} />);
    return (container.querySelector("p") as HTMLElement).style.fontSize;
  };

  it("câu ngắn giữ đúng cỡ của .fig (9.6cqw)", () => {
    expect(size("Một lời chào hỏi, ấm cả xóm giềng")).toContain("9.6cqw");
  });

  it("câu trung bình thu xuống một bậc", () => {
    expect(size("Hẻm nhỏ, lòng người thì rộng — chạy chậm lại một chút nha bà con")).toContain("7.4cqw");
  });

  it("biên: câu 120 ký tự (trần ô nhập) dùng bậc nhỏ nhất", () => {
    expect(size("x".repeat(120))).toContain("6.2cqw");
  });

  it("biên: đúng 45 ký tự vẫn ở bậc lớn nhất, 46 thì xuống bậc", () => {
    expect(size("x".repeat(45))).toContain("9.6cqw");
    expect(size("x".repeat(46))).toContain("7.4cqw");
  });

  it("khoảng trắng thừa hai đầu không làm tụt bậc", () => {
    expect(size("   " + "x".repeat(45) + "   ")).toContain("9.6cqw");
  });

  it("chữ được phép co trong flex (min-h-0) để không đẩy tràn panel", () => {
    const { container } = render(<SignCard content="X" />);
    expect(container.querySelector("p")!.className).toContain("min-h-0");
  });
});

describe("SignGallery — khối biển", () => {
  it("render 6 ô, mỗi ô có biển + caption chủ đề/phường/người viết", () => {
    const { container } = render(<SignGallery signs={[sign()]} content={siteContent()} />);
    expect(container.querySelectorAll(".kp-sign")).toHaveLength(6);
    expect(screen.getByText("Phường Bàn Cờ")).toBeTruthy();
    expect(screen.getByText("Trà - FPT Telecom")).toBeTruthy();
  });

  it("không còn truyền nội dung khuyến mãi xuống biển", () => {
    const { container } = render(<SignGallery signs={[sign()]} content={siteContent()} />);
    expect(container.textContent).not.toContain("1900.6600");
    expect(container.textContent).not.toContain("Đăng ký Internet nhanh");
  });

  it("lưới 3 cột, gap 32 và cách tiêu đề 40 như .fig Frame 230/232", () => {
    const { container } = render(<SignGallery signs={[]} content={siteContent()} />);
    const grid = container.querySelector(".grid")!;
    expect(grid.className).toContain("lg:grid-cols-3");
    expect(grid.className).toContain("gap-8");   // 32px
    expect(grid.className).toContain("sm:mt-10"); // 40px
  });
});

describe("site content — đã gỡ bộ khoá khuyến mãi trên biển", () => {
  it("SITE_CONTENT_DEFAULTS không còn 4 khoá của dải khuyến mãi", () => {
    const keys = Object.keys(SITE_CONTENT_DEFAULTS);
    for (const k of ["sign_promo_line1", "sign_promo_line2", "sign_sale_phone", "sign_hotline"]) {
      expect(keys).not.toContain(k);
    }
  });

  it("vẫn giữ tiêu đề khối biển", () => {
    expect(SITE_CONTENT_DEFAULTS.signs_title).toBeTruthy();
  });
});
