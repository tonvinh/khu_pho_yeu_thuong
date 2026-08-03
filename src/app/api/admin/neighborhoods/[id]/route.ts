// Cập nhật thông tin & trạng thái khu phố (yêu cầu 3/8):
// name/ward/city (địa lý hành chính mới) + visible (hiển thị website) + is_featured
// (block "Khu phố tiêu biểu" — CHỈ có hiệu lực khi đang hiển thị trên website)
// + featured_position (vị trí trong block tiêu biểu — chỉ khi đang tiêu biểu).
import { NextRequest, NextResponse } from "next/server";
import { one } from "@/lib/db";
import { jsonError, requireAdmin } from "@/lib/api";
import { geoError } from "@/lib/vn-geo";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return jsonError(400, "Thiếu dữ liệu");

  const nb = await one<{ id: string; name: string; ward: string | null; city: string | null; hidden: boolean; is_featured: boolean; featured_position: number | null }>(
    `SELECT id, name, ward, city, hidden, is_featured, featured_position FROM neighborhoods WHERE id = $1`, [id]
  );
  if (!nb) return jsonError(404, "Không tìm thấy khu phố");

  const name = body.name !== undefined ? String(body.name).trim() : nb.name;
  const ward = body.ward !== undefined ? String(body.ward).trim() || null : nb.ward;
  const city = body.city !== undefined ? String(body.city).trim() || null : nb.city;
  if (!name) return jsonError(400, "Tên khu phố không được để trống");
  if (name.length > 200) return jsonError(400, "Tên khu phố tối đa 200 ký tự");
  const geoErr = geoError(city, ward);
  if (geoErr) return jsonError(400, geoErr);

  const hidden = body.visible !== undefined ? body.visible !== true : nb.hidden;
  // Tiêu biểu chỉ có hiệu lực khi đang hiển thị: ẩn website → tự tắt tiêu biểu
  let isFeatured = body.is_featured !== undefined ? body.is_featured === true : nb.is_featured;
  if (hidden) {
    if (body.is_featured === true) {
      return jsonError(409, "Khu phố đang ẩn khỏi website — bật 'Hiển thị trên website' trước khi chọn tiêu biểu");
    }
    isFeatured = false;
  }

  // Vị trí trong block tiêu biểu: số nguyên ≥ 1 hoặc null (chưa xếp — đứng cuối theo tên)
  let featuredPos = nb.featured_position;
  if (body.featured_position !== undefined) {
    if (body.featured_position === null || body.featured_position === "") {
      featuredPos = null;
    } else {
      const pos = Number(body.featured_position);
      if (!Number.isInteger(pos) || pos < 1 || pos > 999) {
        return jsonError(400, "Vị trí hiển thị phải là số nguyên từ 1 đến 999");
      }
      if (!isFeatured) {
        return jsonError(409, "Khu phố chưa bật 'Khu phố tiêu biểu' — bật trước rồi mới xếp vị trí");
      }
      featuredPos = pos;
    }
  }
  if (!isFeatured) featuredPos = null; // bỏ tiêu biểu → xoá vị trí

  const updated = await one(
    `UPDATE neighborhoods SET name=$2, ward=$3, city=$4, hidden=$5, is_featured=$6,
       featured_position=$7
     WHERE id=$1 RETURNING id`,
    [id, name, ward, city, hidden, isFeatured, featuredPos]
  ).catch(() => null);
  if (!updated) return jsonError(409, "Tên khu phố trùng với khu phố khác");
  return NextResponse.json({ ok: true });
}
