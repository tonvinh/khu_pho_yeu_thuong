import { NextRequest, NextResponse } from "next/server";
import { q, tx } from "@/lib/db";
import { jsonError, requireUserWrite } from "@/lib/api";
import { CATEGORY_CODES } from "@/lib/taxonomy";
import { resolveNeighborhoodId } from "@/lib/neighborhoods";

export const dynamic = "force-dynamic";

// Danh sách thẻ vấn đề công khai — CHỈ trạng thái đã duyệt (quy tắc cứng 1)
export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status");
  const neighborhood = req.nextUrl.searchParams.get("neighborhood");
  const params: unknown[] = [];
  let where = `i.status IN ('waiting','voting','signed')`;
  if (status && ["waiting", "voting", "signed"].includes(status)) {
    params.push(status);
    where = `i.status = $${params.length}`;
  }
  if (neighborhood) {
    params.push(neighborhood);
    where += ` AND i.neighborhood_id = $${params.length}`;
  }
  const rows = await q(
    `SELECT i.id, i.category, i.location_text, i.description, i.status,
       i.neighborhood_id, n.name AS neighborhood_name,
       (SELECT count(*)::int FROM suggestions s
         WHERE s.issue_id = i.id AND s.status IN ('approved','selected','produced','installed')) AS suggestion_count,
       (SELECT COALESCE(max(vc.n), 0)::int FROM (
          SELECT count(*) AS n FROM votes v
          JOIN suggestions s ON s.id = v.suggestion_id
          WHERE s.issue_id = i.id AND v.is_valid GROUP BY v.suggestion_id) vc) AS top_votes,
       (SELECT s.content FROM suggestions s
          LEFT JOIN votes v ON v.suggestion_id = s.id AND v.is_valid
          WHERE s.issue_id = i.id AND s.status IN ('approved','selected','produced','installed')
          GROUP BY s.id ORDER BY count(v.id) DESC, s.created_at ASC LIMIT 1) AS top_quote
     FROM issues i JOIN neighborhoods n ON n.id = i.neighborhood_id
     WHERE ${where}
     ORDER BY (i.status = 'signed'), i.approved_at DESC NULLS LAST`,
    params
  );
  return NextResponse.json({ issues: rows });
}

// Gửi đề xuất vấn đề (Bước 1) → pending_review, KHÔNG hiển thị công khai trước duyệt
export async function POST(req: NextRequest) {
  const auth = await requireUserWrite(req);
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  if (!body) return jsonError(400, "Dữ liệu không hợp lệ");
  const { category, location_text, description, neighborhood_id, neighborhood_text,
    suggested_content } = body;

  if (!CATEGORY_CODES.includes(category)) {
    return jsonError(400, "Chủ đề không thuộc danh mục cho phép");
  }
  if (!location_text?.trim()) return jsonError(400, "Vui lòng nhập vị trí (ngõ/hẻm/ngách)");

  // Câu nhắc thương gửi kèm (dieuchinh.1.8 #5) — tuỳ chọn, ≤120 ký tự như câu nhắc thường
  const suggestion = String(suggested_content || "").trim();
  if (suggestion.length > 120) {
    return jsonError(400, "Câu nhắc tối đa 120 ký tự (tiêu chí Nhỏ)");
  }

  const created = await tx(async (c) => {
    // #11: chọn từ danh sách HOẶC tự nhập tên phường (free text → khu phố ẩn chờ duyệt)
    const nbId =
      (await resolveNeighborhoodId(c, neighborhood_id || null, neighborhood_text || null)) ||
      auth.user.neighborhood_id;
    if (!nbId) throw new Error("NB_NOT_FOUND");
    const r = await c.query(
      `INSERT INTO issues (neighborhood_id, category, location_text, description, proposed_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, status`,
      [nbId, category, location_text.trim().slice(0, 300),
       (description || "").trim().slice(0, 1000), auth.user.id]
    );
    // Câu nhắc kèm đề xuất vào hàng chờ duyệt câu — admin thấy ngay ở màn duyệt đề xuất (#17)
    if (suggestion) {
      await c.query(
        `INSERT INTO suggestions (issue_id, author_id, content) VALUES ($1,$2,$3)`,
        [r.rows[0].id, auth.user.id, suggestion]
      );
    }
    return r.rows[0];
  }).catch((e) => (e.message === "NB_NOT_FOUND" ? null : Promise.reject(e)));

  if (!created) return jsonError(400, "Vui lòng chọn khu phố của bạn");
  return NextResponse.json({ ok: true, issue: created }, { status: 201 });
}
