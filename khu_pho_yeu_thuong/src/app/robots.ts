import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

// /admin chặn index (quy tắc cứng 7)
export default function robots(): MetadataRoute.Robots {
  const base = env.BASE_PATH;
  return {
    rules: [{ userAgent: "*", allow: `${base}/`, disallow: [`${base}/admin`, `${base}/api`] }],
  };
}
