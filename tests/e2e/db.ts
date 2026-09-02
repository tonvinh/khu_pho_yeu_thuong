// Kết nối DB thật cho phần DỰNG/DỌN dữ liệu của E2E (fixture), không dùng để "kiểm tra
// thay cho API": mọi khẳng định vẫn đi qua HTTP như người dùng thật.
// DATABASE_URL đọc từ .env như dev server (không thêm dependency dotenv).
import { readFileSync } from "node:fs";
import path from "node:path";
import { Client as PgClient } from "pg";

function databaseUrl(): string | null {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  for (const file of [".env.local", ".env"]) {
    try {
      const text = readFileSync(path.resolve(__dirname, "../..", file), "utf8");
      const m = text.match(/^\s*DATABASE_URL\s*=\s*(.+)$/m);
      if (m) return m[1].trim().replace(/^["']|["']$/g, "");
    } catch { /* không có file thì thử file kế tiếp */ }
  }
  return null;
}

let warned = false;

/** Chạy SQL; trả null khi không có DATABASE_URL hoặc không nối được (test tự bỏ qua) */
export async function sql<T = any>(text: string, params: unknown[] = []): Promise<T[] | null> {
  const url = databaseUrl();
  if (!url) return null;
  const c = new PgClient({ connectionString: url });
  try {
    await c.connect();
    const res = await c.query(text, params);
    return res.rows as T[];
  } catch (e) {
    if (!warned) {
      warned = true;
      console.warn("⚠️  E2E: không nối được DB —", (e as Error).message);
    }
    return null;
  } finally {
    await c.end().catch(() => {});
  }
}

export const E2E_USER_NAME = "E2E Tester";

/** Xoá sạch dấu vết user E2E (phiên, thông báo, điểm) — gọi ở afterAll */
export async function cleanupE2EUser(): Promise<void> {
  await sql(
    `WITH u AS (SELECT id FROM users WHERE display_name = $1),
          n AS (DELETE FROM notifications WHERE user_id IN (SELECT id FROM u)),
          s AS (DELETE FROM sessions WHERE user_id IN (SELECT id FROM u)),
          e AS (DELETE FROM score_events WHERE user_id IN (SELECT id FROM u))
     DELETE FROM users WHERE id IN (SELECT id FROM u)`,
    [E2E_USER_NAME]
  );
}
