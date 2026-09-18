// Nạp secret Vault trên k8s FPT (docs/18 §2.4). Khoá 3 thứ dễ vỡ nhất:
//  1. chọn ĐÚNG file khi NODE_ENV không khớp tên file (Next ép NODE_ENV=production ở mọi env);
//  2. KHÔNG ghi đè biến môi trường sẵn có (manifest k8s phải override được);
//  3. không bao giờ ném lỗi — localhost và VM chạy chung code này, thư mục /vault/secrets
//     không tồn tại ở đó và mọi lỗi phải im lặng rơi về process.env.
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { loadVaultEnv, resetVaultEnvCache } from "@/lib/vault-env";

let dir: string;
const TOUCHED = [
  "VAULT_SECRETS_DIR", "VAULT_SECRET_FILE", "NODE_ENV", "DATABASE_URL", "PHONE_PEPPER",
  "PHONE_AES_KEY", "SITE_ORIGIN", "DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_NAME",
  "DB_SSLMODE", "POSTGRES_HOST", "App", "FEATURE", "EMPTY", "NESTED",
];
let saved: Record<string, string | undefined> = {};

async function writeSecret(name: string, data: unknown) {
  await writeFile(path.join(dir, name), JSON.stringify(data), "utf8");
}

/** TS khai NODE_ENV là read-only; test cần đổi để mô phỏng pod staging/production. */
function setNodeEnv(value: string) {
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
}

