// Địa chỉ hiển thị 'Tên hẻm – Phường – Tỉnh' (dieuchinh.1.8 #6) — dùng được cả client.
export function formatAddress(...parts: Array<string | null | undefined>): string {
  return parts
    .map((p) => (p || "").trim())
    .filter(Boolean)
    .join(" – ");
}
