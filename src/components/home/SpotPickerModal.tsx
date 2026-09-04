"use client";
// Popup "Chọn góc phố" — bước đứng TRƯỚC form viết câu khi người dùng bấm CTA
// "+ Viết câu nhắc của riêng bạn" ở đáy tab 2.
//
// Vì sao cần: từ bản Figma live 4/9, dòng của tab 2 là CÂU NHẮC chứ không còn là góc
// phố, nên CTA đáy không còn ngữ cảnh "góc phố nào". Trước đó code tạm lấy góc phố mở
// đầu tiên — sai ý người dùng. Quyết định 4/9: **phải cho chọn góc phố**.
//
// Design không vẽ frame cho popup này (chốt 5/9: tự thiết kế). Ba nguyên tắc đã theo:
//   1. KHÔNG bịa thành phần mới: khung là `Modal` chung (rộng 700, viền cam 2px, tiêu đề
//      25px Regular, sọc đáy, mobile là bottom sheet); dòng mượn nguyên cấu trúc dòng
//      tab 1 trong .fig (tiêu đề 18px Bold ls −2%, meta 14px Light #969696 + icon 16,
//      hai mục cách 32, nút 120×35 r=70 viền cam, kẻ ngăn nét đứt).
//   2. XÓM MÌNH LÊN TRƯỚC: người bấm "viết câu nhắc của riêng bạn" gần như luôn viết cho
//      khu phố của họ, nên góc phố cùng khu phố đã định danh được tách thành nhóm đầu.
//      Chưa định danh thì chỉ có một danh sách phẳng, không hiện tiêu đề nhóm.
//   3. Tìm là chính: ô tìm DÍNH ở đầu popup (danh sách dài vẫn tìm được), bỏ dấu vẫn ra,
//      tô đậm đoạn khớp, Enter chọn ngay góc phố đầu tiên. Không khớp gì thì mời đề xuất.
import { useMemo, useState } from "react";
import type { IssueCard } from "./types";
import { categoryLabel } from "@/lib/taxonomy";
import { IconPencil, IconPin, IconSearch, Modal } from "./ui";

/** Bỏ dấu GIỮ NGUYÊN ĐỘ DÀI (mỗi ký tự → 1 ký tự) để chỉ số khớp còn dùng được cho
 *  việc tô đậm đoạn tìm thấy — `normalize("NFD")` trên cả chuỗi làm lệch chỉ số. */
const fold = (s: string) =>
  Array.from(s)
    .map((c) => (c === "đ" || c === "Đ" ? "d" : c.normalize("NFD")[0]))
    .join("")
    .toLowerCase();

/** Tô đậm đoạn khớp từ khoá trong tên góc phố */
function Highlight({ text, kw }: { text: string; kw: string }) {
  const k = fold(kw.trim());
  if (!k) return <>{text}</>;
  const i = fold(text).indexOf(k);
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-brick-light text-brick-dark">{text.slice(i, i + k.length)}</mark>
      {text.slice(i + k.length)}
    </>
  );
}

function SpotRow({
  issue,
  kw,
  last,
  onPick,
}: {
  issue: IssueCard;
  kw: string;
  last: boolean;
  onPick: (id: string) => void;
}) {
  const title = `${categoryLabel(issue.category)} · ${issue.location_text}`;
  return (
    <div
      data-spot
      className={`kp-row-sep${last ? " kp-row-sep-b" : ""} flex flex-col gap-2.5 py-3 sm:flex-row sm:items-center sm:gap-4`}
    >
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-bold leading-snug tracking-[-0.02em] sm:text-[18px]">
          <Highlight text={title} kw={kw} />
        </div>
        {/* meta: .fig cho hai mục cách nhau 32, chữ 14px Light #969696, icon 16×16 */}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-8 gap-y-1 font-light text-[12.5px] text-ink-soft sm:text-[14px]">
          <span className="inline-flex items-center gap-1.5">
            <IconPin className="text-brick" />
            {issue.neighborhood_name}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <IconPencil className="text-brick" />
            {issue.suggestion_count > 0
              ? `${issue.suggestion_count} câu đề xuất`
              : "Chưa có câu đề xuất"}
          </span>
        </div>
      </div>
      <button
        onClick={() => onPick(issue.id)}
        className="kp-btn kp-btn-primary kp-btn-row tap tap-sm-auto h-[44px] flex-none px-5 sm:h-[35px] sm:w-[120px] sm:px-0"
      >
        Gửi lời nhắc
      </button>
    </div>
  );
}

