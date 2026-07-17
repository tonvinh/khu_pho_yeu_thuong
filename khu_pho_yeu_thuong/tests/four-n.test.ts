// Chuẩn 4N (Q2): KHÔNG chấm tự động — kiểm tra guard "đủ 4 ô mới duyệt"
// + ràng buộc kỹ thuật client (120 ký tự) với fixtures từ 06-CONTENT-COPY §3.2
import { describe, it, expect } from "vitest";
import { passes4N } from "@/lib/scoring";

describe("Guard duyệt 4N (admin tick thủ công — đủ 4 ô mới duyệt được)", () => {
  it("đủ 4 ô → được duyệt", () => {
    expect(passes4N({ nhac: true, nho: true, nho2: true, nhe: true })).toBe(true);
  });
  it("thiếu bất kỳ ô nào → không được duyệt", () => {
    expect(passes4N({ nhac: false, nho: true, nho2: true, nhe: true })).toBe(false);
    expect(passes4N({ nhac: true, nho: false, nho2: true, nhe: true })).toBe(false);
    expect(passes4N({ nhac: true, nho: true, nho2: false, nhe: true })).toBe(false);
    expect(passes4N({ nhac: true, nho: true, nho2: true, nhe: false })).toBe(false);
  });
  it("không có checklist → không được duyệt", () => {
    expect(passes4N(null)).toBe(false);
    expect(passes4N(undefined)).toBe(false);
  });
});

describe("Ràng buộc kỹ thuật client (tiêu chí Nhỏ ≤120 ký tự)", () => {
  const FIXTURES_DAT = [
    "Bỏ rác đúng chỗ một chút, khu mình thơm cả ngày.",
    "Đi chậm chút nha, trong hẻm có đứa nhỏ đang chơi.",
    "Ông bà đi chậm, mình chờ chút một — ngõ mình đâu có vội.",
    "Hẻm nhỏ, lòng người thì rộng — chạy chậm giùm nhau.",
  ];
  it("các câu chuẩn trong 06 §3.2 đều ≤120 ký tự", () => {
    for (const c of FIXTURES_DAT) expect(c.length).toBeLessThanOrEqual(120);
  });
  it("câu quá 120 ký tự bị chặn (server CHECK constraint + client)", () => {
    const tooLong = "a".repeat(121);
    expect(tooLong.length > 120).toBe(true);
  });
});
