// Import khu phố từ file (nút "📥 Import file" ở trang Khu phố): Excel/CSV 3 cột
// Tên khu phố | Tỉnh/Thành phố | Phường/Xã. Quy trình validate → commit, all-or-nothing
// như bulk import. GET trả về file template .xlsx để tải mẫu.
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { q, tx } from "@/lib/db";
import { jsonError, requireAdmin } from "@/lib/api";
import { geoError, PROVINCES } from "@/lib/vn-geo";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function slugify(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// ===== GET: template mẫu =====
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;
  const ws = XLSX.utils.aoa_to_sheet([
    ["Tên khu phố", "Tỉnh/Thành phố", "Phường/Xã"],
    ["Xóm Đình An Nhơn (VÍ DỤ — xoá dòng này)", PROVINCES[1], "Phường Bàn Cờ"],
  ]);
  ws["!cols"] = [{ wch: 40 }, { wch: 24 }, { wch: 24 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "KhuPho");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="import-khu-pho.xlsx"',
    },
  });
}

interface Row { row: number; ten: string; tinhthanh: string; phuongxa: string; errors: string[] }

// ===== POST: validate | commit =====
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;

  const form = await req.formData().catch(() => null);
  if (!form) return jsonError(400, "Thiếu dữ liệu multipart");
  const file = form.get("file");
  const mode = String(form.get("mode") || "validate");
  if (!(file instanceof File)) return jsonError(400, "Thiếu file (xlsx/csv)");

  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(Buffer.from(await file.arrayBuffer()), { type: "buffer" });
  } catch {
    return jsonError(400, "Không đọc được file — dùng .xlsx hoặc .csv theo template");
  }
  const ws = wb.Sheets["KhuPho"] || wb.Sheets[wb.SheetNames[0]];
  if (!ws) return jsonError(400, "File không có sheet dữ liệu nào");
  const raw = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: "" });

  const rows: Row[] = [];
  for (let i = 1; i < raw.length; i++) {
    const r = raw[i].map((c) => String(c ?? "").trim());
    if (r.every((c) => !c)) continue;
    if (/ví dụ/i.test(r[0])) continue; // dòng ví dụ của template
    const row: Row = { row: i + 1, ten: r[0], tinhthanh: r[1], phuongxa: r[2], errors: [] };
    if (!row.ten) row.errors.push("Thiếu tên khu phố");
    else if (row.ten.length > 200) row.errors.push("Tên khu phố tối đa 200 ký tự");
    if (!row.tinhthanh) row.errors.push("Thiếu Tỉnh/Thành phố");
    if (!row.phuongxa) row.errors.push("Thiếu Phường/Xã");
    const geoErr = geoError(row.tinhthanh, row.phuongxa);
    if (geoErr) row.errors.push(geoErr);
    rows.push(row);
  }
  if (rows.length === 0) return jsonError(400, "File không có dòng dữ liệu nào");

  // Trùng tên trong file + với DB
  const seen = new Map<string, number>();
  for (const r of rows) {
    const key = r.ten.toLowerCase();
    if (!key) continue;
    if (seen.has(key)) r.errors.push(`Trùng tên với dòng ${seen.get(key)}`);
    else seen.set(key, r.row);
  }
  const existing = await q<{ name: string; slug: string }>(`SELECT name, slug FROM neighborhoods`);
  const existingNames = new Set(existing.map((n) => n.name.toLowerCase()));
  for (const r of rows) {
    if (existingNames.has(r.ten.toLowerCase())) r.errors.push("Khu phố đã tồn tại trong hệ thống");
  }

  const errorCount = rows.filter((r) => r.errors.length).length;
  const preview = {
    rows: rows.map((r) => ({
      row: r.row,
      label: `${r.ten}${r.tinhthanh || r.phuongxa ? ` — ${r.tinhthanh}${r.phuongxa ? ` · ${r.phuongxa}` : ""}` : ""}`,
      errors: r.errors,
    })),
    summary: { total: rows.length, errors: errorCount },
  };
  if (mode !== "commit") return NextResponse.json({ mode: "validate", ...preview });
  if (errorCount > 0) {
    return NextResponse.json(
      { mode: "validate", ...preview, error: "Còn lỗi — chưa ghi gì vào hệ thống (all-or-nothing)" },
      { status: 422 }
    );
  }

  // COMMIT all-or-nothing; slug tự thêm hậu tố khi đụng slug đã có
  const usedSlugs = new Set(existing.map((n) => n.slug));
  await tx(async (c) => {
    for (const r of rows) {
      let slug = slugify(r.ten) || "khu-pho";
      for (let n = 2; usedSlugs.has(slug); n++) slug = `${slugify(r.ten)}-${n}`;
      usedSlugs.add(slug);
      await c.query(
        `INSERT INTO neighborhoods (name, ward, city, slug) VALUES ($1,$2,$3,$4)`,
        [r.ten, r.phuongxa, r.tinhthanh, slug]
      );
    }
  });

  return NextResponse.json({
    mode: "commit", ok: true,
    message: `Đã import ${rows.length} khu phố ✓ Nhớ vào Sửa từng khu để tải ảnh tổng quan.`,
  });
}
