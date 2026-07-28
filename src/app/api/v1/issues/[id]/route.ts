import { NextRequest, NextResponse } from "next/server";
import { one, q } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { jsonError } from "@/lib/api";
import { imgUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

// Chi tiết vấn đề + các câu nhắc ĐÃ DUYỆT (kèm trạng thái thương của người xem)
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getSessionUser(req);

  const issue = await one(
    `SELECT i.id, i.category, i.location_text, i.description, i.status,
       i.photo_key, i.pin_x, i.pin_y, i.neighborhood_id, n.name AS neighborhood_name
     FROM issues i JOIN neighborhoods n ON n.id = i.neighborhood_id
     WHERE i.id = $1 AND i.status IN ('waiting','voting','signed')`,
    [id]
  );
  if (!issue) return jsonError(404, "Không tìm thấy vấn đề");

  const suggestions = await q(
    `SELECT s.id, s.content, s.status, s.sign_photo_key, u.display_name AS author_name,
       (s.author_id = $2) AS is_mine,
       (SELECT count(*)::int FROM votes v WHERE v.suggestion_id = s.id AND v.is_valid) AS votes,
       EXISTS (SELECT 1 FROM votes v WHERE v.suggestion_id = s.id AND v.user_id = $2) AS voted
     FROM suggestions s JOIN users u ON u.id = s.author_id
     WHERE s.issue_id = $1 AND s.status IN ('approved','selected','produced','installed')
     ORDER BY votes DESC, s.created_at ASC`,
    [id, user?.id ?? "00000000-0000-0000-0000-000000000000"]
  );

  return NextResponse.json({
    issue: { ...issue, photo_url: imgUrl(issue.photo_key as string | null), photo_key: undefined },
    suggestions: suggestions.map((s) => ({
      ...s,
      sign_photo_url: imgUrl(s.sign_photo_key as string | null),
      sign_photo_key: undefined,
    })),
  });
}
