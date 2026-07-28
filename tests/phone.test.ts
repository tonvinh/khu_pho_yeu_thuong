// Chuẩn hoá & bảo vệ SĐT (02 §8, 07 §2.1)
import { describe, it, expect } from "vitest";
import { normalizePhone, looksFake, maskPhone, redactPhonesInText } from "@/lib/phone";

describe("normalizePhone", () => {
  it("chuẩn hoá các dạng nhập về +84", () => {
    expect(normalizePhone("0901234567")).toBe("+84901234567");
    expect(normalizePhone("+84901234567")).toBe("+84901234567");
    expect(normalizePhone("84901234567")).toBe("+84901234567");
    expect(normalizePhone("090 123 4567")).toBe("+84901234567");
    expect(normalizePhone("090-123-4567")).toBe("+84901234567");
  });
  it("từ chối số không hợp lệ", () => {
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("0111234567")).toBeNull(); // đầu số không tồn tại
    expect(normalizePhone("abc")).toBeNull();
    expect(normalizePhone("")).toBeNull();
  });
});

describe("looksFake — chặn dải số ảo (02 §8.4)", () => {
  it("chặn số lặp bất thường", () => {
    expect(looksFake("+84900000000")).toBe(true);
    expect(looksFake("+84911111111")).toBe(true);
  });
  it("số bình thường không bị chặn", () => {
    expect(looksFake("+84901234567")).toBe(false);
  });
});

describe("maskPhone — che SĐT trên admin (090***123)", () => {
  it("che phần giữa", () => {
    expect(maskPhone("+84901234567")).toBe("090***567");
  });
});

describe("redactPhonesInText — filter log (07 §2.1)", () => {
  it("xoá pattern giống SĐT khỏi log", () => {
    const out = redactPhonesInText("user 0901234567 và +84987654321 gửi lead");
    expect(out).not.toContain("0901234567");
    expect(out).not.toContain("84987654321");
  });
});
