import { createHmac, createHash, randomBytes, createCipheriv, createDecipheriv } from "node:crypto";
import { env } from "./env";

/** Định danh: phone_hash = HMAC-SHA256(SĐT chuẩn hoá, PEPPER) — một chiều (07 §2.1) */
export function phoneHash(normalizedPhone: string): string {
  return createHmac("sha256", env.PHONE_PEPPER).update(normalizedPhone).digest("hex");
}

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/** Session token ngẫu nhiên 256-bit — cookie giữ bản rõ, DB chỉ giữ SHA-256 */
export function newSessionToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: sha256Hex(token) };
}

export function randomSlug(len = 10): string {
  return randomBytes(16).toString("base64url").replace(/[-_]/g, "").slice(0, len).toLowerCase();
}

function aesKey(): Buffer {
  const key = Buffer.from(env.PHONE_AES_KEY, "base64");
  if (key.length !== 32) throw new Error("PHONE_AES_KEY phải là 32 byte (base64)");
  return key;
}

/** Liên hệ: AES-256-GCM — chỉ mã hoá SĐT khi có mục đích rõ (lead opt-in) */
export function encryptPhone(normalizedPhone: string): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", aesKey(), iv);
  const enc = Buffer.concat([cipher.update(normalizedPhone, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), enc]); // iv(12) | tag(16) | ciphertext
}

/** Giải mã chỉ tại module xuất lead — mọi truy cập phải có audit log */
export function decryptPhone(blob: Buffer): string {
  const iv = blob.subarray(0, 12);
  const tag = blob.subarray(12, 28);
  const data = blob.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", aesKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
