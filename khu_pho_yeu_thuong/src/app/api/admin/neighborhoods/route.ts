import { NextRequest, NextResponse } from "next/server";
import { q, one } from "@/lib/db";
import { jsonError, requireAdmin } from "@/lib/api";
import { imgUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

// Danh sách khu phố + tiến độ chứng nhận (04 §5)
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;
  const rows = await q(
    `SELECT n.id, n.name, n.ward, n.district, n.city, n.slug, n.certified_4n, n.certified_at,
       n.map_image_key, n.map_stylized_key, n.photo_key,
       (SELECT count(*)::int FROM issues WHERE neighborhood_id = n.id
          AND status IN ('waiting','voting','signed')) AS total_issues,
       (SELECT count(*)::int FROM issues WHERE neighborhood_id = n.id
          AND status = 'signed') AS signed_issues
     FROM neighborhoods n ORDER BY n.name`
  );
  return NextResponse.json({
    neighborhoods: rows.map((n) => ({
      ...n,
      has_map: !!n.map_image_key,
      map_stylized_url: imgUrl(n.map_stylized_key as string | null),
      photo_url: imgUrl(n.photo_key as string | null),
      map_image_key: undefined,
    })),
  });
}

// Thêm khu phố mới (04 §8)
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;
  const body = await req.json().catch(() => null);
  if (!body?.name?.trim()) return jsonError(400, "Thiếu tên khu phố");
  const slug = String(body.slug || body.name)
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const created = await one(
    `INSERT INTO neighborhoods (name, ward, district, city, slug)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (name) DO NOTHING RETURNING id`,
    [body.name.trim(), body.ward || null, body.district || null, body.city || null, slug]
  );
  if (!created) return jsonError(409, "Khu phố trùng tên hoặc slug");
  return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
}
