// Cấu hình riêng cho E2E — chạy trên SERVER ĐANG CHẠY, không nằm trong `pnpm test`
// (bộ unit/UI phải chạy được offline). Xem tests/e2e/client.ts.
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    include: ["tests/e2e/**/*.e2e.ts"],
    // Route thật + DB thật chậm hơn unit test nhiều
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Cùng đụng vào một server/DB nên chạy tuần tự cho khỏi giẫm chân nhau
    fileParallelism: false,
  },
  esbuild: { jsx: "automatic" },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
