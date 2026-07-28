// Đọc secrets từ biến môi trường (secret manager / .env — KHÔNG hard-code).
// PEPPER (định danh) và khoá AES (liên hệ) là 2 khoá TÁCH BIỆT (07 §2.1).

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
  get MINIO() {
    return {
      endPoint: process.env.MINIO_ENDPOINT || "localhost",
      port: Number(process.env.MINIO_PORT || 9000),
      useSSL: process.env.MINIO_USE_SSL === "true",
      accessKey: process.env.MINIO_ACCESS_KEY || "khupho",
      secretKey: process.env.MINIO_SECRET_KEY || "khupho_dev_secret",
      bucket: process.env.MINIO_BUCKET || "khupho",
    };
  },
};
