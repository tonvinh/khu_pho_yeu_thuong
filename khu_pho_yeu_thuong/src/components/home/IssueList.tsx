"use client";
// Danh sách "góc xóm đang chờ" (02 §2)
import type { IssueCard } from "./types";
import { categoryIcon, categoryLabel, ISSUE_STATUS_LABEL } from "@/lib/taxonomy";

const BADGE: Record<string, string> = {
  waiting: "bg-status-waiting/10 text-status-waiting",
  voting: "bg-status-voting/10 text-status-voting",
  signed: "bg-status-signed/10 text-status-signed",
};

export default function IssueList({
  issues,
  onOpenIssue,
  onPropose,
}: {
  issues: IssueCard[];
  onOpenIssue: (id: string) => void;
  onPropose: () => void;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-extrabold">📍 Góc xóm đang chờ</h2>

      <button
        onClick={onPropose}
        className="tap mt-3 w-full rounded-2xl border-2 border-dashed border-brick/50 bg-brick-light/50 px-4 py-4 text-center font-bold text-brick"
      >
        + Đề xuất vấn đề khu mình
      </button>

      <div className="mt-3 space-y-2.5">
        {issues.map((it) => (
          <button
            key={it.id}
            onClick={() => onOpenIssue(it.id)}
            className="block w-full rounded-2xl bg-white p-4 text-left shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="font-bold">
                {categoryIcon(it.category)} {categoryLabel(it.category)}
                <span className="ml-2 font-medium text-ink-soft">· {it.location_text}</span>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${BADGE[it.status]}`}>
                {ISSUE_STATUS_LABEL[it.status]}
              </span>
            </div>
            <p className="mt-1 text-sm text-ink-soft">
              Khu phố nêu: cần một câu nhắc cho điểm này
            </p>
            <div className="mt-2 flex gap-3 text-xs font-semibold text-ink-soft">
              <span>{it.suggestion_count} câu đề xuất</span>
              {it.top_votes > 0 && <span className="text-brick">★ {it.top_votes} bình chọn</span>}
              <span className="ml-auto">{it.neighborhood_name}</span>
            </div>
          </button>
        ))}
        {issues.length === 0 && (
          <p className="rounded-2xl bg-white p-6 text-center text-sm text-ink-soft shadow-sm">
            Chưa có góc xóm nào đang chờ — bạn đề xuất điểm đầu tiên nhé!
          </p>
        )}
      </div>
    </section>
  );
}
