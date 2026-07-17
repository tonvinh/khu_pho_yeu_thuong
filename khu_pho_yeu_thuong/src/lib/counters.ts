// 4 bộ đếm công khai — cache 15s (03 §counters)
import { one } from "./db";

interface Counters {
  signs_installed: number;
  issues_waiting: number;
  contributors: number;
  neighborhoods_joined: number;
}

let cache: { data: Counters; at: number } | null = null;
const TTL = 15_000;

export async function getCounters(): Promise<Counters> {
  if (cache && Date.now() - cache.at < TTL) return cache.data;
  const row = await one<Counters>(`
    SELECT
      (SELECT count(*)::int FROM suggestions WHERE status = 'installed') AS signs_installed,
      (SELECT count(*)::int FROM issues WHERE status IN ('waiting','voting')) AS issues_waiting,
      -- "Người đóng góp" = người đã đề xuất vấn đề hoặc viết câu nhắc
      -- (ASSUMPTION: không tính người chỉ bình chọn — khớp seed demo 06 §5)
      (SELECT count(DISTINCT u.id)::int FROM users u
        WHERE EXISTS (SELECT 1 FROM issues WHERE proposed_by = u.id)
           OR EXISTS (SELECT 1 FROM suggestions WHERE author_id = u.id)) AS contributors,
      (SELECT count(*)::int FROM neighborhoods) AS neighborhoods_joined
  `);
  cache = { data: row!, at: Date.now() };
  return row!;
}
