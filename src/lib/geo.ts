// Danh mục địa lý hành chính MỚI (hiệu lực 1/7/2025) — đọc từ bảng provinces/wards
// (migration 009, nguồn Quyết định 19/2025/QĐ-TTg + Công văn 915/CTK-CSCL Cục Thống kê).
// Thay cho danh sách tĩnh vn-geo.ts cũ: 34 tỉnh/thành + 3.321 phường/xã, chọn thay vì nhập.
// neighborhoods vẫn lưu TÊN (city/ward) — đã kiểm chứng: không có phường/xã trùng tên
// trong cùng một tỉnh nên tên là đủ để đối chiếu ngược về danh mục.
import { q } from "./db";

export interface GeoUnit {
  code: string;
  name: string;
}

export async function getProvinces(): Promise<GeoUnit[]> {
  return q<GeoUnit>(`SELECT code, name FROM provinces ORDER BY code`);
}

/** Phường/xã của một tỉnh — nhận mã ("79") hoặc tên chính thức ("Thành phố Hồ Chí Minh") */
export async function getWards(province: string): Promise<GeoUnit[]> {
  const rows = await q<GeoUnit>(
    `SELECT w.code, w.name FROM wards w
     JOIN provinces p ON p.code = w.province_code
     WHERE p.code = $1 OR p.name = $1`,
    [province]
  );
  // Sắp tiếng Việt bằng ICU của Node (collation "vi" trong Postgres không chắc có sẵn)
  return rows.sort((a, b) => a.name.localeCompare(b.name, "vi"));
}

/** Validate Tỉnh/Thành + Phường/Xã theo danh mục chính thức — thông báo lỗi hoặc null */
export async function geoError(city: unknown, ward: unknown): Promise<string | null> {
  const cityName = city == null ? "" : String(city).trim();
  const wardName = ward == null ? "" : String(ward).trim();
  if (!cityName && !wardName) return null;
  if (!cityName) return "Chọn Tỉnh/Thành phố trước khi chọn Phường/Xã";
  const prov = await q<{ code: string }>(
    `SELECT code FROM provinces WHERE name = $1`, [cityName]
  );
  if (!prov[0]) {
    return "Tỉnh/Thành phố không có trong danh mục 34 tỉnh/thành (địa giới từ 1/7/2025)";
  }
  if (!wardName) return null;
  const w = await q(
    `SELECT 1 FROM wards WHERE province_code = $1 AND name = $2`,
    [prov[0].code, wardName]
  );
  if (!w[0]) {
    return `Phường/Xã không thuộc danh mục của ${cityName} (địa giới từ 1/7/2025)`;
  }
  return null;
}
