// Pentest 10/2026 — lỗi 5.2.1 (bom điểm ảnh PNG) và 5.2.2 (SVG đội lốt Content-Type ảnh).
// Mọi ảnh upload đi qua toCover/toWebp/stylizeMap ⇒ khoá ở tầng stylize.
import { describe, expect, test } from "vitest";
import sharp from "sharp";
import {
  checkImage, sniffImage, toCover, toWebp, stylizeMap, ImageError, MAX_INPUT_PIXELS,
} from "@/lib/stylize";

const solid = (w: number, h: number) =>
  sharp({ create: { width: w, height: h, channels: 3, background: "#c96" } });

// Bom filter rút gọn từ báo cáo — đủ để librsvg nhận ra là SVG
const SVG_BOMB = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="4000" height="4000">
  <defs><filter id="f"><feTurbulence baseFrequency="0.001" numOctaves="10"/>
  <feGaussianBlur stdDeviation="50"/></filter></defs>
  <rect width="4000" height="4000" filter="url(#f)"/></svg>`);

async function rejected(p: Promise<unknown>): Promise<ImageError> {
  const e = await p.then(() => null, (err) => err);
  expect(e).toBeInstanceOf(ImageError);
  return e as ImageError;
}

describe("sniffImage — nhận dạng theo chữ ký file", () => {
  test("JPEG / PNG / WebP thật", async () => {
    expect(sniffImage(await solid(8, 8).jpeg().toBuffer())).toBe("jpeg");
    expect(sniffImage(await solid(8, 8).png().toBuffer())).toBe("png");
    expect(sniffImage(await solid(8, 8).webp().toBuffer())).toBe("webp");
  });

  test("SVG, GIF, rác, rỗng → null", async () => {
    expect(sniffImage(SVG_BOMB)).toBeNull();
    expect(sniffImage(await solid(8, 8).gif().toBuffer())).toBeNull();
    expect(sniffImage(Buffer.from("RIFF0000AVI "))).toBeNull();
    expect(sniffImage(Buffer.alloc(0))).toBeNull();
  });
});

describe("checkImage / toCover / toWebp — chặn trước khi giải mã", () => {
  test("SVG (bất kể Content-Type client khai) bị từ chối 400 ở cả 3 hàm", async () => {
    for (const fn of [toCover, toWebp, stylizeMap]) {
      const e = await rejected(fn(SVG_BOMB));
      expect(e.status).toBe(400);
    }
  });

  test("SVG có tiền tố giả magic JPEG vẫn bị chặn (định dạng thật phải khớp)", async () => {
    const fake = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), SVG_BOMB]);
    expect((await rejected(checkImage(fake))).status).toBe(400);
  });

  test(`PNG vượt ${MAX_INPUT_PIXELS} điểm ảnh bị từ chối — không giải mã`, async () => {
    // 4100×4100 > 4096×4096; nén mạnh nên file nhỏ, đúng kiểu bom của báo cáo
    const bomb = await solid(4100, 4100).png({ compressionLevel: 9 }).toBuffer();
    const e = await rejected(toCover(bomb));
    expect(e.status).toBe(400);
    expect(e.message).toMatch(/quá lớn/);
  });

  test("ảnh đúng trần 4096×4096 vẫn qua", async () => {
    const ok = await solid(4096, 4096).jpeg().toBuffer();
    await expect(checkImage(ok)).resolves.toBeUndefined();
  });

  test("ảnh hỏng (đúng magic, thân rác) → 400 chứ không phải 500", async () => {
    const broken = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 7)]);
    expect((await rejected(toWebp(broken))).status).toBe(400);
  });

  test("ảnh hợp lệ vẫn ra WebP đúng cỡ", async () => {
    const out = await toCover(await solid(2000, 1500).jpeg().toBuffer());
    const meta = await sharp(out).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(["webp", 1280, 720]);
  });
});

describe("giới hạn xử lý đồng thời", () => {
  test("bắn 20 ảnh song song: một phần bị 429, phần còn lại xử lý xong, slot được nhả hết", async () => {
    const img = await solid(1600, 1200).jpeg().toBuffer();
    const results = await Promise.allSettled(Array.from({ length: 20 }, () => toCover(img)));
    const ok = results.filter((r) => r.status === "fulfilled").length;
    const busy = results.filter(
      (r) => r.status === "rejected" && (r.reason as ImageError).status === 429
    ).length;
    expect(ok + busy).toBe(20);
    expect(busy).toBeGreaterThan(0);
    expect(ok).toBeGreaterThanOrEqual(2);
    expect(globalThis.__kpImageSlots).toEqual({ active: 0, waiting: [] });
    // Sau khi nhả slot, upload kế tiếp chạy bình thường
    await expect(toCover(img)).resolves.toBeInstanceOf(Buffer);
  });
});
