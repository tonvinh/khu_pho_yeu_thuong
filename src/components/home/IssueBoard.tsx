"use client";
// Khối "Đóng góp một câu cho khu phố mình nhé" — 1 card sọc cam, 3 tab.
//
// Bản 18/8 dựng ba tab gần giống nhau (cùng dòng meta, nút đổi theo số câu) vì design
// lúc đó vẽ lorem không phân biệt được. Figma bản 2/9 (7217:1990) tách hẳn:
//
//   tab 1 "Góc phố mới cần treo biển"  6 dòng · CHỈ góc chưa có câu · nút Gửi lời nhắc · KHÔNG CTA đáy
//   tab 2 "Lời nhắc chờ bạn bình chọn" 5 dòng · meta phường·người·bình chọn · CTA Viết câu
//   tab 3 "Cây bút của khu phố"        5 dòng · huy hiệu · meta câu·bình chọn · CTA Đề xuất
//
// **Figma bản LIVE (đọc 4/9 trên figma.com — mới hơn file .fig 2/9 trong docs/lp)**:
//   · tab 2 mỗi dòng là MỘT CÂU NHẮC (tiêu đề = nội dung câu, meta phường · tác giả ·
//     N Bình chọn) và nút "Bình chọn" viền XANH bấm thẳng tại dòng — bản 2/9 dòng còn
//     là góc phố với nút "Xem câu nhắc" mở popup danh sách câu (popup đã bỏ).
//   · tab 3 nút đổi từ "Bình chọn" (xanh) sang **"Xem lời nhắc"** viền CAM.
//
// Ba tab giờ là ba thực thể khác nhau: góc phố · câu nhắc · người viết.
// Bình chọn xong là chốt, không rút lại (Q6) → nút khoá thành "Đã bình chọn".
//
// **Sửa theo review 7/9 (tab 2)**: nút "Bình chọn" có TRÁI TIM ở đầu (tròn 20px nền
// #2323FF 40% + tim đặc — đo trên export `docs/lp/Landing page-2.png`), và tab 2 KHÔNG
// có thanh phân trang: design chỉ vẽ 5 câu rồi tới CTA đáy.
import { useState } from "react";
import type { AmbassadorRow, IssueCard, VotingNote } from "./types";
import { categoryLabel } from "@/lib/taxonomy";
import { FilterTabs, IconHeart, IconHeartSolid, IconPencil, IconPin, IconUser, SectionHead, Stripe } from "./ui";

type TabKey = "latest" | "to_vote" | "writers";

/** .fig: tab 1 hiện 6 dòng, hai tab sau 5 dòng */
const PAGE: Record<TabKey, number> = { latest: 6, to_vote: 5, writers: 5 };

const TAB_LABEL: Record<TabKey, string> = {
  latest: "Góc phố mới cần treo biển",
  to_vote: "Lời nhắc chờ bạn bình chọn",
  writers: "Cây bút của khu phố",
};

/** Nhãn rút gọn cho mobile — ba nhãn đầy đủ không nằm gọn một hàng ở khổ 375 */
const TAB_SHORT: Record<TabKey, string> = {
  latest: "Góc phố mới",
  to_vote: "Chờ bình chọn",
  writers: "Cây bút",
};

const EMPTY_HINT: Record<TabKey, string> = {
  latest: "Góc phố nào cũng đã có lời nhắc rồi — bạn đề xuất góc mới nhé!",
  to_vote: "Chưa có lời nhắc nào đang chờ bình chọn — bạn viết câu mở hàng nhé!",
  writers: "Chưa có cây bút nào được vinh danh — viết câu đầu tiên cho xóm mình nhé!",
};

