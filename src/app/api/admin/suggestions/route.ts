import { NextRequest, NextResponse } from "next/server";
import { q } from "@/lib/db";
import { requireAdmin } from "@/lib/api";

export const dynamic = "force-dynamic";

// Hàng chờ duyệt câu nhắc / danh sách theo trạng thái (04 §3, §4)
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;
  const status = req.nextUrl.searchParams.get("status") || "submitted";
  const issueId = req.nextUrl.searchParams.get("issue");
  const params: unknown[] = [status];
  let extra = "";
  if (issueId) {
    params.push(issueId);
    extra = ` AND s.issue_id = $2`;
  }
  const rows = await q(
    `SELECT s.id, s.content, s.status, s.review_4n, s.review_note, s.created_at,
       s.issue_id, i.category, i.location_text, n.name AS neighborhood_name,
       u.display_name AS author_name,
       (SELECT count(*)::int FROM votes v WHERE v.suggestion_id = s.id AND v.is_valid) AS votes
     FROM suggestions s
     JOIN issues i ON i.id = s.issue_id
     JOIN neighborhoods n ON n.id = i.neighborhood_id
     JOIN users u ON u.id = s.author_id
     WHERE s.status = $1${extra}
     ORDER BY s.created_at ASC`,
    params
  );
  return NextResponse.json({ suggestions: rows });
}
