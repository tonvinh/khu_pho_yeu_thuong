"use client";
// Popup "Chọn góc phố" — bước đứng TRƯỚC form viết câu khi người dùng bấm CTA
// "+ Viết câu nhắc của riêng bạn" ở đáy tab 2.
//
// Vì sao cần: từ bản Figma live 4/9, dòng của tab 2 là CÂU NHẮC chứ không còn là góc
// phố, nên CTA đáy không còn ngữ cảnh "góc phố nào". Trước đó code tạm lấy góc phố mở
// đầu tiên — sai ý người dùng. Quyết định 4/9: **phải cho chọn góc phố**.
//
// Design chưa vẽ frame cho popup này → dựng theo khung Modal chung (rộng 700, viền cam
// 2px, tiêu đề 25px Regular) và mượn đúng cấu trúc dòng của tab 1.
import { useMemo, useState } from "react";
import type { IssueCard } from "./types";
import { categoryLabel } from "@/lib/taxonomy";
import { IconPencil, IconPin, IconSearch, Modal } from "./ui";

/** Bỏ dấu để gõ "hem 42" vẫn ra "Hẻm 42" */
const fold = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase();

export default function SpotPickerModal({
  issues,
  onPick,
  onPropose,
  onClose,
}: {
  /** Góc phố còn mở (chưa treo biển) — HomeShell lọc sẵn */
  issues: IssueCard[];
  onPick: (issueId: string) => void;
  onPropose: () => void;
  onClose: () => void;
}) {
  const [kw, setKw] = useState("");

  const rows = useMemo(() => {
    const k = fold(kw.trim());
    if (!k) return issues;
    return issues.filter((it) =>
      fold(`${categoryLabel(it.category)} ${it.location_text} ${it.neighborhood_name}`).includes(k)
    );
  }, [issues, kw]);

  return (
    <Modal title="Chọn góc phố" onClose={onClose}>
      <p className="m-0 mb-4 font-light text-[14px] leading-snug text-ink-soft sm:text-[16px]">
        Bạn muốn gửi lời nhắc cho góc phố nào?
      </p>

      <div className="relative mb-4">
        <IconSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft" />
        <input
          value={kw}
          onChange={(e) => setKw(e.target.value)}
          placeholder="Tìm góc phố theo tên đường, hẻm hoặc khu phố"
          aria-label="Tìm góc phố"
          className="kp-input kp-input-lg w-full pl-11"
        />
      </div>

      <div className="flex flex-col">
        {rows.length === 0 && (
          <p className="m-0 py-6 text-center text-[14px] text-ink-soft">
            Không thấy góc phố nào khớp — bạn đề xuất góc phố mới nhé!
          </p>
        )}
        {rows.map((it, i) => (
          <div
            key={it.id}
            data-spot
            className={`kp-row-sep flex flex-col gap-2.5 py-3 sm:flex-row sm:items-center sm:gap-4 ${
              i === rows.length - 1 ? "kp-row-sep-b" : ""
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-bold leading-snug tracking-[-0.02em] sm:text-[18px]">
                {categoryLabel(it.category)} · {it.location_text}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-6 gap-y-1 font-light text-[12.5px] text-ink-soft sm:text-[14px]">
                <span className="inline-flex items-center gap-1.5">
                  <IconPin className="text-brick" />
                  {it.neighborhood_name}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <IconPencil className="text-brick" />
                  {it.suggestion_count > 0 ? `${it.suggestion_count} câu đề xuất` : "Chưa có câu đề xuất"}
                </span>
              </div>
            </div>
            <button
              onClick={() => onPick(it.id)}
              className="kp-btn kp-btn-primary kp-btn-row tap tap-sm-auto h-[44px] flex-none px-5 sm:h-[35px] sm:w-[120px] sm:px-0"
            >
              Gửi lời nhắc
            </button>
          </div>
        ))}
      </div>

      <div className="flex justify-center py-5">
        <button onClick={onPropose} className="kp-btn kp-btn-outline tap h-[50px] px-8 text-[15px]">
          + Đề xuất góc phố mới
        </button>
      </div>
    </Modal>
  );
}