beforeEach(async () => {
  saved = Object.fromEntries(TOUCHED.map((k) => [k, process.env[k]]));
  for (const k of TOUCHED) delete process.env[k];
  dir = await mkdtemp(path.join(tmpdir(), "kp-vault-"));
  process.env.VAULT_SECRETS_DIR = dir;
  resetVaultEnvCache();
  // Loader log tên khoá mỗi lượt — nuốt đi cho output test sạch.
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(async () => {
  vi.restoreAllMocks();
  resetVaultEnvCache();
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  await rm(dir, { recursive: true, force: true });
});

describe("chọn file", () => {
  test("ưu tiên configuration.<NODE_ENV>.json", async () => {
    setNodeEnv("staging");
    await writeSecret("configuration.staging.json", { SITE_ORIGIN: "https://staging" });
    await writeSecret("configuration.production.json", { SITE_ORIGIN: "https://prod" });

    const r = loadVaultEnv();

    expect(r.file).toBe(path.join(dir, "configuration.staging.json"));
    expect(process.env.SITE_ORIGIN).toBe("https://staging");
  });

  test("NODE_ENV không khớp tên file → lấy file configuration.*.json DUY NHẤT", async () => {
    // Ca thật: pod staging nhưng Next ép NODE_ENV=production, file lại tên .staging.json
    setNodeEnv("production");
    await writeSecret("configuration.staging.json", { PHONE_PEPPER: "pepper-staging" });

    const r = loadVaultEnv();

    expect(r.file).toBe(path.join(dir, "configuration.staging.json"));
    expect(process.env.PHONE_PEPPER).toBe("pepper-staging");
  });

  test("nhiều file mà không khớp NODE_ENV → KHÔNG đoán, không nạp gì", async () => {
    setNodeEnv("production");
    await writeSecret("configuration.staging.json", { PHONE_PEPPER: "a" });
    await writeSecret("configuration.development.json", { PHONE_PEPPER: "b" });

    const r = loadVaultEnv();

    expect(r.file).toBeNull();
    expect(r.reason).toContain("2 file");
    expect(process.env.PHONE_PEPPER).toBeUndefined();
  });

  test("VAULT_SECRET_FILE đè mọi thứ", async () => {
    setNodeEnv("production");
    await writeSecret("configuration.production.json", { SITE_ORIGIN: "https://prod" });
    const other = path.join(dir, "rieng.json");
    await writeFile(other, JSON.stringify({ SITE_ORIGIN: "https://rieng" }), "utf8");
    process.env.VAULT_SECRET_FILE = other;

    loadVaultEnv();

    expect(process.env.SITE_ORIGIN).toBe("https://rieng");
  });

  test("không có thư mục → no-op, KHÔNG ném lỗi (localhost và VM đi nhánh này)", () => {
    process.env.VAULT_SECRETS_DIR = path.join(dir, "khong-ton-tai");

    const r = loadVaultEnv();

    expect(r.file).toBeNull();
    expect(r.applied).toEqual([]);
  });

  test("JSON hỏng → nuốt lỗi, không nạp gì", async () => {
    setNodeEnv("production");
    await writeFile(path.join(dir, "configuration.production.json"), "{ hong", "utf8");

    const r = loadVaultEnv();

    expect(r.file).toBeNull();
    expect(r.reason).toBeTruthy();
  });
});

describe("nạp giá trị", () => {
  test("KHÔNG ghi đè biến môi trường đã có", async () => {
    setNodeEnv("production");
    process.env.SITE_ORIGIN = "https://tu-manifest";
    await writeSecret("configuration.production.json", {
      SITE_ORIGIN: "https://tu-vault",
      PHONE_PEPPER: "tu-vault",
    });

    const r = loadVaultEnv();

    expect(process.env.SITE_ORIGIN).toBe("https://tu-manifest");
    expect(process.env.PHONE_PEPPER).toBe("tu-vault");
    expect(r.skipped).toContain("SITE_ORIGIN");
    expect(r.applied).toContain("PHONE_PEPPER");
  });

  test("làm phẳng object/boolean/null thành chuỗi", async () => {
    setNodeEnv("production");
    await writeSecret("configuration.production.json", {
      NESTED: { a: 1 }, FEATURE: true, EMPTY: null,
    });

    loadVaultEnv();

    expect(process.env.NESTED).toBe('{"a":1}');
    expect(process.env.FEATURE).toBe("true");
    expect(process.env.EMPTY).toBe("");
  });

  test("chỉ nạp một lần mỗi process (memoize)", async () => {
    setNodeEnv("production");
    await writeSecret("configuration.production.json", { PHONE_PEPPER: "lan-1" });
    loadVaultEnv();
    process.env.PHONE_PEPPER = "da-doi";

    loadVaultEnv();

    expect(process.env.PHONE_PEPPER).toBe("da-doi");
  });
});

describe("DATABASE_URL", () => {
  test("nguyên chuỗi từ Vault thì dùng luôn", async () => {
    setNodeEnv("production");
    await writeSecret("configuration.production.json", {
      DATABASE_URL: "postgres://u:p@h:5432/d",
      DB_HOST: "bo-qua",
    });

    loadVaultEnv();

    expect(process.env.DATABASE_URL).toBe("postgres://u:p@h:5432/d");
  });

  test("ghép từ mảnh rời khi DBA khai tách (port mặc định 5432)", async () => {
    setNodeEnv("production");
    await writeSecret("configuration.production.json", {
      DB_HOST: "pg.internal", DB_USER: "khupho", DB_PASSWORD: "m@t kh#u", DB_NAME: "khupho",
    });

    loadVaultEnv();

    // Mật khẩu có ký tự đặc biệt PHẢI được encode, nếu không chuỗi kết nối vỡ
    expect(process.env.DATABASE_URL).toBe("postgres://khupho:m%40t%20kh%23u@pg.internal:5432/khupho");
  });

  test("có sslmode thì gắn vào query", async () => {
    setNodeEnv("production");
    await writeSecret("configuration.production.json", {
      DB_HOST: "h", DB_PORT: "6432", DB_USER: "u", DB_PASSWORD: "p", DB_NAME: "d", DB_SSLMODE: "require",
    });

    loadVaultEnv();

    expect(process.env.DATABASE_URL).toBe("postgres://u:p@h:6432/d?sslmode=require");
  });

  test("thiếu mảnh thì KHÔNG ghép chuỗi nửa vời", async () => {
    setNodeEnv("production");
    await writeSecret("configuration.production.json", { DB_HOST: "h", DB_USER: "u" });

    loadVaultEnv();

    expect(process.env.DATABASE_URL).toBeUndefined();
  });
});
