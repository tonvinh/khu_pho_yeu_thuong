import { NextResponse } from "next/server";
import { q } from "@/lib/db";
import { imgUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

// Pins + khu phố cho bản đồ. Public CHỈ nhận bản cách điệu (Q3), không bao giờ ảnh gốc.
export async function GET() {
  const neighborhoods = await q(
    `SELECT id, name, slug, certified_4n, certified_at, map_stylized_key, photo_key
     FROM neighborhoods ORDER BY name`
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
      slug: n.slug,
      certified_4n: n.certified_4n,
      certified_at: n.certified_at,
      map_url: imgUrl(n.map_stylized_key as string | null),
      photo_url: imgUrl(n.photo_key as string | null),
    })),
    pins: issues,
  });
}
