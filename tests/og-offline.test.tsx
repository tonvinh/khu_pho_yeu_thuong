// Ảnh OG phải dựng được KHÔNG CẦN INTERNET (build CI và production là môi trường kín).
// next/og tự `fetch` emoji (cdn.jsdelivr.net) và font bù (fonts.googleapis.com) cho ký tự
// font không có — ở đây chặn fetch toàn cục: route nào còn gọi mạng là test đỏ ngay trên
// máy dev có Internet, không phải đợi CI.
import { afterAll, beforeEach, describe, expect, test, vi } from "vitest";
import { readFileSync } from "node:fs";
import { OG_FALLBACK_HEADER } from "@/lib/og";
import { ogText, parseCmap } from "@/lib/og-text";

const fetchCalls: string[] = [];
vi.stubGlobal(
  "fetch",
  vi.fn(async (input: unknown) => {
    fetchCalls.push(String(input));
    throw new Error(`Môi trường kín: cấm gọi mạng (${String(input)})`);
  })
);
afterAll(() => vi.unstubAllGlobals());

const dbRow = vi.hoisted(() => ({ value: null as unknown }));
vi.mock("@/lib/db", () => ({ one: vi.fn(async () => dbRow.value) }));

beforeEach(() => {
  fetchCalls.length = 0;
});

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47];

async function expectRealPng(res: Response) {
  const buf = new Uint8Array(await res.arrayBuffer());
  expect(fetchCalls).toEqual([]);
  expect(res.headers.get(OG_FALLBACK_HEADER)).toBeNull();
  expect(res.headers.get("content-type")).toBe("image/png");
  expect([...buf.slice(0, 4)]).toEqual(PNG_MAGIC);
}

// Dữ liệu người dùng "độc": emoji đơn, chuỗi ZWJ, cờ, keycap, chữ Hán/Thái.
const NASTY = "Bà Liên 😊👨‍👩‍👧🇻🇳1️⃣ 中文 ภาษาไทย";

describe("ogText — lọc theo cmap của font", () => {
  const supported = parseCmap(readFileSync("public/fonts/BeVietnamPro-Regular.ttf"));

  test("giữ nguyên tiếng Việt và dấu câu dùng trong OG", () => {
    const s = "Khu phố Hẻm 42 đạt “chuẩn 4N” — 3/4 biển · Ưu đãi…";
    expect(ogText(s, supported)).toBe(s);
  });

  test("bỏ emoji và chữ ngoài font nguyên cụm, gộp khoảng trắng", () => {
    expect(ogText(NASTY, supported)).toBe("Bà Liên");
  });

  test("chuỗi toàn emoji thành rỗng", () => {
    expect(ogText("💛🏆🎉", supported)).toBe("");
  });

  test("Node thiếu Intl.Segmenter vẫn import được và vẫn lọc emoji", async () => {
    const intl = Intl as { Segmenter?: typeof Intl.Segmenter };
    const real = intl.Segmenter;
    delete intl.Segmenter; // giả lập runtime không có Segmenter
    try {
      vi.resetModules();
      const mod = await import("@/lib/og-text");
      expect(mod.ogText(NASTY, supported)).toBe("Bà Liên 1");
    } finally {
      intl.Segmenter = real;
      vi.resetModules();
    }
  });

  test("tiếng Việt dạng NFD (tổ hợp dấu rời) vẫn giữ", () => {
    expect(ogText("Thương".normalize("NFD"), supported)).toBe("Thương");
  });
});

describe("4 route OG dựng được khi không có mạng", () => {
  test("trang chủ (prerender lúc build)", async () => {
    const { default: Image } = await import("@/app/opengraph-image");
    await expectRealPng(await Image());
  });

  test("khu phố — tên có emoji + chữ Hán", async () => {
    dbRow.value = { name: `Hẻm ${NASTY}`, certified_4n: true, signed: 4, total: 4 };
    const { default: Image } = await import("@/app/khu-pho/[slug]/opengraph-image");
    await expectRealPng(await Image({ params: Promise.resolve({ slug: "x" }) }));
  });

  test("cây bút — tên hiển thị toàn emoji", async () => {
    dbRow.value = { display_name: "🔥🔥🔥", score: 82, signs: 1, votes: 45 };
    const { default: Image } = await import("@/app/dai-su/[slug]/opengraph-image");
    await expectRealPng(await Image({ params: Promise.resolve({ slug: "x" }) }));
  });

  test("biển đã treo — câu nhắc có emoji", async () => {
    dbRow.value = { content: `Đi chậm thôi ${NASTY}`, location_text: "Hẻm 1 🏠", author_name: NASTY };
    const { default: Image } = await import("@/app/bien/[id]/opengraph-image");
    await expectRealPng(
      await Image({ params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000000" }) })
    );
  });
});

describe("DB lỗi không làm route OG ra 500", () => {
  test.each([
    ["khu phố", "@/app/khu-pho/[slug]/opengraph-image", { slug: "x" }],
    ["cây bút", "@/app/dai-su/[slug]/opengraph-image", { slug: "x" }],
    ["biển", "@/app/bien/[id]/opengraph-image", { id: "00000000-0000-0000-0000-000000000000" }],
  ])("%s — dựng thẻ chung", async (_name, mod, params) => {
    const { one } = await import("@/lib/db");
    vi.mocked(one).mockRejectedValueOnce(new Error("giả lập DB sập"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { default: Image } = await import(/* @vite-ignore */ mod);
    await expectRealPng(await Image({ params: Promise.resolve(params) }));
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("ảnh dự phòng", () => {
  test("dựng lỗi thì trả public/og-default.png thay vì ném", async () => {
    vi.resetModules();
    vi.doMock("next/og", () => ({
      ImageResponse: class {
        constructor() {
          throw new Error("giả lập satori hỏng");
        }
      },
    }));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { ogCard } = await import("@/lib/og");
    const res = await ogCard({ badge: "x", title: "y" });
    expect(res.headers.get(OG_FALLBACK_HEADER)).toBe("1");
    expect(res.headers.get("content-type")).toBe("image/png");
    const buf = new Uint8Array(await res.arrayBuffer());
    expect([...buf.slice(0, 4)]).toEqual(PNG_MAGIC);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
    vi.doUnmock("next/og");
  });
});
