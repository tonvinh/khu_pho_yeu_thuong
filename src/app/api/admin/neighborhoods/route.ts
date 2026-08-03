import { NextRequest, NextResponse } from "next/server";
import { q, one } from "@/lib/db";
import { jsonError, requireAdmin } from "@/lib/api";
import { imgUrl } from "@/lib/storage";
import { geoError } from "@/lib/vn-geo";

export const dynamic = "force-dynamic";

// Danh sách khu phố + ảnh tổng quan + trạng thái hiển thị/tiêu biểu/chứng nhận (04 §5)
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;
  const rows = await q(
    `SELECT n.id, n.name, n.ward, n.city, n.slug, n.hidden, n.is_featured,
       n.featured_position, n.certified_4n, n.certified_at, n.certificate_photo_key,
       COALESCE((SELECT json_agg(json_build_object('position', p.position, 'key', p.photo_key)
                   ORDER BY p.position)
                 FROM neighborhood_photos p WHERE p.neighborhood_id = n.id), '[]'::json) AS photos,
       (SELECT count(*)::int FROM issues WHERE neighborhood_id = n.id
          AND status IN ('waiting','voting','signed')) AS total_issues,
       (SELECT count(*)::int FROM issues WHERE neighborhood_id = n.id
          AND status = 'signed') AS signed_issues
     FROM neighborhoods n ORDER BY n.name`
  );
  return NextResponse.json({
    neighborhoods: rows.map((n) => ({
      ...n,
      visible: !n.hidden,
      hidden: undefined,
      certificate_photo_url: imgUrl(n.certificate_photo_key as string | null),
      photos: (n.photos as Array<{ position: number; key: string }>).map((p) => ({
        position: p.position,
        url: imgUrl(p.key),
      })),
      certificate_photo_key: undefined,
    })),
  });
}

// Thêm khu phố mới (04 §8) — địa chỉ theo địa lý hành chính mới: Tỉnh/Thành + Phường/Xã
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;
  const body = await req.json().catch(() => null);
  const name = String(body?.name || "").trim();
  const city = String(body?.city || "").trim();
  const ward = String(body?.ward || "").trim();
  if (!name) return jsonError(400, "Thiếu tên khu phố");
  if (name.length > 200) return jsonError(400, "Tên khu phố tối đa 200 ký tự");
  if (!city) return jsonError(400, "Chưa chọn Tỉnh/Thành phố");
  if (!ward) return jsonError(400, "Thiếu Phường/Xã");
  const geoErr = geoError(city, ward);
  if (geoErr) return jsonError(400, geoErr);

  const slug = String(body.slug || name)
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const created = await one(
    `INSERT INTO neighborhoods (name, ward, city, slug, hidden, is_featured)
     VALUES ($1,$2,$3,$4,$5,false)
     ON CONFLICT (name) DO NOTHING RETURNING id`,
    [name, ward, city, slug, body?.visible === false]
  );
  if (!created) return jsonError(409, "Khu phố trùng tên hoặc slug");
  return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
}
