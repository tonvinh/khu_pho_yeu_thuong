// Migration runner — chạy như lệnh riêng (không tự chạy khi container start).
// Cách dùng: node scripts/migrate.mjs  (hoặc: docker compose run --rm web npm run migrate)
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

try { process.loadEnvFile(".env"); } catch { /* env đã có sẵn (Docker) */ }

// Secret do Vault agent inject khi chạy trên k8s bên FPT (docs/18 §2.4). Job migration chạy
// trong pod RIÊNG nên phải tự nạp; file này là .mjs thuần (chạy được trong image production)
// nên KHÔNG import được src/lib/vault-env.ts — logic chép lại, sửa một bên nhớ sửa bên kia.
// Ngoài k8s: không có thư mục ⇒ thoát im lặng, giữ nguyên hành vi cũ ở localhost và VM.
// Bọc try/catch toàn bộ: file này nằm trên đường deploy tự động của VM, hỏng là hỏng cả lượt.
function loadVaultEnv() {
  try {
    const dir = process.env.VAULT_SECRETS_DIR || "/vault/secrets";
    let file = process.env.VAULT_SECRET_FILE;
    if (!file) {
      if (!existsSync(dir)) return;
      const byEnv = path.join(dir, `configuration.${process.env.NODE_ENV}.json`);
      if (existsSync(byEnv)) file = byEnv;
      else {
        const names = readdirSync(dir).filter((f) => /^configuration\..+\.json$/.test(f)).sort();
        if (names.length !== 1) {
          console.warn(`[vault] bỏ qua secret: tìm thấy ${names.length} file configuration.*.json trong ${dir}`);
          return;
        }
        file = path.join(dir, names[0]);
      }
    }
    if (!existsSync(file)) { console.warn(`[vault] bỏ qua secret: không thấy ${file}`); return; }

    const parsed = JSON.parse(readFileSync(file, "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("không phải object JSON");
    const applied = [];
    for (const [key, value] of Object.entries(parsed)) {
      if (process.env[key] !== undefined) continue;
      process.env[key] =
        value === null || value === undefined ? ""
        : typeof value === "boolean" ? (value ? "true" : "false")
        : typeof value === "object" ? JSON.stringify(value)
        : String(value);
      applied.push(key);
    }

    // Ghép DATABASE_URL từ mảnh rời nếu DBA không trả nguyên chuỗi.
    const at = (...names) => names.map((n) => process.env[n]).find((v) => v);
    if (!process.env.DATABASE_URL) {
      const host = at("DB_HOST", "POSTGRES_HOST", "PGHOST");
      const user = at("DB_USER", "DB_USERNAME", "POSTGRES_USER", "PGUSER");
      const pass = at("DB_PASSWORD", "DB_PASS", "POSTGRES_PASSWORD", "PGPASSWORD");
      const name = at("DB_NAME", "DB_DATABASE", "POSTGRES_DB", "PGDATABASE");
      if (host && user && pass && name) {
        const port = at("DB_PORT", "POSTGRES_PORT", "PGPORT") || "5432";
        const sslmode = at("DB_SSLMODE", "PGSSLMODE");
        process.env.DATABASE_URL =
          `postgres://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}/${name}` +
          (sslmode ? `?sslmode=${encodeURIComponent(sslmode)}` : "");
        applied.push("DATABASE_URL");
      }
    }
    // Chỉ log TÊN khoá — giá trị là mật khẩu DB, không đưa vào log.
    console.log(`[vault] nạp ${applied.length} biến từ ${file}: ${applied.join(", ") || "(không có)"}`);
  } catch (e) {
    console.warn(`[vault] bỏ qua secret do lỗi: ${e.message}`);
  }
}
loadVaultEnv();

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
