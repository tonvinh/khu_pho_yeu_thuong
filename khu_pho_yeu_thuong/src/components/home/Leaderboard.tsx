"use client";
// Bảng xếp hạng "Cây bút của khu phố" + "Khu phố tử tế nhất tháng" (02 §5)
import type { Ambassador, NeighborhoodOfMonth } from "./types";
import { COPY } from "@/lib/copy";
import { BASE } from "../client-api";

export default function Leaderboard({
  ambassadors,
  neighborhoodOfMonth,
}: {
  ambassadors: Ambassador[];
  neighborhoodOfMonth: NeighborhoodOfMonth | null;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-extrabold">{COPY.leaderboardTitle}</h2>
      <p className="text-sm text-ink-soft">{COPY.leaderboardSub}</p>

      <div className="mt-3 overflow-hidden rounded-3xl bg-white shadow-sm">
        {ambassadors.slice(0, 5).map((a, i) => (
          <div
            key={a.user_id}
            className="flex items-center gap-3 border-b border-cream-dark px-4 py-3 last:border-0"
          >
            <span
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-extrabold ${
                i === 0 ? "bg-brick text-white" : "bg-cream-dark text-ink"
              }`}
            >
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-bold">{a.display_name}</div>
              <div className="text-xs text-ink-soft">
                {a.signs_installed} câu được treo · {a.votes_received} lượt thương
              </div>
            </div>
            <div className="text-lg font-extrabold text-brick">{a.score}đ</div>
            <a
              href={`${BASE}/dai-su/${a.share_slug}`}
              title="Chia sẻ thành tích"
              className="tap grid h-9 w-9 place-items-center rounded-full bg-cream text-sm"
            >
              ↗
            </a>
          </div>
        ))}
        {ambassadors.length === 0 && (
          <p className="p-6 text-center text-sm text-ink-soft">
            Chưa có ai lên bảng — viết câu nhắc đầu tiên cho xóm bạn nhé!
          </p>
        )}
      </div>

      {neighborhoodOfMonth && (
        <p className="mt-3 rounded-2xl bg-cream-dark/60 px-4 py-3 text-sm">
          Khu phố tử tế nhất tháng: <strong>{neighborhoodOfMonth.name}</strong> —{" "}
          {neighborhoodOfMonth.new_signs} biển mới, {neighborhoodOfMonth.votes} lượt thương
        </p>
      )}
    </section>
  );
}
