"use client";
// Block "Lời nhắc khi lên biển trông như thế nào?" — chia 3 tab như danh sách góc phố:
// Mới nhất (ngày duyệt mới → cũ) · Chờ bạn bình chọn (mình chưa thương) · Được yêu thích nhất
// (nhiều lượt thương, kèm card "Được 'Thương' nhiều nhất tuần này" ghim đầu).
// Mỗi tab hiện tối đa 6 biển + "Xem thêm"; tab Mới nhất thiếu chỗ thì bù ví dụ minh hoạ tĩnh.
import { useState } from "react";
import type { ApprovedSign } from "./types";
import { EXAMPLE_SIGNS } from "@/lib/examples";
import { FilterTabs, HangSign } from "./ui";

const PAGE = 6;

type TabKey = "newest" | "unvoted" | "loved";

const EMPTY_HINT: Record<TabKey, string> = {
  newest: "Chưa có lời nhắc nào được duyệt — bạn viết câu đầu tiên nhé!",
  unvoted: "Bạn đã bình chọn hết các lời nhắc rồi — cảm ơn bạn 🧡",
  loved: "Chưa có lời nhắc nào được thương — bạn bình chọn mở hàng nhé!",
};

export default function SignGallery({
  signs,
  featured,
  onVote,
}: {
  signs: ApprovedSign[];
  /** Câu đang được thương nhất trong các góc xóm đang mở (HomeShell tính) */
  featured: { quote: string; spot: string } | null;
  onVote: (id: string) => void;
}) {
  const [tab, setTab] = useState<TabKey>("newest");
  const [expanded, setExpanded] = useState(false);

  // Bỏ câu trùng card "được thương nhất" (như logic cũ)
  const real = signs.filter((s) => s.content !== featured?.quote);
  const byTab = (t: TabKey): ApprovedSign[] => {
    if (t === "unvoted") return real.filter((s) => !s.voted);
    if (t === "loved") return [...real].sort((a, b) => b.votes - a.votes);
    return [...real].sort(
      (a, b) => new Date(b.approved_at).getTime() - new Date(a.approved_at).getTime()
    );
  };

  const list = byTab(tab);
  // Card featured ghim đầu tab "Được yêu thích nhất" — chiếm 1 chỗ trong trang đầu
  const showFeatured = tab === "loved" && featured != null;
  const cap = PAGE - (showFeatured ? 1 : 0);
  const shown = expanded ? list : list.slice(0, cap);
  const hidden = list.length - shown.length;

  // Thiếu chỗ ở tab Mới nhất → bù ví dụ minh hoạ tĩnh cho block không trống trải
  const fillers =
    tab === "newest" && shown.length < PAGE
      ? EXAMPLE_SIGNS.filter(
          (e) => e.quote !== featured?.quote && !real.some((s) => s.content === e.quote)
        ).slice(0, PAGE - shown.length)
      : [];

  return (
    <div>
      <div className="mb-4">
        <FilterTabs
          tabs={[
            { key: "newest" as TabKey, label: "Mới nhất", count: real.length },
            { key: "unvoted" as TabKey, label: "Chờ bạn bình chọn", short: "Chờ bạn", count: byTab("unvoted").length },
            {
              key: "loved" as TabKey,
              label: "Được yêu thích nhất",
              short: "Yêu thích",
              count: byTab("loved").length + (featured ? 1 : 0),
            },
          ]}
          active={tab}
          onChange={(k) => { setTab(k); setExpanded(false); }}
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-x-5 gap-y-5 sm:grid-cols-2 sm:gap-y-6 lg:grid-cols-3">
        {showFeatured && featured && (
          <HangSign
            quote={`“${featured.quote}”`}
            by="Được “Thương” nhiều nhất tuần này 🧡"
            spot={featured.spot}
            tilt={1.5}
          />
        )}
        {shown.map((s, i) => (
          <HangSign
            key={s.id}
            quote={`“${s.content}”`}
            by={s.author_name}
            spot={s.location_text}
            imageUrl={s.image_url}
            tilt={i % 2 ? 1.5 : -1.5}
            voted={s.voted}
            onVote={() => onVote(s.id)}
          />
        ))}
        {fillers.map((s, i) => (
          <HangSign key={s.quote} quote={`“${s.quote}”`} by={s.by} spot={s.spot} tilt={i % 2 ? -1.5 : 1.5} />
        ))}
      </div>

      {(hidden > 0 || (expanded && list.length > cap)) && (
        <div className="mt-5 flex justify-center">
          {hidden > 0 ? (
            <button
              onClick={() => setExpanded(true)}
              className="kp-btn kp-btn-outline tap px-5 py-2 text-sm"
            >
              Xem thêm {hidden} lời nhắc
            </button>
          ) : (
            <button
              onClick={() => setExpanded(false)}
              className="tap cursor-pointer px-3 py-1 text-[12.5px] font-semibold text-ink-soft hover:text-brick-dark"
            >
              Thu gọn
            </button>
          )}
        </div>
      )}

      {list.length === 0 && fillers.length === 0 && !showFeatured && (
        <div className="kp-card p-6 text-center text-sm text-ink-soft">{EMPTY_HINT[tab]}</div>
      )}
    </div>
  );
}
