// Đọc secrets từ biến môi trường (secret manager / .env — KHÔNG hard-code).
// PEPPER (định danh) và khoá AES (liên hệ) là 2 khoá TÁCH BIỆT (07 §2.1).
import path from "node:path";
import { loadVaultEnv } from "./vault-env";

// Nạp secret Vault (k8s bên FPT) TRƯỚC khi đọc biến nào. Đặt ở đây chứ không ở
// instrumentation.ts vì mọi chỗ dùng secret (crypto.ts, db.ts, storage.ts, url.ts) đều đi qua
// file này ⇒ phủ hết entry point mà không đụng vào cấu trúc build của Next.
// Ngoài k8s là no-op im lặng: không có /vault/secrets thì thoát ngay.
loadVaultEnv();

const isProd = process.env.NODE_ENV === "production";

function required(name: string, devFallback: string): string {
  const v = process.env[name];
  if (v && v.length > 0) return v;
  if (isProd) throw new Error(`Thiếu biến môi trường bắt buộc: ${name}`);
  return devFallback;
}

export const env = {
  get DATABASE_URL() {
    return required(
      "DATABASE_URL",
      "postgres://khupho:khupho_dev@localhost:5432/khupho"
    );
  },
  /** PEPPER cho HMAC-SHA256 định danh SĐT — ≥256-bit, KHÔNG xoay được giữa chừng */
  get PHONE_PEPPER() {
    return required("PHONE_PEPPER", "dev-only-pepper-khong-dung-cho-production");
  },
  /** Khoá AES-256-GCM (base64, 32 byte) mã hoá SĐT liên hệ — tách khỏi PEPPER */
  get PHONE_AES_KEY() {
    return required("PHONE_AES_KEY", Buffer.from("dev-aes-key-32-bytes-padding-000").toString("base64"));
  },
  get SITE_ORIGIN() {
    return process.env.SITE_ORIGIN || "http://localhost:3000";
  },
  get BASE_PATH() {
    return process.env.NEXT_PUBLIC_BASE_PATH || process.env.BASE_PATH || "";
  },
  /** Thư mục gốc chứa ảnh upload (key `public/...`, `private/...` nằm ngay dưới).
   *  Production mount NFS/PVC vào đúng /app/uploads; dev ngoài Docker đặt `./uploads`.
   *  Luôn trả đường dẫn TUYỆT ĐỐI (resolve theo cwd) và đọc lại mỗi lần gọi. */
  get UPLOAD_DIR() {
    return path.resolve(process.env.UPLOAD_DIR || "/app/uploads");
  },
};
