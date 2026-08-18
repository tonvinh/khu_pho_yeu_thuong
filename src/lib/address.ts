// Địa chỉ hiển thị 'Tên hẻm – Phường – Tỉnh' (dieuchinh.1.8 #6) — dùng được cả client.
export function formatAddress(...parts: Array<string | null | undefined>): string {
  return parts
    .map((p) => (p || "").trim())
    .filter(Boolean)
    .join(" – ");
}

/**
 * Dạng RÚT GỌN cho pill địa chỉ trên ảnh slider (design lp1: "P. Hội An, TP. Đà Nẵng").
 * Danh mục hành chính lưu tên đầy đủ ("Phường Bàn Cờ", "Thành phố Hồ Chí Minh") nên pill
 * bị dài gấp đôi design nếu in nguyên; ngoài ra bỏ luôn phần trùng tên khu phố.
 */
export function shortAddress(
  ward: string | null | undefined,
  city: string | null | undefined,
  skip?: string | null
): string {
  const abbr = (s: string) =>
    s
      .replace(/^Thành phố\s+/i, "TP. ")
      .replace(/^Tỉnh\s+/i, "")
      .replace(/^Phường\s+/i, "P. ")
      .replace(/^Xã\s+/i, "X. ")
      .replace(/^Thị trấn\s+/i, "TT. ");
  const norm = (s: string) => s.trim().toLowerCase();
  return [ward, city]
    .map((p) => (p || "").trim())
    .filter((p) => p && (!skip || norm(p) !== norm(skip)))
    .map(abbr)
    .join(", ");
}
