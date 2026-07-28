import type { NextConfig } from "next";

// Quy tắc 9 (CLAUDE.md): basePath cấu hình bằng biến env — '' cho khupho.fpt.vn,
// '/khu-pho-de-thuong' cho fpt.vn/khu-pho-de-thuong. Đổi phương án = đổi 1 biến env.
const basePath = process.env.BASE_PATH || "";

const nextConfig: NextConfig = {
  basePath,
  output: "standalone",
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  serverExternalPackages: ["sharp", "minio", "@node-rs/argon2", "xlsx", "adm-zip"],
  async headers() {
    return [
      {
        source: "/admin/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
