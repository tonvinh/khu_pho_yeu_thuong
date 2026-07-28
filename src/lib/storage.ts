// MinIO (S3-compatible) — bucket private; public truy cập qua route stream /api/img.
// Key prefix: public/... (ảnh địa điểm, ảnh biển, bản đồ cách điệu, ảnh khu phố)
//             private/... (ảnh bản đồ GỐC — chỉ admin, Q3)
import { Client } from "minio";
import { env } from "./env";

declare global {
  // eslint-disable-next-line no-var
  var __kpMinio: Client | undefined;
}

export function minio(): Client {
  if (!globalThis.__kpMinio) {
    const c = env.MINIO;
    globalThis.__kpMinio = new Client({
      endPoint: c.endPoint,
      port: c.port,
      useSSL: c.useSSL,
      accessKey: c.accessKey,
      secretKey: c.secretKey,
    });
  }
  return globalThis.__kpMinio;
}

export async function ensureBucket(): Promise<void> {
  const { bucket } = env.MINIO;
  const exists = await minio().bucketExists(bucket).catch(() => false);
  if (!exists) await minio().makeBucket(bucket);
}

export async function putObject(key: string, buf: Buffer, contentType: string): Promise<string> {
  await ensureBucket();
  await minio().putObject(env.MINIO.bucket, key, buf, buf.length, {
    "Content-Type": contentType,
  });
  return key;
}

export async function getObjectBuffer(key: string): Promise<Buffer> {
  const stream = await minio().getObject(env.MINIO.bucket, key);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}

/** URL public cho ảnh key prefix public/ — đi qua route stream của web app */
export function imgUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  const base = env.BASE_PATH;
  return `${base}/api/img/${key}`;
}
