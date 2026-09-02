// Địa chỉ hiển thị 'Tên hẻm – Phường – Tỉnh' (dieuchinh.1.8 #6) — dùng được cả client.
export function formatAddress(...parts: Array<string | null | undefined>): string {
  return parts
    .map((p) => (p || "").trim())
    .filter(Boolean)
    .join(" – ");
}

/**
 * Dạng "Phường Bàn Cờ, TP. Hồ Chí Minh" — GIỮ NGUYÊN tên phường, chỉ viết tắt tỉnh.
 * Figma bản 2/9 dùng dạng này ở dòng địa chỉ dưới tên khu phố (B9), dưới tên cây bút
 * (B10) và trong dropdown tra cứu (B3a). Khác `shortAddress` ở chỗ không rút "Phường"
 * thành "P." và không bỏ phần trùng tên khu phố — hai chỗ đó tên khu phố CHÍNH LÀ tên
 * phường nên bỏ đi thì dòng địa chỉ trống một nửa.
 */
export function wardAddress(
  ward: string | null | undefined,
  city: string | null | undefined
): string {
  const shortCity = (city || "")
    .trim()
    .replace(/^Thành phố\s+/i, "TP. ")
    .replace(/^Tỉnh\s+/i, "");
  return [(ward || "").trim(), shortCity].filter(Boolean).join(", ");
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