/** Huy hiệu hạng 40×50 (.fig): TOP1 xanh dương · TOP2 cam · TOP3 xanh lá · ≥4 xám */
function RankBadge({ rank }: { rank: number }) {
  const bg =
    rank === 1 ? "bg-accent-blue" : rank === 2 ? "bg-brick" : rank === 3 ? "bg-status-signed" : "bg-[#EEEEEE]";
  const fg = rank > 3 ? "text-ink-soft" : "text-white";
  return (
    <span
      data-rank={rank}
      className={`grid h-[44px] w-[36px] flex-none place-items-center rounded-[8px] leading-none sm:h-[50px] sm:w-[40px] ${bg} ${fg}`}
    >
      <span className="text-[9px] font-bold uppercase tracking-[-0.08em] sm:text-[11px]">Top</span>
      <span className="font-display text-[20px] font-bold tracking-[-0.08em] sm:text-[24px]">{rank}</span>
    </span>
  );
}

/** Một mục meta dưới tiêu đề dòng — icon 16×16 + chữ 14px Light #969696, cách nhau 32 */
function Meta({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span data-meta className="inline-flex items-center gap-1.5">
      {icon}
      {children}
    </span>
  );
}

/** Trái tim trong nút "Bình chọn" của tab 2 — .fig: tròn 20px nền #2323FF 40%, tim đặc */
function VoteHeart() {
  return (
    <span className="grid h-[20px] w-[20px] flex-none place-items-center rounded-full bg-accent-blue/40">
      <IconHeartSolid className="h-[11px] w-[11px] text-accent-blue" />
    </span>
  );
}

