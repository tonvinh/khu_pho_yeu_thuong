// Quản lý leads (04 §6): chỉ opted_in=true; SĐT che mặc định; export CSV có log
import { NextRequest, NextResponse } from "next/server";
import { q } from "@/lib/db";
import { requireAdmin } from "@/lib/api";
import { decryptPhone } from "@/lib/crypto";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;

  const format = req.nextUrl.searchParams.get("format");
  // 18/8: form ưu đãi có tỉnh thành + địa chỉ riêng → hiện & xuất thêm 2 cột,
  // kèm lọc theo tỉnh (sale chia vùng).
  const province = (req.nextUrl.searchParams.get("province") || "").trim();
  const rows = await q(
    `SELECT l.id, l.name, l.phone_masked, l.phone_encrypted, l.neighborhood_text,
       l.province, l.address, l.interests, l.source, l.status, l.note, l.created_at
     FROM leads l
     WHERE l.opted_in AND ($1 = '' OR l.province = $1)
     ORDER BY l.created_at DESC`,
    [province]
  );

  if (format === "csv") {
    // Export CSV thủ công (Q4) — giải mã SĐT tại module xuất, GHI LOG ai export
    await q(
      `INSERT INTO audit_logs (admin_user_id, action, detail)
       VALUES ($1, 'leads_export_csv', $2)`,
      [auth.admin.id, JSON.stringify({ count: rows.length, province: province || null })]
    );
    const header = "thoi_gian,ten,sdt,tinh_thanh,dia_chi,khu_pho,quan_tam,nguon,trang_thai";
    const lines = rows.map((l) => {
      const phone = decryptPhone(l.phone_encrypted as Buffer);
      const esc = (s: unknown) => `"${String(s ?? "").replace(/"/g, '""')}"`;
      return [
        esc(new Date(l.created_at as string).toISOString()),
        esc(l.name), esc(phone), esc(l.province), esc(l.address), esc(l.neighborhood_text),
        esc((l.interests as string[]).join("; ")), esc(l.source), esc(l.status),
      ].join(",");
    });
    return new NextResponse("﻿" + [header, ...lines].join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="leads-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  return NextResponse.json({
    leads: rows.map((l) => ({ ...l, phone_encrypted: undefined })),
  });
}
