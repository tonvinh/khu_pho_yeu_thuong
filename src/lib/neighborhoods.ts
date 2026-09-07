// Resolve khu phố từ id HOẶC free text (dieuchinh.1.8 #11: cho phép TỰ NHẬP phường).
// Free text chưa có trong danh sách → tạo bản ghi hidden=true; khu phố chỉ hiện công khai
// khi admin duyệt đề xuất đầu tiên thuộc khu đó (unhide ở PATCH /api/admin/issues/[id]).
import type { Pool, PoolClient } from "pg";

type Db = Pool | PoolClient;


function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

export async function resolveNeighborhoodId(
  db: Db,
  id?: string | null,
  text?: string | null,
  // Địa lý hành chính mới (1/7/2025): Tỉnh/Thành + Phường/Xã kèm khi tự nhập khu phố
  geo?: { city?: string | null; ward?: string | null }
): Promise<string | null> {
  if (id) {
    // Khu phố đã xoá mềm không còn chọn được (nó đã biến mất khỏi mọi danh sách công khai)
    const r = await db.query(
      `SELECT id FROM neighborhoods WHERE id = $1 AND deleted_at IS NULL`, [id]
    );
    return (r.rows[0]?.id as string) ?? null;
  }
  const name = String(text || "").trim().slice(0, 200);
  if (!name) return null;
  // Khớp tên KHÔNG lọc deleted_at: tên khu phố là UNIQUE nên trùng tên với một khu đã xoá
  // thì INSERT dưới đây sẽ vỡ. Trả về khu đã xoá — đề xuất treo ở đó cho tới khi admin
  // khôi phục khu phố, thay vì hỏng luôn form của cư dân.
  const found = await db.query(
    `SELECT id FROM neighborhoods WHERE lower(name) = lower($1)`,
    [name]
  );
  if (found.rows[0]) return found.rows[0].id as string;
  const base = slugify(name) || "khu-pho";
  const ins = await db.query(
    `INSERT INTO neighborhoods (name, slug, hidden, city, ward)
     VALUES ($1, $2 || '-' || substr(md5(random()::text), 1, 6), true, $3, $4) RETURNING id`,
    [name, base,
     String(geo?.city || "").trim().slice(0, 120) || null,
     String(geo?.ward || "").trim().slice(0, 120) || null]
  );
  return ins.rows[0].id as string;
}
