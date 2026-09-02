import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    // Test logic thuần vẫn chạy môi trường `node`; test giao diện tự khai
    // `@vitest-environment jsdom` ở đầu file để không đổi môi trường của bộ test cũ.
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
  },
  // JSX runtime tự động như Next (tsconfig "jsx": "preserve" + SWC) — không phải
  // import React thủ công trong từng file test.
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