export default function IssueBoard({
  title,
  hint,
  issues,
  notes,
  ambassadors,
  onWrite,
  onVoteNote,
  onPickSpot,
  onPropose,
  onOpenAmbassador,
}: {
  title: string;
  hint: string;
  issues: IssueCard[];
  /** Tab 2: câu nhắc đã duyệt của góc phố chưa treo biển (`getVotingNotes`) */
  notes: VotingNote[];
  /** TOP cây bút cho tab thứ 3 — server đã xếp theo điểm và loại tài khoản shadow-ban */
  ambassadors: AmbassadorRow[];
  /** Tab 1: mở form viết câu nhắc cho góc phố */
  onWrite: (issueId: string) => void;
  /** Tab 2: bình chọn THẲNG một câu nhắc (1 phiếu/câu, không rút — Q6) */
  onVoteNote: (noteId: string) => void;
  /** CTA đáy tab 2: mở popup CHỌN GÓC PHỐ rồi mới sang form viết câu (chốt 4/9) */
  onPickSpot: () => void;
  onPropose: () => void;
  /** Tab 3: mở popup "Cây bút khu phố" của một người */
  onOpenAmbassador: (shareSlug: string) => void;
}) {
  const [tab, setTab] = useState<TabKey>("latest");
  const [page, setPage] = useState(0);

  // Tab 1 chỉ nhận góc phố CHƯA có câu đề xuất nào (chốt 7/9 theo design): góc đã có
  // câu thuộc về tab 2 (bình chọn từng câu), nếu không hai tab hiện trùng nội dung.
  const open = issues.filter((it) => it.status !== "signed" && it.suggestion_count === 0);

  const isWriters = tab === "writers";
  const isNotes = tab === "to_vote";
  const per = PAGE[tab];
  const total = isWriters ? ambassadors.length : isNotes ? notes.length : open.length;
  const pages = Math.max(1, Math.ceil(total / per));
  const safePage = Math.min(page, pages - 1);
  const from = safePage * per;
  const spotRows = open.slice(from, from + per);
  // Tab 2 KHÔNG phân trang (chốt 7/9 theo design: chỉ 5 câu, không có nút trang) —
  // lấy thẳng 5 câu đầu của thứ tự `getVotingNotes` (chưa-bình-chọn → nhiều thương).
  const noteRows = notes.slice(0, per);
  const writerRows = ambassadors.slice(from, from + per);
  const empty = (isWriters ? writerRows : isNotes ? noteRows : spotRows).length === 0;

  const switchTab = (k: TabKey) => { setTab(k); setPage(0); };

  /* Dòng: cao 50, bước lặp 82 (50 + kẻ + gap 16). Kẻ ngăn là NÉT ĐỨT `.kp-row-sep`
     — dòng đầu không có kẻ (xem globals.css). Tab 1 có kẻ cả SAU dòng cuối. */
  const rowClass = (last: boolean) =>
    `kp-row-sep${last && tab === "latest" ? " kp-row-sep-b" : ""} flex flex-col gap-2.5 py-4 sm:h-[82px] sm:flex-row sm:items-center sm:gap-4 sm:py-3`;

  const metaRow = "mt-2 flex flex-wrap items-center gap-x-8 gap-y-1 font-light text-[12.5px] text-ink-soft sm:text-[14px]";
  const titleRow = "text-[15px] font-bold leading-snug tracking-[-0.02em] sm:text-[18px]";

  return (
    <section id="goc-xom" className="mx-auto max-w-[1312px] px-4 py-8 sm:px-[18px] sm:pb-[40px] sm:pt-12">
      <SectionHead title={title} hint={hint} signpost />

      {/* .fig: hint kết ở y=1465 → tab y=1490 → card y=1570 */}
      <div className="mb-6 sm:mt-[25px] sm:mb-[43px]">
        <FilterTabs
          tabs={(["latest", "to_vote", "writers"] as TabKey[]).map((k) => ({
            key: k,
            label: TAB_LABEL[k],
            short: TAB_SHORT[k],
            count: k === "latest" ? open.length : k === "to_vote" ? notes.length : ambassadors.length,
          }))}
          active={tab}
          onChange={switchTab}
        />
      </div>

      {/* Card danh sách: sọc cam trên/dưới, viền cam 1.9px */}
      {/* relative: cột biển "06 3" vẽ absolute ở SectionHead phải nằm DƯỚI card (đúng
          thứ tự lớp .fig) — không có nó thì cột đè lên các dòng góc phố */}
      <div className="relative overflow-hidden rounded-[28px] border-[1.9px] border-brick bg-white shadow-kp-s sm:rounded-[40px]">
        <Stripe />
        {/* .fig: sọc trên 8 → lề trong 34 → danh sách → 24 → sọc dưới 8 (card 550) */}
        <div className="px-4 py-2 sm:px-[84px] sm:pb-[24px] sm:pt-[34px]">
          {empty && (
            <p className="m-0 px-1 py-8 text-center text-[14px] text-ink-soft">{EMPTY_HINT[tab]}</p>
          )}

          {/* ===== Tab 3 — hàng là NGƯỜI ===== */}
          {isWriters && writerRows.map((a, i) => (
            <div key={a.user_id} data-row className={rowClass(i === writerRows.length - 1)}>
              <RankBadge rank={from + i + 1} />
              <div className="min-w-0 flex-1">
                <div className={titleRow}>{a.display_name}</div>
                <div className={metaRow}>
                  <Meta icon={<IconPencil className="text-brick" />}>
                    {a.suggestions_count.toLocaleString("vi-VN")} câu đóng góp
                  </Meta>
                  <Meta icon={<IconHeart className="text-brick" />}>
                    {a.votes_received.toLocaleString("vi-VN")} Bình chọn
                  </Meta>
                </div>
              </div>
              {/* Figma live 4/9: nút đổi sang "Xem lời nhắc" viền CAM (bản 2/9 là
                  "Bình chọn" viền xanh) — hành vi vẫn mở popup Cây bút khu phố */}
              <button
                onClick={() => onOpenAmbassador(a.share_slug)}
                className="kp-btn kp-btn-primary kp-btn-row tap tap-sm-auto h-[44px] flex-none px-5 sm:h-[35px] sm:w-[137px] sm:px-0"
              >
                Xem lời nhắc
              </button>
            </div>
          ))}

          {/* ===== Tab 2 — hàng là CÂU NHẮC (Figma live 4/9) ===== */}
          {isNotes && noteRows.map((n, i) => (
            <div key={n.id} data-row className={rowClass(i === noteRows.length - 1)}>
              <div className="min-w-0 flex-1">
                <div className={titleRow}>{n.content}</div>
                <div className={metaRow}>
                  <Meta icon={<IconPin className="text-brick" />}>{n.ward_label}</Meta>
                  <Meta icon={<IconUser className="text-brick" />}>{n.author_name}</Meta>
                  <Meta icon={<IconHeart className="text-brick" />}>
                    {n.votes.toLocaleString("vi-VN")} Bình chọn
                  </Meta>
                </div>
              </div>
              {/* Bình chọn ngay tại dòng. Đã bấm là chốt (Q6) → khoá nút; câu của
                  chính mình cũng khoá (cấm tự thương, quy tắc cứng 3). */}
              <button
                onClick={() => onVoteNote(n.id)}
                disabled={n.voted || n.is_mine}
                title={n.is_mine ? "Câu của mình thì để cả xóm thương nhé 💛" : undefined}
                className="kp-btn kp-btn-vote kp-btn-row tap tap-sm-auto h-[44px] flex-none px-4 disabled:cursor-default disabled:opacity-60 sm:h-[35px] sm:min-w-[119px] sm:px-3"
              >
                <VoteHeart />
                {n.voted ? "Đã bình chọn" : "Bình chọn"}
              </button>
            </div>
          ))}

          {/* ===== Tab 1 — hàng là GÓC PHỐ ===== */}
          {tab === "latest" && spotRows.map((it, i) => (
            <div key={it.id} data-row className={rowClass(i === spotRows.length - 1)}>
              <div className="min-w-0 flex-1">
                <div className={titleRow}>
                  {categoryLabel(it.category)} · {it.location_text}
                </div>
                <div className={metaRow}>
                  {/* .fig tab 1: node phường + lượt thương bị ẩn, chỉ còn số câu —
                      và danh sách đã lọc `suggestion_count === 0` nên luôn là dòng mời */}
                  <Meta icon={<IconPencil className="text-brick" />}>Chưa có câu đề xuất</Meta>
                </div>
              </div>
              {/* .fig: 120×35 r=70 viền #FF8206 1px */}
              <button
                onClick={() => onWrite(it.id)}
                className="kp-btn kp-btn-primary kp-btn-row tap tap-sm-auto h-[44px] flex-none px-5 sm:h-[35px] sm:w-[120px] sm:px-0"
              >
                Gửi lời nhắc
              </button>
            </div>
          ))}

          {/* Phân trang (thay nút "Xem thêm" của bản cũ) — tab 2 bỏ hẳn theo design */}
          {pages > 1 && !isNotes && (
            <div className="flex items-center justify-center gap-3 pt-3 text-[13px]">
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

          {/* CTA đáy card đổi theo tab — .fig KHÔNG vẽ nút nào ở tab 1 */}
          {isNotes && (
            <div className="flex justify-center py-4 sm:pb-0 sm:pt-6">
              {/* Dòng tab 2 là CÂU NHẮC nên CTA không còn ngữ cảnh góc phố → mở
                  popup chọn góc phố trước (chốt 4/9), không tự đoán góc đầu tiên. */}
              <button
                onClick={onPickSpot}
                disabled={open.length === 0}
                className="kp-btn kp-btn-primary tap h-[50px] px-8 text-[16px] disabled:opacity-50 sm:min-w-[318px]"
              >
                + Viết câu nhắc của riêng bạn
              </button>
            </div>
          )}
          {tab === "writers" && (
            <div className="flex justify-center py-4 sm:pb-0 sm:pt-6">
              <button onClick={onPropose} className="kp-btn kp-btn-primary tap h-[50px] px-8 text-[16px] sm:min-w-[289px]">
                + Đề xuất góc phố mới
              </button>
            </div>
          )}
        </div>
        <Stripe />
      </div>
    </section>
  );
}
