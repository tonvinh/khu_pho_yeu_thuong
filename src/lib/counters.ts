// 3 bộ đếm công khai — cache 15s (03 §counters).
// 18/8: từ 4 ô còn 3 ô theo email review — "số biển, số khu phố, số câu đóng góp"
// (bỏ "góc phố đang chờ" và "người đóng góp").
import { one } from "./db";

interface Counters {
  signs_installed: number;
  /** Góc phố đã duyệt còn mở (chưa lên biển) — ô thứ 2 trong design lp1 */
  issues_open: number;
  neighborhoods_joined: number;
  suggestions_total: number;
}

let cache: { data: Counters; at: number } | null = null;
const TTL = 15_000;

export async function getCounters(): Promise<Counters> {
  if (cache && Date.now() - cache.at < TTL) return cache.data;
  const row = await one<Counters>(`
    SELECT
      (SELECT count(*)::int FROM suggestions WHERE status = 'installed') AS signs_installed,
      (SELECT count(*)::int FROM issues WHERE status IN ('waiting','voting')) AS issues_open,
      (SELECT count(*)::int FROM neighborhoods WHERE NOT hidden) AS neighborhoods_joined,
      -- "Câu đóng góp" chỉ đếm câu ĐÃ DUYỆT (quy tắc cứng 1: chưa duyệt thì chưa
      -- tính công khai) — cùng tinh thần với bộ đếm "người đóng góp" cũ.
      (SELECT count(*)::int FROM suggestions
        WHERE status IN ('approved','selected','produced','installed')) AS suggestions_total
  `);
  cache = { data: row!, at: Date.now() };
  return row!;
}
