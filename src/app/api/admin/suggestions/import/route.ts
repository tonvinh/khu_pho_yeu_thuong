// Import câu duyệt từ file (nút "📥 Import file" ở trang Câu duyệt): Excel/CSV 5 cột
// Câu | Tên khu phố (phải có sẵn) | Vị trí treo biển | Chủ đề (mã hoặc tên) | Người đăng.
// Validate → commit all-or-nothing. Câu import do admin nhập → coi như ĐÃ DUYỆT
// (status approved, 4N tick đủ) và KHÔNG cộng điểm (dữ liệu nhập hộ, không phải đóng góp
// qua web). Điểm treo (issue) tìm theo khu phố + vị trí, chưa có thì tạo mới (waiting);
// người đăng tìm theo tên hiển thị, chưa có thì tạo cư dân mới (không SĐT thật).
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { randomBytes } from "node:crypto";
import { q, tx } from "@/lib/db";
import { jsonError, requireAdmin } from "@/lib/api";
import { CATEGORIES, CATEGORY_CODES } from "@/lib/taxonomy";
import { randomSlug } from "@/lib/crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Chấp nhận cả mã (khoe_moi_ngay) lẫn tên chủ đề (Khoẻ mỗi ngày), không phân biệt hoa/thường
function categoryCode(input: string): string | null {
  const v = input.trim().toLowerCase();
  if ((CATEGORY_CODES as readonly string[]).includes(v)) return v;
  for (const code of CATEGORY_CODES) {
    if (CATEGORIES[code].label.toLowerCase() === v) return code;
  }
  return null;
}

// ===== GET: template mẫu =====
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;
  const ws = XLSX.utils.aoa_to_sheet([
    ["Câu (≤120 ký tự)", "Tên khu phố (đã có trong hệ thống)", "Vị trí treo biển", "Chủ đề (mã hoặc tên)", "Người đăng"],
    [
      "Mình ơi, chạy chậm thôi — xóm có trẻ con (VÍ DỤ — xoá dòng này)",
      "Khu phố 1 - Bàn Cờ", "Đầu hẻm 51", CATEGORIES[CATEGORY_CODES[0]].label, "Cô Tám",
    ],
  ]);
  ws["!cols"] = [{ wch: 50 }, { wch: 32 }, { wch: 24 }, { wch: 24 }, { wch: 18 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Cau");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="import-cau.xlsx"',
    },
  });
}

