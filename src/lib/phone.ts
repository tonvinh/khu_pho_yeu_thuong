// Chuẩn hoá & kiểm tra SĐT Việt Nam. SĐT gốc KHÔNG BAO GIỜ được log/trả về client.

/** Chuẩn hoá về dạng +84xxxxxxxxx. Trả về null nếu không hợp lệ. */
export function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  let s = raw.replace(/[\s.\-()]/g, "");
  if (s.startsWith("+84")) s = "0" + s.slice(3);
  else if (s.startsWith("84") && s.length >= 10) s = "0" + s.slice(2);
  if (!/^0\d{9}$/.test(s)) return null;
  // Đầu số di động VN hiện hành: 03x, 05x, 07x, 08x, 09x
  if (!/^0(3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])\d{7}$/.test(s)) return null;
  return "+84" + s.slice(1);
}

/** Chặn dải số ảo bất thường (0900000000, 0911111111...) — 02 §8.4 */
export function looksFake(normalized: string): boolean {
  const digits = normalized.replace("+84", "0");
  const tail = digits.slice(3); // 7 số cuối
  return /(\d)\1{5,}/.test(tail); // 6+ số giống nhau liên tiếp
}

/** Che SĐT hiển thị admin: +84901234567 → 090***567 (07 §2.1) */
export function maskPhone(normalized: string): string {
  const local = normalized.startsWith("+84") ? "0" + normalized.slice(3) : normalized;
  if (local.length < 6) return "***";
  return local.slice(0, 3) + "***" + local.slice(-3);
}

/** Lọc pattern giống SĐT trước khi ghi log (07 §2.1) */
export function redactPhonesInText(text: string): string {
  return text.replace(/(\+?84|0)\d{8,10}/g, "0*********");
}
