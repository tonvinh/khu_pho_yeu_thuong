// Pentest 10/2026 — lỗi 5.2.3: khách xem được khu phố ĐANG ẨN qua /khu-pho/<slug>.
// Khoá: loader chặn mặc định; trang share 404 với khách, admin được xem trước.
import { beforeEach, describe, expect, test, vi } from "vitest";

const db = vi.hoisted(() => ({
  one: vi.fn(),
  q: vi.fn(async () => []),
}));
vi.mock("@/lib/db", () => db);

const admin = vi.hoisted(() => ({ getAdminUser: vi.fn() }));
vi.mock("@/lib/admin-session", () => admin);
vi.mock("@/lib/site-content", () => ({ getSiteContent: vi.fn(async () => ({})) }));

import { loadNeighborhoodDetail } from "@/lib/neighborhood";
import NeighborhoodPage, { generateMetadata } from "@/app/khu-pho/[slug]/page";

const ROW = {
  id: "efc61932-3ae7-4800-9ac5-2c759adee8b9", name: "hai", slug: "hai-023ebb",
  ward: null, city: "Thành phố Hà Nội", hidden: true, certified_4n: false, certified_at: null,
  certificate_photo_key: null, map_stylized_key: null, photo_keys: [],
  total_issues: 0, signed_issues: 0, suggestions_total: 0,
};

/** Giả lập Postgres: hàng ẩn chỉ trả về khi tham số includeHidden ($2) là true */
function dbHasHiddenRow() {
  db.one.mockImplementation(async (_sql: string, params: unknown[]) => (params[1] ? ROW : null));
}

const params = () => ({ params: Promise.resolve({ slug: "hai-023ebb" }) });

beforeEach(() => {
  vi.clearAllMocks();
  dbHasHiddenRow();
});

describe("loadNeighborhoodDetail — chặn khu ẩn mặc định", () => {
  test("SQL luôn có điều kiện hidden, mặc định includeHidden = false", async () => {
    expect(await loadNeighborhoodDetail("hai-023ebb")).toBeNull();
    const [sql, p] = db.one.mock.calls[0];
    expect(sql).toMatch(/NOT n\.hidden/);
    expect(p).toEqual(["hai-023ebb", false]);
  });

  test("includeHidden: true → trả khu ẩn kèm cờ hidden", async () => {
    const nb = await loadNeighborhoodDetail("hai-023ebb", null, { includeHidden: true });
    expect(nb?.hidden).toBe(true);
  });
});

describe("/khu-pho/[slug] với khu đang ẩn", () => {
  test("khách (không có session admin) → 404", async () => {
    admin.getAdminUser.mockResolvedValue(null);
    await expect(NeighborhoodPage(params())).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404|NEXT_NOT_FOUND/);
    expect(await generateMetadata(params())).toEqual({});
  });

  test("tra session admin lỗi → vẫn 404 (fail-closed)", async () => {
    admin.getAdminUser.mockRejectedValue(new Error("db down"));
    await expect(NeighborhoodPage(params())).rejects.toThrow();
  });

  test("admin đã đăng nhập → xem trước được, noindex", async () => {
    admin.getAdminUser.mockResolvedValue({ id: "a1", email: "a@fpt.com", session_id: "s1" });
    const el = await NeighborhoodPage(params());
    expect(JSON.stringify(el)).toContain("Bản xem trước dành cho admin");
    const meta = await generateMetadata(params());
    expect(meta.robots).toEqual({ index: false, follow: false });
  });

  test("khu công khai → không tra session admin", async () => {
    db.one.mockResolvedValue({ ...ROW, hidden: false });
    await NeighborhoodPage(params());
    expect(admin.getAdminUser).not.toHaveBeenCalled();
  });
});
