"use client";
// Khối "Đóng góp một câu cho khu phố mình nhé" — tái cấu trúc theo skin mới
// (docs/lp/lp1.png, lp2.png) + email review 18/8:
//  · Chủ thể là KHU PHỐ → 1 khối full-width, danh sách dạng DÒNG NGANG trong một card
//    viền sọc cam (bản cũ: lưới card + cột bảng xếp hạng bên phải).
//  · 3 tab đúng lp1/lp2, CẢ BA cùng là dòng góc phố (design vẽ y hệt nhau, chỉ khác bộ
//    lọc và huy hiệu): "Mới nhất" (mọi góc phố đang mở, API xếp approved_at DESC) ·
//    "Chờ bạn bình chọn" (đã có câu) · "Cây bút của khu phố" (TOP 10 góc phố có lời nhắc
//    được thương nhiều nhất, kèm huy hiệu TOP 1/2/3 như lp1).
//    → Bảng xếp hạng NGƯỜI (điểm · ▲ hạng · link chia sẻ) bỏ khỏi trang chủ theo design;
//      trang chia sẻ /dai-su/[slug] và API /api/v1/leaderboard vẫn giữ nguyên.
//  · Nút mỗi dòng đổi theo trạng thái: "Gửi lời nhắc" (chưa có câu) / "Bình chọn" (có câu).
//  · Bỏ "Xem thêm" → phân trang 5 dòng/trang để không mất dữ liệu.
import { useState } from "react";
import type { IssueCard } from "./types";
import { categoryLabel } from "@/lib/taxonomy";
import { FilterTabs, IconHeart, IconHeartSolid, IconPencil, IconPin, SectionHead, Stripe } from "./ui";

const PAGE = 5;
/** Tab "Cây bút" chỉ vinh danh TOP 10 — đúng con số 10 in trên chip của lp1 */
const TOP_LIMIT = 10;

type TabKey = "latest" | "to_vote" | "writers";

const EMPTY_HINT: Record<TabKey, string> = {
  latest: "Chưa có góc phố nào đang mở — bạn đề xuất góc đầu tiên nhé!",
  to_vote: "Chưa có góc phố nào đủ câu để bình chọn — bạn viết câu mở hàng nhé!",
  writers: "Chưa có góc phố nào được thương — bấm “Bình chọn” cho câu bạn thích nhé!",
};

/** Huy hiệu hạng: TOP 1 xanh dương · TOP 2 cam · TOP 3 xanh lá · còn lại số xám */
function RankBadge({ rank }: { rank: number }) {
  if (rank > 3) {
    return (
      <span className="grid h-[38px] w-[34px] flex-none place-items-center rounded-[8px] bg-[#F3EDE9] font-display text-[17px] font-bold text-ink-soft">
        {rank}
      </span>
    );
  }
  const bg = rank === 1 ? "bg-accent-blue" : rank === 2 ? "bg-brick" : "bg-status-signed";
  return (
    <span className={`grid h-[38px] w-[34px] flex-none place-items-center rounded-[8px] leading-none text-white ${bg}`}>
      <span className="text-[8px] font-bold uppercase tracking-wide">Top</span>
      <span className="font-display text-[16px] font-bold">{rank}</span>
    </span>
  );
}

