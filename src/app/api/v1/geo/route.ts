// Danh mục địa lý hành chính mới (1/7/2025) cho form CHỌN Tỉnh/Thành → Phường/Xã
// (dùng chung cho form đề xuất ngoài trang chủ lẫn form admin Khu phố).
// GET /api/v1/geo               → { provinces: [{code,name}] }  (34 tỉnh/thành)
// GET /api/v1/geo?province=79   → { wards: [{code,name}] }      (mã hoặc tên chính thức)
import { NextRequest, NextResponse } from "next/server";
import { getProvinces, getWards } from "@/lib/geo";

export const dynamic = "force-dynamic";

// Danh mục chỉ đổi khi có nghị quyết mới → cho cache CDN/trình duyệt 1 ngày
const CACHE = { "Cache-Control": "public, max-age=86400, s-maxage=86400" };

export async function GET(req: NextRequest) {
  const province = req.nextUrl.searchParams.get("province")?.trim();
  if (province) {
    return NextResponse.json({ wards: await getWards(province) }, { headers: CACHE });
  }
  return NextResponse.json({ provinces: await getProvinces() }, { headers: CACHE });
}