export default function SpotPickerModal({
  issues,
  myNeighborhood,
  onPick,
  onPropose,
  onClose,
}: {
  /** Góc phố còn mở (chưa treo biển) — HomeShell lọc sẵn */
  issues: IssueCard[];
  /** Tên khu phố của người đã định danh — góc phố cùng khu được xếp lên nhóm đầu */
  myNeighborhood?: string | null;
  onPick: (issueId: string) => void;
  onPropose: () => void;
  onClose: () => void;
}) {
  const [kw, setKw] = useState("");

  const { mine, others, total } = useMemo(() => {
    const k = fold(kw.trim());
    const hit = k
      ? issues.filter((it) =>
          fold(`${categoryLabel(it.category)} ${it.location_text} ${it.neighborhood_name}`).includes(k)
        )
      : issues;
    const nb = myNeighborhood ? fold(myNeighborhood) : null;
    return {
      mine: nb ? hit.filter((it) => fold(it.neighborhood_name) === nb) : [],
      others: nb ? hit.filter((it) => fold(it.neighborhood_name) !== nb) : hit,
      total: hit.length,
    };
  }, [issues, kw, myNeighborhood]);

  /** Enter = chọn góc phố đầu tiên đang hiện (xóm mình trước) */
  const first = mine[0] ?? others[0];

  const groupTitle = "mb-1 mt-1 text-[13px] font-bold tracking-[-0.02em] text-ink-soft sm:text-[14px]";

  return (
    <Modal title="Chọn góc phố" onClose={onClose}>
      <p className="m-0 mb-4 font-light text-[14px] leading-snug text-ink sm:text-[16px]">
        Bạn muốn gửi lời nhắc cho góc phố nào?
      </p>

      {/* Ô tìm DÍNH đầu popup: danh sách có thể dài hơn một màn, cuộn xuống vẫn gõ được.
          `-mx` + `px` để nền trắng che hết bề ngang khi các dòng trượt qua dưới nó. */}
      <div className="sticky top-0 z-10 -mx-4 mb-3 bg-white px-4 pb-3 sm:-mx-8 sm:px-8">
        <div className="relative">
          <IconSearch className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-soft" />
          <input
            value={kw}
            onChange={(e) => setKw(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && first) onPick(first.id);
            }}
            placeholder="Tìm theo tên đường, hẻm hoặc khu phố"
            aria-label="Tìm góc phố"
            className="kp-input kp-input-lg w-full pl-11"
          />
        </div>
        {issues.length > 0 && (
          <p className="m-0 mt-2 text-[12px] text-ink-soft sm:text-[13px]">
            {kw.trim()
              ? `${total} góc phố khớp “${kw.trim()}”`
              : `${issues.length} góc phố đang chờ lời nhắc`}
          </p>
        )}
      </div>

      {issues.length === 0 ? (
        <p className="m-0 py-6 text-center text-[14px] text-ink-soft">
          Chưa có góc phố nào đang mở — bạn đề xuất góc đầu tiên nhé!
        </p>
      ) : total === 0 ? (
        <p className="m-0 py-6 text-center text-[14px] text-ink-soft">
          Không thấy góc phố nào khớp “{kw.trim()}” — thử từ khác, hoặc đề xuất góc phố mới.
        </p>
      ) : (
        <>
          {mine.length > 0 && (
            <>
              <p data-group="mine" className={groupTitle}>
                📍 Góc phố ở {myNeighborhood}
              </p>
              {mine.map((it, i) => (
                <SpotRow
                  key={it.id}
                  issue={it}
                  kw={kw}
                  last={i === mine.length - 1}
                  onPick={onPick}
                />
              ))}
            </>
          )}
          {others.length > 0 && (
            <>
              {mine.length > 0 && (
                <p data-group="others" className={`${groupTitle} mt-4`}>
                  Góc phố ở khu phố khác
                </p>
              )}
              {others.map((it, i) => (
                <SpotRow
                  key={it.id}
                  issue={it}
                  kw={kw}
                  last={i === others.length - 1}
                  onPick={onPick}
                />
              ))}
            </>
          )}
        </>
      )}

      {/* CTA đáy giống hai tab kia của .fig: pill cao 50, viền cam 1.5px */}
      <div className="flex justify-center py-5">
        <button
          onClick={onPropose}
          className="kp-btn kp-btn-primary tap h-[50px] px-8 text-[15px] sm:text-[16px]"
        >
          + Đề xuất góc phố mới
        </button>
      </div>
    </Modal>
  );
}
