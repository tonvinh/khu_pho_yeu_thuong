// Migration runner — chạy như lệnh riêng (không tự chạy khi container start).
// Cách dùng: node scripts/migrate.mjs  (hoặc: docker compose run --rm web npm run migrate)
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

try { process.loadEnvFile(".env"); } catch { /* env đã có sẵn (Docker) */ }

const { Client } = pg;
const dir = path.join(process.cwd(), "db", "migrations");

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
  name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now()
)`);

const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
for (const file of files) {
  const done = await client.query("SELECT 1 FROM schema_migrations WHERE name=$1", [file]);
  if (done.rowCount > 0) { console.log(`= ${file} (đã áp dụng)`); continue; }
  const sql = await readFile(path.join(dir, file), "utf8");
  await client.query("BEGIN");
  try {
    await client.query(sql);
    await client.query("INSERT INTO schema_migrations(name) VALUES($1)", [file]);
    await client.query("COMMIT");
    console.log(`+ ${file}`);
  } catch (e) {
    await client.query("ROLLBACK");
    console.error(`! Lỗi ở ${file}:`, e.message);
    process.exit(1);
  }
}
await client.end();
console.log("Migration hoàn tất.");
