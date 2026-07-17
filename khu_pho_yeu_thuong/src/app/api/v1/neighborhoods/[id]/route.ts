import { NextRequest, NextResponse } from "next/server";
import { one } from "@/lib/db";
import { jsonError } from "@/lib/api";
import { imgUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

// Trạng thái chứng nhận "Khu phố biết thương" chuẩn 4N (02 §6)
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const nb = await one(
    `SELECT n.id, n.name, n.slug, n.certified_4n, n.certified_at, n.photo_key,
       (SELECT count(*)::int FROM issues WHERE neighborhood_id = n.id
         AND status IN ('waiting','voting','signed')) AS total_issues,
       (SELECT count(*)::int FROM issues WHERE neighborhood_id = n.id
         AND status = 'signed') AS signed_issues
     FROM neighborhoods n WHERE n.id = $1 OR n.slug = $1`,
    [id]
  );
  if (!nb) return jsonError(404, "Không tìm thấy khu phố");
  const total = Number(nb.total_issues) || 0;
  return NextResponse.json({
    neighborhood: {
      ...nb,
      photo_url: imgUrl(nb.photo_key as string | null),
      photo_key: undefined,
      progress_pct: total === 0 ? 0 : Math.round((Number(nb.signed_issues) / total) * 100),
    },
  });
}
