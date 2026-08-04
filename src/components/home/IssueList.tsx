"use client";
// Danh sách "góc xóm đang chờ" (02 §2) — chia 3 mục dạng tab để trang gọn, cân với cột phải:
// Mới nhất (thứ tự duyệt mới → cũ) · Chờ bạn bình chọn (có câu, mình chưa thương)
// · Được yêu thích nhất (nhiều lượt thương nhất). Mỗi tab hiện tối đa 6 card + "Xem thêm".
// Card dọc theo prototype .issue: ô icon danh mục, tiêu đề "Loại · địa điểm", foot chip số liệu.
import { useState } from "react";
import type { IssueCard } from "./types";
import { categoryIcon, categoryLabel } from "@/lib/taxonomy";
import { FilterTabs } from "./ui";

const PAGE = 6;

type TabKey = "newest" | "unvoted" | "loved";

const TABS: { key: TabKey; label: string }[] = [
  { key: "newest", label: "Mới nhất" },
  { key: "unvoted", label: "Chờ bạn bình chọn" },
  { key: "loved", label: "Được yêu thích nhất" },
];

const EMPTY_HINT: Record<TabKey, string> = {
  newest: "Chưa có góc xóm nào đang chờ — bạn đề xuất điểm đầu tiên nhé!",
  unvoted: "Bạn đã bình chọn hết các góc phố đang mở rồi — cảm ơn bạn 🧡",
  loved: "Chưa có câu nào được thương — bạn bình chọn mở hàng nhé!",
};

function tabItems(issues: IssueCard[], tab: TabKey): IssueCard[] {
  // API đã sắp approved_at DESC (signed cuối) — "Mới nhất" giữ nguyên thứ tự đó
  if (tab === "unvoted") {
    return issues.filter((it) => it.status !== "signed" && it.suggestion_count > 0 && !it.voted);
  }
  if (tab === "loved") {
    return issues.filter((it) => it.top_votes > 0).sort((a, b) => b.top_votes - a.top_votes);
  }
  return issues;
}

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
  const [tab, setTab] = useState<TabKey>("newest");
  const [expanded, setExpanded] = useState(false);

  const list = tabItems(issues, tab);
  const shown = expanded ? list : list.slice(0, PAGE);
  const hidden = list.length - shown.length;

  return (
    <div className="flex flex-col gap-3">
      <FilterTabs
        tabs={TABS.map((t) => ({ ...t, count: tabItems(issues, t.key).length }))}
        active={tab}
        onChange={(k) => { setTab(k); setExpanded(false); }}
      />

      {shown.map((it) => (
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

      {hidden > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="kp-btn kp-btn-outline tap self-center px-5 py-2 text-sm"
        >
          Xem thêm {hidden} góc phố
        </button>
      )}
      {expanded && list.length > PAGE && (
        <button
          onClick={() => setExpanded(false)}
          className="tap cursor-pointer self-center px-3 py-1 text-[12.5px] font-semibold text-ink-soft hover:text-brick-dark"
        >
          Thu gọn
        </button>
      )}

      {list.length === 0 && (
        <div className="kp-card flex flex-col items-center gap-3 p-6 text-center text-sm text-ink-soft">
          {EMPTY_HINT[tab]}
          {tab === "newest" && (
            <button onClick={onPropose} className="kp-btn kp-btn-primary tap px-5 py-2">
              + Đề xuất góc phố mới
            </button>
          )}
        </div>
      )}
    </div>
  );
}
