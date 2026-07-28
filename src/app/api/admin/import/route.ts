// Bulk import 20 khu phố pilot (Q6, 04 §11): Upload → Validate & Preview → Commit.
// All-or-nothing: còn 1 dòng lỗi thì không ghi gì vào DB. Lỗi báo theo từng dòng.
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import AdmZip from "adm-zip";
import { tx } from "@/lib/db";
import { jsonError, requireAdmin } from "@/lib/api";
import { CATEGORY_CODES } from "@/lib/taxonomy";
import { putObject } from "@/lib/storage";
import { stylizeMap, toWebp } from "@/lib/stylize";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

interface KhuPhoRow {
  row: number; ten: string; phuong: string; quan: string; thanhpho: string;
  anh_ban_do: string; anh_khu_pho: string; errors: string[];
}
interface VanDeRow {
  row: number; ten_khu_pho: string; loai: string; vi_tri: string; mo_ta: string;
  pin_x: number | null; pin_y: number | null; anh_dia_diem: string; errors: string[];
}

function slugify(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function parseWorkbook(buf: Buffer): { khupho: KhuPhoRow[]; vande: VanDeRow[]; fatal?: string } {
  const wb = XLSX.read(buf, { type: "buffer" });
  const shKP = wb.Sheets["KhuPho"];
  const shVD = wb.Sheets["VanDe"];
  if (!shKP || !shVD) return { khupho: [], vande: [], fatal: "File thiếu sheet 'KhuPho' hoặc 'VanDe' — dùng đúng import-template.xlsx" };

  const kpRaw = XLSX.utils.sheet_to_json<string[]>(shKP, { header: 1, defval: "" });
  const vdRaw = XLSX.utils.sheet_to_json<(string | number)[]>(shVD, { header: 1, defval: "" });

  const khupho: KhuPhoRow[] = [];
  for (let i = 1; i < kpRaw.length; i++) {
    const r = kpRaw[i].map((c) => String(c ?? "").trim());
    if (r.every((c) => !c)) continue;
    if (/ví dụ minh hoạ/i.test(r[6] || "")) continue; // bỏ dòng ví dụ của template
    const row: KhuPhoRow = {
      row: i + 1, ten: r[0], phuong: r[1], quan: r[2], thanhpho: r[3],
      anh_ban_do: r[4], anh_khu_pho: r[5], errors: [],
    };
    if (!row.ten) row.errors.push("Thiếu tên khu phố");
    if (!row.phuong) row.errors.push("Thiếu phường");
    if (!row.quan) row.errors.push("Thiếu quận/huyện");
    if (!row.thanhpho) row.errors.push("Thiếu thành phố");
    khupho.push(row);
  }
  // Trùng tên trong file
  const seen = new Map<string, number>();
  for (const r of khupho) {
    const key = r.ten.toLowerCase();
    if (seen.has(key)) r.errors.push(`Trùng tên với dòng ${seen.get(key)}`);
    else seen.set(key, r.row);
  }

  const vande: VanDeRow[] = [];
  const kpNames = new Set(khupho.map((r) => r.ten.toLowerCase()));
  for (let i = 1; i < vdRaw.length; i++) {
    const r = vdRaw[i].map((c) => String(c ?? "").trim());
    if (r.every((c) => !c)) continue;
    if (khupho.length === 0 || !kpNames.has(r[0].toLowerCase())) {
      // dòng ví dụ template trỏ tới khu phố ví dụ đã bị bỏ → cũng bỏ nếu khớp mẫu
      if (/^khu phố 1 - bàn cờ$/i.test(r[0]) && !kpNames.has(r[0].toLowerCase())) continue;
    }
    const px = r[4] === "" ? null : Number(r[4]);
    const py = r[5] === "" ? null : Number(r[5]);
    const row: VanDeRow = {
      row: i + 1, ten_khu_pho: r[0], loai: r[1], vi_tri: r[2], mo_ta: r[3],
      pin_x: Number.isFinite(px as number) ? (px as number) : null,
      pin_y: Number.isFinite(py as number) ? (py as number) : null,
      anh_dia_diem: r[6], errors: [],
    };
    if (!row.ten_khu_pho) row.errors.push("Thiếu tên khu phố");
    else if (!kpNames.has(row.ten_khu_pho.toLowerCase()))
      row.errors.push("Tên khu phố không khớp sheet KhuPho");
    if (!CATEGORY_CODES.includes(row.loai as never))
      row.errors.push(`Loại vấn đề sai mã (8 mã hợp lệ: ${CATEGORY_CODES.join(", ")})`);
    if (!row.vi_tri) row.errors.push("Thiếu vị trí");
    if (r[4] !== "" && !(row.pin_x !== null && row.pin_x >= 0 && row.pin_x <= 100))
      row.errors.push("pin_x phải là số 0–100");
    if (r[5] !== "" && !(row.pin_y !== null && row.pin_y >= 0 && row.pin_y <= 100))
      row.errors.push("pin_y phải là số 0–100");
    vande.push(row);
  }
  return { khupho, vande };
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;

  const form = await req.formData().catch(() => null);
  if (!form) return jsonError(400, "Thiếu dữ liệu multipart");
  const file = form.get("file");
  const zipFile = form.get("images_zip");
  const mode = String(form.get("mode") || "validate"); // validate | commit
  if (!(file instanceof File)) return jsonError(400, "Thiếu file Excel");

  const buf = Buffer.from(await file.arrayBuffer());
  const { khupho, vande, fatal } = parseWorkbook(buf);
  if (fatal) return jsonError(400, fatal);
  if (khupho.length === 0) return jsonError(400, "Sheet KhuPho không có dòng dữ liệu nào");

  // Đối chiếu trùng tên với DB
  const { q } = await import("@/lib/db");
  const existing = await q<{ name: string }>(`SELECT name FROM neighborhoods`);
  const existingNames = new Set(existing.map((n) => n.name.toLowerCase()));
  for (const r of khupho) {
    if (existingNames.has(r.ten.toLowerCase())) r.errors.push("Khu phố đã tồn tại trong hệ thống");
  }

  // Ảnh zip: map tên file → buffer
  const zipEntries = new Map<string, Buffer>();
  if (zipFile instanceof File) {
    const zip = new AdmZip(Buffer.from(await zipFile.arrayBuffer()));
    for (const e of zip.getEntries()) {
      if (!e.isDirectory) zipEntries.set(e.entryName.split("/").pop()!.toLowerCase(), e.getData());
    }
  }
  for (const r of khupho) {
    if (r.anh_ban_do && !zipEntries.has(r.anh_ban_do.toLowerCase()))
      r.errors.push(`Không thấy ảnh '${r.anh_ban_do}' trong zip (có thể bổ sung sau qua trình quản lý bản đồ)`);
  }

  const errorCount =
    khupho.filter((r) => r.errors.length).length + vande.filter((r) => r.errors.length).length;
  // Thiếu ảnh trong zip chỉ là cảnh báo nếu không gửi zip; là lỗi nếu có gửi zip
  const hardErrors = (row: { errors: string[] }) =>
    row.errors.filter((e) => !e.includes("bổ sung sau") || zipFile instanceof File);
  const hardErrorCount =
    khupho.filter((r) => hardErrors(r).length).length +
    vande.filter((r) => hardErrors(r).length).length;

  const preview = {
    khupho: khupho.map((r) => ({ ...r, errors: hardErrors(r) })),
    vande: vande.map((r) => ({ ...r, errors: hardErrors(r) })),
    summary: {
      neighborhoods: khupho.length,
      issues: vande.length,
      errors: hardErrorCount,
      images: zipEntries.size,
    },
  };

  if (mode !== "commit") return NextResponse.json({ mode: "validate", ...preview });
  if (hardErrorCount > 0) {
    return NextResponse.json(
      { mode: "validate", ...preview, error: "Còn lỗi — chưa ghi gì vào hệ thống (all-or-nothing)" },
      { status: 422 }
    );
  }

  // COMMIT all-or-nothing
  const uploads: Array<() => Promise<void>> = [];
  await tx(async (c) => {
    const nbIds = new Map<string, string>();
    for (const r of khupho) {
      const res = await c.query(
        `INSERT INTO neighborhoods (name, ward, district, city, slug) VALUES ($1,$2,$3,$4,$5)
         RETURNING id`,
        [r.ten, r.phuong, r.quan, r.thanhpho, slugify(r.ten)]
      );
      const nbId = res.rows[0].id as string;
      nbIds.set(r.ten.toLowerCase(), nbId);

      const mapImg = r.anh_ban_do ? zipEntries.get(r.anh_ban_do.toLowerCase()) : undefined;
      if (mapImg) {
        const originalKey = `private/maps/${nbId}/original.webp`;
        const stylizedKey = `public/maps/${nbId}/stylized.webp`;
        await c.query(
          `UPDATE neighborhoods SET map_image_key=$2, map_stylized_key=$3 WHERE id=$1`,
          [nbId, originalKey, stylizedKey]
        );
        uploads.push(async () => {
          await putObject(originalKey, await toWebp(mapImg, 2400, 90), "image/webp");
          await putObject(stylizedKey, await stylizeMap(mapImg), "image/webp");
        });
      }
      const nbPhoto = r.anh_khu_pho ? zipEntries.get(r.anh_khu_pho.toLowerCase()) : undefined;
      if (nbPhoto) {
        const key = `public/neighborhoods/${nbId}/photo.webp`;
        await c.query(`UPDATE neighborhoods SET photo_key=$2 WHERE id=$1`, [nbId, key]);
        uploads.push(async () => {
          await putObject(key, await toWebp(nbPhoto), "image/webp");
        });
      }
    }

    for (const r of vande) {
      const nbId = nbIds.get(r.ten_khu_pho.toLowerCase())!;
      // Import do admin nhập → coi như đã duyệt: trạng thái waiting (04 §11)
      const res = await c.query(
        `INSERT INTO issues (neighborhood_id, category, location_text, description, status,
           pin_x, pin_y, approved_at)
         VALUES ($1,$2,$3,$4,'waiting',$5,$6, now()) RETURNING id`,
        [nbId, r.loai, r.vi_tri, r.mo_ta || null, r.pin_x, r.pin_y]
      );
      const issueId = res.rows[0].id as string;
      const photo = r.anh_dia_diem ? zipEntries.get(r.anh_dia_diem.toLowerCase()) : undefined;
      if (photo) {
        const key = `public/issues/${issueId}/photo.webp`;
        await c.query(`UPDATE issues SET photo_key=$2 WHERE id=$1`, [issueId, key]);
        uploads.push(async () => {
          await putObject(key, await toWebp(photo), "image/webp");
        });
      }
    }
  });

  // Upload ảnh sau khi DB commit thành công (lỗi upload không phá dữ liệu)
  const uploadErrors: string[] = [];
  for (const up of uploads) {
    await up().catch((e) => uploadErrors.push(String(e?.message || e)));
  }

  return NextResponse.json({
    mode: "commit", ok: true,
    created: { neighborhoods: khupho.length, issues: vande.length },
    upload_errors: uploadErrors,
  });
}
