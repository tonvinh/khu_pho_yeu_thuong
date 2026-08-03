// Địa lý hành chính MỚI (Nghị quyết sáp nhập, hiệu lực 1/7/2025):
// cả nước còn 34 tỉnh/thành phố, bỏ cấp quận/huyện — dưới tỉnh là thẳng phường/xã.
// Dùng cho form admin (select Tỉnh/Thành phố) — Phường/Xã nhập tay vì danh mục
// ~3.300 đơn vị quá lớn để nhúng client.
export const PROVINCES = [
  "TP. Hà Nội",
  "TP. Hồ Chí Minh",
  "TP. Hải Phòng",
  "TP. Đà Nẵng",
  "TP. Cần Thơ",
  "TP. Huế",
  "An Giang",
  "Bắc Ninh",
  "Cà Mau",
  "Cao Bằng",
  "Điện Biên",
  "Đắk Lắk",
  "Đồng Nai",
  "Đồng Tháp",
  "Gia Lai",
  "Hà Tĩnh",
  "Hưng Yên",
  "Khánh Hòa",
  "Lai Châu",
  "Lâm Đồng",
  "Lạng Sơn",
  "Lào Cai",
  "Nghệ An",
  "Ninh Bình",
  "Phú Thọ",
  "Quảng Ngãi",
  "Quảng Ninh",
  "Quảng Trị",
  "Sơn La",
  "Tây Ninh",
  "Thái Nguyên",
  "Thanh Hóa",
  "Tuyên Quang",
  "Vĩnh Long",
] as const;

export function isProvince(s: string): boolean {
  return (PROVINCES as readonly string[]).includes(s);
}

/** Validate phần địa lý hành chính mới — trả thông báo lỗi hoặc null nếu hợp lệ */
export function geoError(city: unknown, ward: unknown): string | null {
  if (city != null && String(city).trim() && !isProvince(String(city).trim())) {
    return "Tỉnh/Thành phố không có trong danh sách 34 tỉnh/thành (địa giới từ 1/7/2025)";
  }
  if (ward != null && String(ward).trim().length > 120) return "Tên Phường/Xã tối đa 120 ký tự";
  return null;
}
