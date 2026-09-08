// 3 bộ đếm công khai — cache 15s (03 §counters).
// 18/8: từ 4 ô còn 3 ô theo email review — "số biển, số khu phố, số câu đóng góp".
// Figma bản 2/9 · B2 chốt đúng 3 chỉ số này; `issues_open` (góc phố đang chờ) đã bỏ
// khỏi giao diện nên gỡ luôn khỏi query để khỏi đếm thừa mỗi 15s.
//
// 8/9 (QC): admin ĐƯỢC ghi đè cả 3 con số (/admin/noi-dung) — chiến dịch có biển treo
// ngoài đời / khu phố tham gia mà web chưa kịp có dữ liệu. Ghi đè lưu trong bảng
// `site_content` (cùng chỗ với text trang chủ, KHÔNG cần migration) dưới 3 khoá
// `counter_*`; ô trống → xoá hàng → quay về đếm thật.
//   · `getCounters()`  → số CÔNG KHAI (đã áp ghi đè) — trang chủ + /api/v1/counters
//   · `getRealCounters()` → số ĐẾM THẬT — dashboard admin phải thấy dữ liệu thật
import { one, q } from "./db";

interface Counters {
  signs_installed: number;
  /** Khu phố đang tham gia — ô thứ 2 của dải 3 con số (Figma 2/9 · B2) */
  neighborhoods_joined: number;
  suggestions_total: number;
}

export type CounterKey = keyof Counters;

/** Khoá site_content tương ứng từng ô — dùng chung với API admin */
export const COUNTER_KEYS: Record<CounterKey, string> = {
  signs_installed: "counter_signs_installed",
  neighborhoods_joined: "counter_neighborhoods_joined",
  suggestions_total: "counter_suggestions_total",
};

export const COUNTER_FIELDS = Object.keys(COUNTER_KEYS) as CounterKey[];

/** Trần cho số ghi đè — đủ rộng cho mọi kịch bản chiến dịch, chặn số rác */
export const COUNTER_MAX = 1_000_000;

type Overrides = Record<CounterKey, number | null>;

let cache: { real: Counters; over: Overrides; at: number } | null = null;
const TTL = 15_000;

/** Gọi sau khi admin lưu ghi đè để trang chủ đổi ngay, không đợi hết 15s cache */
export function resetCountersCache() {
  cache = null;
}

async function load() {
  if (cache && Date.now() - cache.at < TTL) return cache;
  const [real, rows] = await Promise.all([
    one<Counters>(`
      SELECT
        (SELECT count(*)::int FROM suggestions WHERE status = 'installed') AS signs_installed,
        (SELECT count(*)::int FROM neighborhoods
          WHERE NOT hidden AND deleted_at IS NULL) AS neighborhoods_joined,
        -- "Câu đóng góp" chỉ đếm câu ĐÃ DUYỆT (quy tắc cứng 1: chưa duyệt thì chưa
        -- tính công khai) — cùng tinh thần với bộ đếm "người đóng góp" cũ.
        (SELECT count(*)::int FROM suggestions
          WHERE status IN ('approved','selected','produced','installed')) AS suggestions_total
    `),
    q<{ key: string; value: string }>(
      `SELECT key, value FROM site_content WHERE key = ANY($1)`,
      [Object.values(COUNTER_KEYS)]
    ),
  ]);
  const byKey = new Map(rows.map((r) => [r.key, r.value]));
  const over = Object.fromEntries(
    COUNTER_FIELDS.map((f) => {
      const raw = byKey.get(COUNTER_KEYS[f]);
      const n = raw === undefined ? NaN : Number(raw);
      // Hàng rác trong bảng (sửa tay bằng SQL) thì lơ đi, đừng để trang chủ ra NaN
      return [f, Number.isInteger(n) && n >= 0 ? n : null];
    })
  ) as Overrides;
  cache = { real: real!, over, at: Date.now() };
  return cache;
}

/** Số hiển thị công khai: ghi đè của admin nếu có, không thì đếm thật */
export async function getCounters(): Promise<Counters> {
  const { real, over } = await load();
  return Object.fromEntries(
    COUNTER_FIELDS.map((f) => [f, over[f] ?? real[f]])
  ) as unknown as Counters;
}

/** Số đếm thật từ dữ liệu — dashboard admin, và placeholder ở màn Nội dung */
export async function getRealCounters(): Promise<Counters> {
  return (await load()).real;
}

/** Ghi đè đang lưu (null = đang để tự đếm) — cho API admin */
export async function getCounterOverrides(): Promise<Overrides> {
  return (await load()).over;
}