export default function IssueBoard({
  title,
  hint,
  issues,
  onWrite,
  onVote,
  onPropose,
}: {
  title: string;
  hint: string;
  issues: IssueCard[];
  /** Góc phố chưa có câu → mở thẳng form viết câu nhắc */
  onWrite: (issueId: string) => void;
  /** Góc phố đã có câu → mở danh sách câu để bình chọn */
  onVote: (issueId: string) => void;
  onPropose: () => void;
}) {
  const [tab, setTab] = useState<TabKey>("latest");
  const [page, setPage] = useState(0);

  // Tab "Mới nhất" = MỌI góc phố đang mở (API đã ORDER BY approved_at DESC) — nút mỗi
  // dòng vẫn tự đổi "Gửi lời nhắc"/"Bình chọn" theo số câu, đúng như lp2.
  const open = issues.filter((it) => it.status !== "signed");
  const toVote = open.filter((it) => it.suggestion_count > 0);
  const writers = [...toVote]
    .sort((a, b) => b.top_votes - a.top_votes || b.suggestion_count - a.suggestion_count)
    .slice(0, TOP_LIMIT);

  const rows = tab === "latest" ? open : tab === "to_vote" ? toVote : writers;
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const safePage = Math.min(page, pages - 1);
  const shown = rows.slice(safePage * PAGE, safePage * PAGE + PAGE);

  const switchTab = (k: TabKey) => { setTab(k); setPage(0); };

  return (
    <section id="goc-xom" className="mx-auto max-w-[1312px] px-4 py-8 sm:px-5 sm:pb-[40px] sm:pt-12">
      <SectionHead title={title} hint={hint} signpost />

      {/* .fig: hint kết ở y=1441 → tab y=1474 (gap 33) → card y=1556 (gap 43) */}
      <div className="mb-6 sm:mt-[33px] sm:mb-[43px]">
        <FilterTabs
          tabs={[
            { key: "latest" as TabKey, label: "Mới nhất", count: open.length },
            { key: "to_vote" as TabKey, label: "Chờ bạn bình chọn", short: "Chờ bình chọn", count: toVote.length },
            { key: "writers" as TabKey, label: "Cây bút của khu phố", short: "Cây bút", count: writers.length },
          ]}
          active={tab}
          onChange={switchTab}
        />
      </div>

      {/* Card danh sách: sọc cam trên/dưới, viền cam mảnh hai bên */}
      {/* relative: cột biển "06 3" vẽ absolute ở SectionHead phải nằm DƯỚI card (đúng
          thứ tự lớp .fig) — không có nó thì cột đè lên các dòng góc phố */}
      <div className="relative overflow-hidden rounded-[28px] border-[1.9px] border-brick bg-white shadow-kp-s sm:rounded-[40px]">
        <Stripe />
        <div className="px-4 py-2 sm:px-[84px] sm:pb-[32px] sm:pt-[34px]">
          {shown.length === 0 && (
            <p className="m-0 px-1 py-8 text-center text-[14px] text-ink-soft">{EMPTY_HINT[tab]}</p>
          )}

          {shown.map((it, i) => (
            <div
              key={it.id}
              className="flex flex-col gap-2.5 border-b border-cream-dark py-4 last:border-0 sm:h-[82px] sm:flex-row sm:items-center sm:gap-4 sm:first:h-[66px]"
            >
              {tab === "writers" && <RankBadge rank={safePage * PAGE + i + 1} />}
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-bold leading-snug tracking-[-0.02em] sm:text-[18px]">
                  {categoryLabel(it.category)} · {it.location_text}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-8 gap-y-1 font-light text-[12.5px] text-ink-soft sm:text-[14px]">
                  <span className="inline-flex items-center gap-1.5">
                    <IconPin className="text-brick" />
                    {it.neighborhood_name}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <IconPencil className="text-brick" />
                    {it.suggestion_count} câu đề xuất
                  </span>
                  {it.top_votes > 0 && (
                    <span className="inline-flex items-center gap-1.5">
                      <IconHeart className="text-brick" />
                      {it.top_votes.toLocaleString("vi-VN")} lượt thương
                    </span>
                  )}
                </div>
              </div>
              {it.suggestion_count > 0 ? (
                <button
                  onClick={() => onVote(it.id)}
                  className="kp-btn kp-btn-vote tap tap-sm-auto h-[44px] flex-none px-5 text-[13.5px] sm:h-[35px] sm:w-auto sm:text-[14px]"
                >
                  <IconHeartSolid />
                  {it.voted ? "Đã bình chọn" : "Bình chọn"}
                </button>
              ) : (
                <button
                  onClick={() => onWrite(it.id)}
                  className="kp-btn kp-btn-ghost tap tap-sm-auto h-[44px] flex-none px-5 text-[13.5px] sm:h-[35px] sm:w-auto sm:text-[14px]"
                >
                  Gửi lời nhắc
                </button>
              )}
            </div>
          ))}

          {/* Phân trang (thay nút "Xem thêm" của bản cũ) */}
          {pages > 1 && (
            <div className="flex items-center justify-center gap-3 border-t border-cream-dark py-3 text-[13px]">
              <button
                onClick={() => setPage(Math.max(0, safePage - 1))}
                disabled={safePage === 0}
                className="tap cursor-pointer rounded-full border border-cream-dark px-3 disabled:opacity-40"
              >
                ‹
              </button>
              <span className="text-ink-soft">
                Trang {safePage + 1}/{pages}
              </span>
              <button
                onClick={() => setPage(Math.min(pages - 1, safePage + 1))}
                disabled={safePage >= pages - 1}
                className="tap cursor-pointer rounded-full border border-cream-dark px-3 disabled:opacity-40"
              >
                ›
              </button>
            </div>
          )}

          {/* .fig: nút cách dòng cuối 24px, đáy card chừa 32px (đã đặt ở khối cha) */}
          <div className="flex justify-center py-4 sm:pb-0 sm:pt-6">
            <button onClick={onPropose} className="kp-btn kp-btn-primary tap h-[50px] px-8 text-[16px] sm:min-w-[289px]">
              + Đề xuất góc phố mới
            </button>
          </div>
        </div>
        <Stripe />
      </div>
    </section>
  );
}