interface Row {
  row: number; cau: string; ten_khu_pho: string; vi_tri: string;
  chu_de: string; nguoi_dang: string; errors: string[];
}

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
  const ws = wb.Sheets["Cau"] || wb.Sheets[wb.SheetNames[0]];
  if (!ws) return jsonError(400, "File không có sheet dữ liệu nào");
  const raw = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: "" });

  const rows: Row[] = [];
  for (let i = 1; i < raw.length; i++) {
    const r = raw[i].map((c) => String(c ?? "").trim());
    if (r.every((c) => !c)) continue;
    if (/ví dụ — xoá dòng này/i.test(r[0])) continue; // dòng ví dụ của template
    const row: Row = {
      row: i + 1, cau: r[0], ten_khu_pho: r[1], vi_tri: r[2], chu_de: r[3], nguoi_dang: r[4],
      errors: [],
    };
    if (!row.cau) row.errors.push("Thiếu câu");
    else if (row.cau.length > 120) row.errors.push(`Câu dài ${row.cau.length} ký tự — tối đa 120`);
    if (!row.ten_khu_pho) row.errors.push("Thiếu tên khu phố");
    if (!row.vi_tri) row.errors.push("Thiếu vị trí treo biển");
    else if (row.vi_tri.length > 300) row.errors.push("Vị trí tối đa 300 ký tự");
    if (!row.chu_de) row.errors.push("Thiếu chủ đề");
    else if (!categoryCode(row.chu_de))
      row.errors.push(`Chủ đề '${row.chu_de}' không hợp lệ (6 chủ đề: ${CATEGORY_CODES.map((c) => CATEGORIES[c].label).join(", ")})`);
    if (!row.nguoi_dang) row.errors.push("Thiếu tên người đăng");
    else if (row.nguoi_dang.length > 120) row.errors.push("Tên người đăng tối đa 120 ký tự");
    rows.push(row);
  }
  if (rows.length === 0) return jsonError(400, "File không có dòng dữ liệu nào");

  // Khu phố phải có sẵn trong hệ thống (import khu phố trước nếu chưa có)
  const nbs = await q<{ id: string; name: string }>(`SELECT id, name FROM neighborhoods`);
  const nbByName = new Map(nbs.map((n) => [n.name.toLowerCase(), n.id]));
  for (const r of rows) {
    if (r.ten_khu_pho && !nbByName.has(r.ten_khu_pho.toLowerCase()))
      r.errors.push("Khu phố chưa có trong hệ thống — import/tạo khu phố trước");
  }

  // Trùng câu (cùng khu phố): trong file + với DB
  const seen = new Map<string, number>();
  for (const r of rows) {
    const key = `${r.ten_khu_pho.toLowerCase()}|${r.cau.toLowerCase()}`;
    if (!r.cau || !r.ten_khu_pho) continue;
    if (seen.has(key)) r.errors.push(`Trùng câu với dòng ${seen.get(key)}`);
    else seen.set(key, r.row);
  }
  const nbIds = [...new Set(rows.map((r) => nbByName.get(r.ten_khu_pho.toLowerCase())).filter(Boolean))];
  if (nbIds.length > 0) {
    const dups = await q<{ neighborhood_id: string; content: string }>(
      `SELECT neighborhood_id, content FROM suggestions WHERE neighborhood_id = ANY($1)`,
      [nbIds]
    );
    const dupSet = new Set(dups.map((d) => `${d.neighborhood_id}|${d.content.toLowerCase()}`));
    for (const r of rows) {
      const nbId = nbByName.get(r.ten_khu_pho.toLowerCase());
      if (nbId && dupSet.has(`${nbId}|${r.cau.toLowerCase()}`))
        r.errors.push("Câu này đã có ở khu phố này trong hệ thống");
    }
  }

  const errorCount = rows.filter((r) => r.errors.length).length;
  const preview = {
    rows: rows.map((r) => ({
      row: r.row,
      label: `“${r.cau}” — ${r.ten_khu_pho} · ${r.vi_tri}${r.nguoi_dang ? ` · ${r.nguoi_dang}` : ""}`,
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

  // COMMIT all-or-nothing
  await tx(async (c) => {
    const issueCache = new Map<string, string>(); // nbId|vị trí (lower) → issue id
    const userCache = new Map<string, string>();  // tên (lower) → user id
    for (const r of rows) {
      const nbId = nbByName.get(r.ten_khu_pho.toLowerCase())!;
      const category = categoryCode(r.chu_de)!;

      // Điểm treo: tìm theo khu phố + vị trí; chưa có → tạo (admin nhập → coi như đã duyệt)
      const issueKey = `${nbId}|${r.vi_tri.toLowerCase()}`;
      let issueId = issueCache.get(issueKey);
      if (!issueId) {
        const found = await c.query(
          `SELECT id FROM issues
           WHERE neighborhood_id = $1 AND lower(location_text) = lower($2) AND status <> 'rejected'
           ORDER BY created_at LIMIT 1`,
          [nbId, r.vi_tri]
        );
        if (found.rows[0]) issueId = found.rows[0].id as string;
        else {
          const created = await c.query(
            `INSERT INTO issues (neighborhood_id, category, location_text, status, approved_at)
             VALUES ($1,$2,$3,'waiting', now()) RETURNING id`,
            [nbId, category, r.vi_tri]
          );
          issueId = created.rows[0].id as string;
        }
        issueCache.set(issueKey, issueId);
      }

      // Người đăng: tìm theo tên hiển thị; chưa có → tạo cư dân mới (hash ngẫu nhiên,
      // KHÔNG phải SĐT thật — người này không đăng nhập được, chỉ đứng tên câu import)
      const userKey = r.nguoi_dang.toLowerCase();
      let userId = userCache.get(userKey);
      if (!userId) {
        const found = await c.query(
          `SELECT id FROM users WHERE lower(display_name) = $1 ORDER BY created_at LIMIT 1`,
          [userKey]
        );
        if (found.rows[0]) userId = found.rows[0].id as string;
        else {
          const created = await c.query(
            `INSERT INTO users (phone_hash, display_name, share_slug, neighborhood_id)
             VALUES ($1,$2,$3,$4) RETURNING id`,
            [randomBytes(32).toString("hex"), r.nguoi_dang, randomSlug(), nbId]
          );
          userId = created.rows[0].id as string;
        }
        userCache.set(userKey, userId);
      }

      await c.query(
        `INSERT INTO suggestions (issue_id, author_id, content, status, review_4n,
           approved_at, neighborhood_id, category)
         VALUES ($1,$2,$3,'approved',$4, now(), $5, $6)`,
        [issueId, userId, r.cau,
         JSON.stringify({ nhac: true, nho: true, nho2: true, nhe: true }), nbId, category]
      );
    }
  });

  return NextResponse.json({
    mode: "commit", ok: true,
    message: `Đã import ${rows.length} câu (trạng thái Đã duyệt, không cộng điểm) ✓`,
  });
}
