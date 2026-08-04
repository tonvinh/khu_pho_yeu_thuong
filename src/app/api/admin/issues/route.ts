import { NextRequest, NextResponse } from "next/server";
import { q, one } from "@/lib/db";
import { requireAdmin } from "@/lib/api";
import { imgUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

// Danh sách đề xuất góc phố cho bảng quản lý trong màn Khu phố (4/8): lọc theo trạng
// thái / chủ đề / khu phố / tỉnh-thành + tìm kiếm (vị trí, mô tả, khu phố, người đề
// xuất) + phân trang. status=all → mọi trạng thái. Mặc định pending_review (hàng chờ).
// `counts` đếm theo trạng thái với CÙNG bộ lọc (trừ chính trạng thái) để hiện badge tab.
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;
  const sp = req.nextUrl.searchParams;
  const status = sp.get("status") || "pending_review";
  const category = sp.get("category");
  const neighborhoodId = sp.get("neighborhood");
  const city = sp.get("city");
  const search = (sp.get("q") || "").trim().slice(0, 120);
  const per = Math.min(200, Math.max(1, Number(sp.get("per")) || 20));
  const page = Math.max(1, Number(sp.get("page")) || 1);

  // Điều kiện KHÔNG gồm trạng thái — dùng lại nguyên vẹn cho câu đếm theo trạng thái
  // (tham số của nó luôn đứng đầu mảng nên câu đếm chỉ cần baseParams)
  const baseParams: unknown[] = [];
  const addBase = (v: unknown) => { baseParams.push(v); return `$${baseParams.length}`; };
  const base: string[] = [];
  if (category) base.push(`i.category = ${addBase(category)}`);
  if (neighborhoodId) base.push(`i.neighborhood_id = ${addBase(neighborhoodId)}`);
  if (city) base.push(`n.city = ${addBase(city)}`);
  if (search) {
    const p = addBase(`%${search}%`);
    base.push(
      `(i.location_text ILIKE ${p} OR i.description ILIKE ${p}
        OR n.name ILIKE ${p} OR n.ward ILIKE ${p} OR u.display_name ILIKE ${p})`
    );
  }
  const baseSql = base.length ? base.join(" AND ") : "true";

  const params = [...baseParams];
  const add = (v: unknown) => { params.push(v); return `$${params.length}`; };
  const where = [baseSql];
  if (status !== "all") where.push(`i.status = ${add(status)}`);
  // Hàng chờ duyệt: cũ nhất lên trước (theo SLA 24h); còn lại: mới nhất trước
  const order = status === "pending_review" ? "ASC" : "DESC";

  const rows = await q(
    `SELECT i.id, i.category, i.location_text, i.description, i.status, i.created_at,
       i.approved_at, i.signed_at, i.review_note,
       n.id AS neighborhood_id, n.name AS neighborhood_name, n.ward, n.city, n.hidden,
       u.display_name AS proposer_name,
       i.photo_key,
       (SELECT count(*)::int FROM suggestions s WHERE s.issue_id = i.id) AS suggestion_count,
       (SELECT s.content FROM suggestions s
         WHERE s.issue_id = i.id ORDER BY s.created_at ASC LIMIT 1) AS attached_suggestion,
       (count(*) OVER())::int AS total
     FROM issues i
     JOIN neighborhoods n ON n.id = i.neighborhood_id
     LEFT JOIN users u ON u.id = i.proposed_by
     WHERE ${where.join(" AND ")}
     ORDER BY i.created_at ${order}
     LIMIT ${add(per)} OFFSET ${add((page - 1) * per)}`,
    params
  );

  const counts = await one(
    `SELECT count(*)::int AS "all",
       count(*) FILTER (WHERE i.status = 'pending_review')::int AS pending_review,
       count(*) FILTER (WHERE i.status = 'waiting')::int AS waiting,
       count(*) FILTER (WHERE i.status = 'voting')::int AS voting,
       count(*) FILTER (WHERE i.status = 'signed')::int AS signed,
       count(*) FILTER (WHERE i.status = 'rejected')::int AS rejected
     FROM issues i
     JOIN neighborhoods n ON n.id = i.neighborhood_id
     LEFT JOIN users u ON u.id = i.proposed_by
     WHERE ${baseSql}`,
    baseParams
  );

  return NextResponse.json({
    issues: rows.map((r) => ({
      ...r,
      photo_url: imgUrl(r.photo_key as string | null),
      photo_key: undefined,
      total: undefined,
    })),
    total: (rows[0]?.total as number) ?? 0,
    counts,
  });
}
