// Nạp secret do Vault agent inject vào pod (chỉ dùng khi deploy k8s bên FPT — xem docs/18 §2.4).
// Hạ tầng merge 2 path Vault (app-secret + database) thành MỘT file JSON trong pod:
//   /vault/secrets/configuration.<env>.json
// Ngoài k8s (localhost, VM Docker) thư mục này không tồn tại ⇒ hàm thoát ngay, IM LẶNG,
// mọi thứ chạy bằng process.env/.env như cũ. Không thêm dependency: CI của FPT build bằng
// base image cài sẵn node_modules nên thêm package là phải nhờ họ build lại image.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const DEFAULT_DIR = "/vault/secrets";
const FILE_RE = /^configuration\..+\.json$/;

/** Kết quả một lượt nạp — chỉ chứa TÊN khoá, không bao giờ chứa giá trị (log an toàn). */
export type VaultLoadResult = {
  /** File đã đọc, null nếu không nạp gì */
  file: string | null;
  /** Khoá đã ghi vào process.env */
  applied: string[];
  /** Khoá bị bỏ qua vì process.env đã có (biến môi trường THẮNG Vault) */
  skipped: string[];
  /** Vì sao không nạp được — chỉ có khi file === null */
  reason?: string;
};

function secretsDir(): string {
  return process.env.VAULT_SECRETS_DIR || DEFAULT_DIR;
}

/**
 * Chọn file secret theo thứ tự:
 *  1. VAULT_SECRET_FILE — đường thoát hiểm cho vận hành
 *  2. configuration.<NODE_ENV>.json
 *  3. file configuration.*.json DUY NHẤT trong thư mục
 *
 * Nhánh 3 là nhánh thật sự cứu: Next bắt buộc NODE_ENV=production ở MỌI môi trường, nên pod
 * staging vẫn mang giá trị "production" và nhánh 2 sẽ tìm nhầm tên file. Mỗi pod chỉ được
 * inject đúng một file nên không có gì để nhầm.
 *
 * Nhiều hơn một file ⇒ KHÔNG đoán: trả về lý do để gọi bên ngoài log, app sẽ chết lúc khởi
 * động bằng câu "Thiếu biến môi trường bắt buộc" của env.ts (fail-fast, docs/18 §2.1).
 */
function pickFile(): { file: string } | { reason: string; loud: boolean } {
  const explicit = process.env.VAULT_SECRET_FILE;
  if (explicit) {
    if (existsSync(explicit)) return { file: explicit };
    return { reason: `VAULT_SECRET_FILE trỏ tới file không tồn tại: ${explicit}`, loud: true };
  }

  const dir = secretsDir();
  if (!existsSync(dir)) return { reason: `không có thư mục ${dir}`, loud: false };

  const byEnv = path.join(dir, `configuration.${process.env.NODE_ENV}.json`);
  if (existsSync(byEnv)) return { file: byEnv };

  let names: string[];
  try {
    names = readdirSync(dir).filter((f) => FILE_RE.test(f)).sort();
  } catch (e) {
    return { reason: `không đọc được ${dir}: ${(e as Error).message}`, loud: true };
  }

  if (names.length === 1) return { file: path.join(dir, names[0]) };
  if (names.length === 0) return { reason: `không có file configuration.*.json trong ${dir}`, loud: true };
  return {
    reason: `có ${names.length} file configuration.*.json trong ${dir} (${names.join(", ")}) — ` +
      `không đoán được file nào, đặt VAULT_SECRET_FILE để chỉ định`,
    loud: true,
  };
}

