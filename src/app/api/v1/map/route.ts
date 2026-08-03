import { NextResponse } from "next/server";
import { q } from "@/lib/db";
import { imgUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

// Pins + khu phố cho trang chủ. Public CHỈ nhận bản cách điệu (Q3), không bao giờ ảnh gốc.
// Ảnh tổng quan: tối đa 4 ảnh/khu (neighborhood_photos, kích thước đồng nhất).
export async function GET() {
  const neighborhoods = await q(
    `SELECT n.id, n.name, n.ward, n.city, n.slug, n.certified_4n, n.certified_at,
       n.is_featured, n.map_stylized_key,
       COALESCE((SELECT json_agg(p.photo_key ORDER BY p.position)
         FROM neighborhood_photos p WHERE p.neighborhood_id = n.id), '[]'::json) AS photo_keys
     FROM neighborhoods n WHERE NOT n.hidden
     ORDER BY n.featured_position NULLS LAST, n.name`
  );
  const issues = await q(
    `SELECT id, neighborhood_id, category, location_text, status, pin_x, pin_y
     FROM issues
     WHERE status IN ('waiting','voting','signed') AND pin_x IS NOT NULL AND pin_y IS NOT NULL`
  );
  return NextResponse.json({
    neighborhoods: neighborhoods.map((n) => ({
      id: n.id,
      name: n.name,
      ward: n.ward,
      city: n.city,
      slug: n.slug,
      certified_4n: n.certified_4n,
      certified_at: n.certified_at,
      is_featured: n.is_featured,
      map_url: imgUrl(n.map_stylized_key as string | null),
      photo_urls: (n.photo_keys as string[]).map((k) => imgUrl(k)!),
    })),
    pins: issues,
  });
}
