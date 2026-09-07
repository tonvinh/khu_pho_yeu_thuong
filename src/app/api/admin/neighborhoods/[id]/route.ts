// Cập nhật thông tin & trạng thái khu phố (yêu cầu 3/8, sửa 7/9):
// name/ward/city (địa lý hành chính mới) + visible (hiển thị website) + is_featured
// (block "Khu phố tiêu biểu" ở hero) + featured_position (SLOT slide 1..10)
// + certified_4n (đạt chuẩn 4N) + xoá mềm / khôi phục.
//
// 7/9: BỎ mọi ràng buộc chéo giữa 3 trạng thái (yêu cầu "cho phép tuỳ chỉnh trạng thái
// không cần điều kiện"). Trước đây bật tiêu biểu bắt buộc phải đang hiển thị website, và
// ẩn website thì tự tắt tiêu biểu — nay admin bật/tắt độc lập, chỉ còn ghi chú cảnh báo
// ở UI. Điều kiện 100% biển đã treo của 4N cũng bỏ (xem ./certify/route.ts).
import { NextRequest, NextResponse } from "next/server";
import { one, tx } from "@/lib/db";
import { jsonError, requireAdmin } from "@/lib/api";
import { geoError } from "@/lib/geo";
import { FEATURED_SLOTS } from "@/lib/featured";

export const dynamic = "force-dynamic";

interface NbRow {
  id: string; name: string; ward: string | null; city: string | null;
  hidden: boolean; is_featured: boolean; featured_position: number | null;
  deleted_at: string | null;
}

const SELECT_NB = `SELECT id, name, ward, city, hidden, is_featured, featured_position, deleted_at
  FROM neighborhoods WHERE id = $1`;

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return jsonError(400, "Thiếu dữ liệu");

  const nb = await one<NbRow>(SELECT_NB, [id]).catch(() => null);
  if (!nb) return jsonError(404, "Không tìm thấy khu phố");

  // Khôi phục khu phố đã xoá mềm — trả về ẩn website để admin kiểm tra rồi mới bật
  if (body.restore === true) {
    await one(
      `UPDATE neighborhoods SET deleted_at = NULL, hidden = true WHERE id = $1 RETURNING id`,
      [id]
    );
    return NextResponse.json({ ok: true });
  }
  if (nb.deleted_at) return jsonError(409, "Khu phố đã xoá — khôi phục trước khi sửa");

  const name = body.name !== undefined ? String(body.name).trim() : nb.name;
  const ward = body.ward !== undefined ? String(body.ward).trim() || null : nb.ward;
  const city = body.city !== undefined ? String(body.city).trim() || null : nb.city;
  if (!name) return jsonError(400, "Tên khu phố không được để trống");
  if (name.length > 200) return jsonError(400, "Tên khu phố tối đa 200 ký tự");
  const geoErr = await geoError(city, ward);
  if (geoErr) return jsonError(400, geoErr);

  const hidden = body.visible !== undefined ? body.visible !== true : nb.hidden;
  const isFeatured = body.is_featured !== undefined ? body.is_featured === true : nb.is_featured;

  // Slot slide ở hero: số nguyên 1..FEATURED_SLOTS hoặc null (chưa xếp — đứng cuối theo tên)
  let featuredPos = nb.featured_position;
  if (body.featured_position !== undefined) {
    if (body.featured_position === null || body.featured_position === "") {
      featuredPos = null;
    } else {
      const pos = Number(body.featured_position);
      if (!Number.isInteger(pos) || pos < 1 || pos > FEATURED_SLOTS) {
        return jsonError(400, `Vị trí slide phải là số nguyên từ 1 đến ${FEATURED_SLOTS}`);
      }
      featuredPos = pos;
    }
  }
  if (!isFeatured) featuredPos = null; // bỏ tiêu biểu → nhả slot cho khu khác

  try {
    await tx(async (c) => {
      // Nhả slot của chính khu này TRƯỚC (index unique kiểm theo từng câu lệnh, không
      // hoãn được) rồi mới đẩy khu đang giữ slot đích sang chỗ trống — thành ra HOÁN ĐỔI.
      await c.query(`UPDATE neighborhoods SET featured_position = NULL WHERE id = $1`, [id]);
      if (featuredPos !== null) {
        await c.query(
          `UPDATE neighborhoods SET featured_position = $2
           WHERE featured_position = $1 AND deleted_at IS NULL`,
          [featuredPos, nb.featured_position]
        );
      }
      await c.query(
        `UPDATE neighborhoods SET name=$2, ward=$3, city=$4, hidden=$5, is_featured=$6,
           featured_position=$7
         WHERE id=$1`,
        [id, name, ward, city, hidden, isFeatured, featuredPos]
      );
    });
  } catch {
    return jsonError(409, "Tên khu phố trùng với khu phố khác");
  }
  return NextResponse.json({ ok: true });
}

// Xoá mềm: giữ nguyên dòng + toàn bộ góc phố / câu nhắc / điểm, chỉ đánh dấu deleted_at.
// Khu đã xoá biến mất khỏi MỌI truy vấn công khai (trang chủ, tra cứu, popup, trang share)
// nên cũng phải nhả slot slide và tắt hiển thị/tiêu biểu.
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const nb = await one<NbRow>(SELECT_NB, [id]).catch(() => null);
  if (!nb) return jsonError(404, "Không tìm thấy khu phố");
  if (nb.deleted_at) return NextResponse.json({ ok: true });
  await one(
    `UPDATE neighborhoods SET deleted_at = now(), hidden = true, is_featured = false,
       featured_position = NULL
     WHERE id = $1 RETURNING id`,
    [id]
  );
  return NextResponse.json({ ok: true });
}
