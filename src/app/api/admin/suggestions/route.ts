import { NextRequest, NextResponse } from "next/server";
import { q } from "@/lib/db";
import { requireAdmin } from "@/lib/api";
import { imgUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

// Danh sách câu duyệt cho bảng quản lý (yêu cầu 3/8): filter nhanh theo trạng thái /
// chủ đề / khu phố / tỉnh-thành + ô tìm kiếm (nội dung, người đăng, khu phố, vị trí).
// status=all → mọi trạng thái. Giữ tương thích: mặc định status=submitted (hàng chờ 4N).
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;
  const sp = req.nextUrl.searchParams;
  const status = sp.get("status") || "submitted";
  const issueId = sp.get("issue");
  const category = sp.get("category");
  const neighborhoodId = sp.get("neighborhood");
  const city = sp.get("city");
  const search = (sp.get("q") || "").trim().slice(0, 120);

  const params: unknown[] = [];
  const add = (v: unknown) => { params.push(v); return `$${params.length}`; };
  const where: string[] = [
    // Câu gửi kèm đề xuất chưa duyệt: xử lý ở màn duyệt đề xuất, không vào đây (#17)
    `NOT (s.status = 'submitted' AND i.status IN ('pending_review','rejected'))`,
  ];
  if (status !== "all") where.push(`s.status = ${add(status)}`);
  if (issueId) where.push(`s.issue_id = ${add(issueId)}`);
  if (category) where.push(`s.category = ${add(category)}`);
  if (neighborhoodId) where.push(`s.neighborhood_id = ${add(neighborhoodId)}`);
  if (city) where.push(`n.city = ${add(city)}`);
  if (search) {
    const p = add(`%${search}%`);
    where.push(
      `(s.content ILIKE ${p} OR u.display_name ILIKE ${p} OR n.name ILIKE ${p} OR i.location_text ILIKE ${p})`
    );
  }

  const rows = await q(
    `SELECT s.id, s.content, s.status, s.review_4n, s.review_note, s.created_at,
       s.issue_id, s.category, s.neighborhood_id, s.image_key,
       i.location_text, n.name AS neighborhood_name, n.city, n.ward,
       u.display_name AS author_name,
       (SELECT count(*)::int FROM votes v WHERE v.suggestion_id = s.id AND v.is_valid) AS votes
     FROM suggestions s
     JOIN issues i ON i.id = s.issue_id
     JOIN neighborhoods n ON n.id = s.neighborhood_id
     JOIN users u ON u.id = s.author_id
     WHERE ${where.join(" AND ")}
     ORDER BY s.created_at DESC`,
    params
  );
  return NextResponse.json({
    suggestions: rows.map((r) => ({
      ...(r as Record<string, unknown>),
      image_url: imgUrl((r as { image_key: string | null }).image_key),
      image_key: undefined,
    })),
  });
}
