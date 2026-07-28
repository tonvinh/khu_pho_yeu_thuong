// Helper URL — mọi link/asset/OG đi qua đây, không hard-code đường dẫn gốc (quy tắc 9)
import { env } from "./env";

/** Đường dẫn nội bộ có basePath (dùng cho href/src phía server) */
export function withBase(path: string): string {
  const base = env.BASE_PATH;
  if (!path.startsWith("/")) path = "/" + path;
  return `${base}${path}`;
}

/** URL tuyệt đối (OG tags, share link) */
export function absoluteUrl(path: string): string {
  return `${env.SITE_ORIGIN}${withBase(path)}`;
}
