// 3 bộ đếm công khai — cache 15s (03 §counters).
// 18/8: từ 4 ô còn 3 ô theo email review — "số biển, số khu phố, số câu đóng góp".
// Figma bản 2/9 · B2 chốt đúng 3 chỉ số này; `issues_open` (góc phố đang chờ) đã bỏ
// khỏi giao diện nên gỡ luôn khỏi query để khỏi đếm thừa mỗi 15s.
import { one } from "./db";

interface Counters {
  signs_installed: number;
  /** Khu phố đang tham gia — ô thứ 2 của dải 3 con số (Figma 2/9 · B2) */
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
      (SELECT count(*)::int FROM neighborhoods WHERE NOT hidden) AS neighborhoods_joined,
      -- "Câu đóng góp" chỉ đếm câu ĐÃ DUYỆT (quy tắc cứng 1: chưa duyệt thì chưa
      -- tính công khai) — cùng tinh thần với bộ đếm "người đóng góp" cũ.
      (SELECT count(*)::int FROM suggestions
        WHERE status IN ('approved','selected','produced','installed')) AS suggestions_total
  `);
  cache = { data: row!, at: Date.now() };
  return row!;
}
