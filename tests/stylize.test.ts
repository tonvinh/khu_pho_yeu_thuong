// Cách điệu bản đồ (Q3): bản public phải là duotone kem–đỏ gạch, KHÔNG phải đen trắng.
// Guard hồi quy: .tint() sau .grayscale() ở sharp 0.34 không ăn màu — pipeline hiện tại
// dùng desaturate 3 band + linear() nên phải cho ra ảnh CÓ MÀU (kênh R > G > B).
import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { stylizeMap } from "@/lib/stylize";

describe("stylizeMap — duotone đỏ gạch → kem", () => {
  it("ảnh xám đầu vào → đầu ra có màu ấm (R > G > B), không phải grayscale", async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">
      <rect width="400" height="300" fill="#ffffff"/>
      <rect x="100" y="80" width="200" height="140" fill="#666666"/>
    </svg>`;
    const original = await sharp(Buffer.from(svg)).png().toBuffer();

    const out = await stylizeMap(original);
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe("webp");

    const stats = await sharp(out).stats();
    const [r, g, b] = stats.channels.map((c) => c.mean);
    expect(r).toBeGreaterThan(g);
    expect(g).toBeGreaterThan(b);
  });
});