/** Làm phẳng giá trị JSON thành chuỗi đúng như ví dụ trong hướng dẫn của ISC. */
function flatten(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function pick(...names: string[]): string | undefined {
  for (const n of names) {
    const v = process.env[n];
    if (v && v.length > 0) return v;
  }
  return undefined;
}

/**
 * Ghép DATABASE_URL từ các mảnh rời nếu nhánh `database/` của DBA không trả nguyên chuỗi.
 * Tên khoá bên DBA chưa chốt lúc viết hàm này nên nhận cả 3 bộ alias thường gặp.
 * Trả về tên các khoá đã dùng để log (không log giá trị — có mật khẩu trong đó).
 */
function assembleDatabaseUrl(): string[] {
  if (process.env.DATABASE_URL) return [];

  const host = pick("DB_HOST", "POSTGRES_HOST", "PGHOST");
  const user = pick("DB_USER", "DB_USERNAME", "POSTGRES_USER", "PGUSER");
  const pass = pick("DB_PASSWORD", "DB_PASS", "POSTGRES_PASSWORD", "PGPASSWORD");
  const name = pick("DB_NAME", "DB_DATABASE", "POSTGRES_DB", "PGDATABASE");
  if (!host || !user || !pass || !name) return [];

  const port = pick("DB_PORT", "POSTGRES_PORT", "PGPORT") || "5432";
  const sslmode = pick("DB_SSLMODE", "PGSSLMODE");
  const auth = `${encodeURIComponent(user)}:${encodeURIComponent(pass)}`;
  const query = sslmode ? `?sslmode=${encodeURIComponent(sslmode)}` : "";
  process.env.DATABASE_URL = `postgres://${auth}@${host}:${port}/${name}${query}`;
  return ["host", "port", "user", "password", "dbname", ...(sslmode ? ["sslmode"] : [])];
}

let cached: VaultLoadResult | null = null;

/** Chỉ dùng trong test — xoá memo để chạy lại được nhiều lần trong một process. */
export function resetVaultEnvCache(): void {
  cached = null;
}

/**
 * Đọc file secret của Vault và nạp vào process.env. Chạy đúng MỘT lần mỗi process.
 * KHÔNG ghi đè biến đã có ⇒ vận hành vẫn override được bằng `env:` trong manifest k8s.
 * Mọi lỗi đều bị nuốt (chỉ log): không có đường nào để việc này làm chết dev server hay
 * hỏng lượt deploy trên VM.
 */
export function loadVaultEnv(): VaultLoadResult {
  if (cached) return cached;

  let result: VaultLoadResult;
  try {
    const picked = pickFile();
    if ("reason" in picked) {
      if (picked.loud) console.warn(`[vault] bỏ qua secret: ${picked.reason}`);
      result = { file: null, applied: [], skipped: [], reason: picked.reason };
    } else {
      const raw = readFileSync(picked.file, "utf8");
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("nội dung không phải object JSON");
      }

      const applied: string[] = [];
      const skipped: string[] = [];
      for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
        if (process.env[key] !== undefined) { skipped.push(key); continue; }
        process.env[key] = flatten(value);
        applied.push(key);
      }

      const parts = assembleDatabaseUrl();
      if (parts.length > 0) {
        applied.push("DATABASE_URL");
        console.log(`[vault] ghép DATABASE_URL từ ${parts.join(", ")}`);
      }

      // Chỉ log TÊN khoá. Giá trị là pepper/khoá AES/mật khẩu DB — không bao giờ đưa vào log.
      console.log(
        `[vault] nạp ${applied.length} biến từ ${picked.file}: ${applied.join(", ") || "(không có)"}` +
          (skipped.length > 0 ? ` · bỏ qua vì env đã có: ${skipped.join(", ")}` : "")
      );
      if (!process.env.DATABASE_URL) {
        console.warn(
          `[vault] KHÔNG thấy DATABASE_URL và cũng không đủ mảnh để ghép. ` +
            `Khoá nhận được: ${Object.keys(parsed as object).join(", ") || "(rỗng)"}`
        );
      }
      result = { file: picked.file, applied, skipped };
    }
  } catch (e) {
    const reason = (e as Error).message;
    console.warn(`[vault] bỏ qua secret do lỗi: ${reason}`);
    result = { file: null, applied: [], skipped: [], reason };
  }

  cached = result;
  return result;
}
