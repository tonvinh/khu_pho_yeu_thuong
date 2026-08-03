"use client";
// Danh sách "góc xóm đang chờ" (02 §2) — card dọc theo prototype .issue:
// ô icon danh mục, tiêu đề "Loại · địa điểm", foot chip số liệu (không hiện pill trạng thái)
import type { IssueCard } from "./types";
import { categoryIcon, categoryLabel } from "@/lib/taxonomy";

const ORDER: Record<IssueCard["status"], number> = { voting: 0, waiting: 1, signed: 2 };

export default function IssueList({
  issues,
  onOpenIssue,
  onPropose,
  onToggleVote,
}: {
  issues: IssueCard[];
  onOpenIssue: (id: string) => void;
  onPropose: () => void;
  onToggleVote: (it: IssueCard) => void;
}) {
  const list = [...issues].sort((a, b) => ORDER[a.status] - ORDER[b.status]);

  return (
    <div className="flex flex-col gap-3">
      {list.map((it) => (
        <button
          key={it.id}
          onClick={() => onOpenIssue(it.id)}
          className="kp-card group cursor-pointer p-4 text-left transition hover:-translate-y-0.5 hover:shadow-kp"
        >
          <div className="flex items-center gap-3">
            <div className="grid h-[38px] w-[38px] flex-none place-items-center rounded-[11px] bg-[#F3ECE0] text-[19px]">
              {categoryIcon(it.category)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-semibold">
                {categoryLabel(it.category)} · {it.location_text}
              </div>
              <div className="mt-0.5 truncate text-[12.5px] text-ink-soft">
                {it.description || "Góc xóm đang chờ một lời nhắc dễ thương"} · {it.neighborhood_name}
              </div>
            </div>
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[12.5px] text-ink-soft">
            {it.status === "signed" && it.top_quote ? (
              <span className="text-status-signed">✓ {it.top_quote}</span>
            ) : (
              <>
                <span className="rounded-full bg-[#F3ECE0] px-2.5 py-0.5 text-[11.5px]">
                  {it.suggestion_count} câu đề xuất
                </span>
                {it.suggestion_count > 0 ? (
                  <>
                    <span className="rounded-full bg-[#F3ECE0] px-2.5 py-0.5 text-[11.5px]">
                      🧡 {it.top_votes.toLocaleString("vi-VN")} lượt thương
                    </span>
                    {/* Thương nhanh ngay trên card (không mở drawer) — span vì card đã là
                        <button> (không lồng button). Đã bình chọn rồi thì chip chỉ hiển thị,
                        bấm lại không đổi kết quả. */}
                    {it.voted ? (
                      <span
                        onClick={(e) => e.stopPropagation()}
                        className="ml-auto inline-flex cursor-default items-center gap-1 rounded-full border border-brick/25 bg-brick-light px-3 py-1.5 text-[11.5px] font-semibold text-brick-dark"
                      >
                        🧡 Đã bình chọn
                      </span>
                    ) : (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); onToggleVote(it); }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.stopPropagation();
                            onToggleVote(it);
                          }
                        }}
                        className="ml-auto inline-flex cursor-pointer items-center gap-1 rounded-full border border-brick/35 bg-white px-3 py-1.5 text-[11.5px] font-semibold text-brick-dark transition hover:bg-brick-light"
                      >
                        🧡 Bình chọn
                      </span>
                    )}
                  </>
                ) : (
                  <span>Chưa có ai viết — bạn mở hàng nhé!</span>
                )}
              </>
            )}
          </div>
        </button>
      ))}

      {list.length === 0 && (
        <div className="kp-card flex flex-col items-center gap-3 p-6 text-center text-sm text-ink-soft">
          Chưa có góc xóm nào đang chờ — bạn đề xuất điểm đầu tiên nhé!
          <button onClick={onPropose} className="kp-btn kp-btn-primary tap px-5 py-2">
            + Đề xuất góc phố mới
          </button>
        </div>
      )}
    </div>
  );
}
