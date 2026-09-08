// QC 8/9 — admin ghi đè được dải 3 con số ở hero (/admin/noi-dung).
// Ghi đè nằm trong bảng site_content (khoá counter_*): có số → trang chủ lấy số đó,
// bỏ trống/hàng rác → quay về đếm thật. Dashboard admin luôn xem số thật.
import { beforeEach, describe, expect, it, vi } from "vitest";

const one = vi.fn();
const q = vi.fn();
vi.mock("@/lib/db", () => ({
  one: (...a: unknown[]) => one(...a),
  q: (...a: unknown[]) => q(...a),
}));

import {
  COUNTER_KEYS,
  getCounterOverrides,
  getCounters,
  getRealCounters,
  resetCountersCache,
} from "@/lib/counters";

const REAL = { signs_installed: 3, neighborhoods_joined: 10, suggestions_total: 14 };

function db(rows: Array<{ key: string; value: string }>) {
  one.mockResolvedValue({ ...REAL });
  q.mockResolvedValue(rows);
  resetCountersCache();
}

beforeEach(() => { one.mockReset(); q.mockReset(); resetCountersCache(); });

describe("bộ đếm công khai · ghi đè từ admin", () => {
  it("không có ghi đè → dùng số đếm thật", async () => {
    db([]);
    expect(await getCounters()).toEqual(REAL);
    expect(await getCounterOverrides()).toEqual({
      signs_installed: null, neighborhoods_joined: null, suggestions_total: null,
    });
  });

  it("ghi đè từng ô một, ô còn lại vẫn tự đếm", async () => {
    db([{ key: COUNTER_KEYS.signs_installed, value: "120" }]);
    expect(await getCounters()).toEqual({ ...REAL, signs_installed: 120 });
  });

  it("ghi đè 0 vẫn là ghi đè (không rơi về số thật)", async () => {
    db([{ key: COUNTER_KEYS.suggestions_total, value: "0" }]);
    expect((await getCounters()).suggestions_total).toBe(0);
  });

  it("hàng rác trong bảng bị lơ đi — trang chủ không bao giờ ra NaN", async () => {
    db([
      { key: COUNTER_KEYS.signs_installed, value: "abc" },
      { key: COUNTER_KEYS.neighborhoods_joined, value: "-5" },
      { key: COUNTER_KEYS.suggestions_total, value: "1.5" },
    ]);
    expect(await getCounters()).toEqual(REAL);
  });

  it("getRealCounters KHÔNG áp ghi đè (dashboard admin xem số thật)", async () => {
    db([{ key: COUNTER_KEYS.neighborhoods_joined, value: "99" }]);
    expect(await getRealCounters()).toEqual(REAL);
    expect((await getCounters()).neighborhoods_joined).toBe(99);
  });

  it("chỉ truy vấn DB một lần cho cả 3 hàm nhờ cache 15s", async () => {
    db([]);
    await getCounters();
    await getRealCounters();
    await getCounterOverrides();
    expect(one).toHaveBeenCalledTimes(1);
    expect(q).toHaveBeenCalledTimes(1);
  });
});
