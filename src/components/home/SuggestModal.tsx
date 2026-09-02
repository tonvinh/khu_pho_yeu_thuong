"use client";
// Modal "Gửi câu nhắc" (docs/lp/lp5.png) — thay phần VIẾT CÂU của drawer góc xóm cũ.
// Gồm: tên chủ đề + phường · ô viết câu (≤120) · 4 chip 4N tự soát (KHÔNG chấm tự động — Q2)
// · ví dụ bấm-để-điền · checkbox nhận ưu đãi · Ô SỐ ĐIỆN THOẠI (email review 18/8:
// "đang ko có ô điền số điện thoại") — chỉ hiện & bắt buộc khi tick nhận ưu đãi.
// Quyết định 2/9 (docs/20): DESIGN THẮNG SPEC — bỏ ghi chú đạo đức (docs/02 §72) và
// dòng nhắc định danh dưới nút, vì .fig 7458:42002 không vẽ.
import { useCallback, useEffect, useState } from "react";
import type { IssueDetail, Me } from "./types";
import { apiGet, apiSend } from "../client-api";
import { categoryLabel, type CategoryCode } from "@/lib/taxonomy";
import { COPY } from "@/lib/copy";
import { EXAMPLE_SUGGESTIONS } from "@/lib/examples";
import { Field, IconPin, Modal } from "./ui";

export default function SuggestModal({
  issueId,
  me,
  requireIdentity,
  onClose,
  showToast,
  onChanged,
  onEngaged,
}: {
  issueId: string;
  me: Me | null;
  requireIdentity: (fn: () => void) => void;
  onClose: () => void;
  showToast: (msg: string) => void;
  onChanged: () => void;
  /** Gọi sau khi gửi câu thành công — mở popup ưu đãi */
  onEngaged?: () => void;
}) {
  const [issue, setIssue] = useState<IssueDetail | null>(null);
  const [content, setContent] = useState("");
  const [optIn, setOptIn] = useState(false); // mặc định KHÔNG tick (quy tắc cứng 5)
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiGet<{ issue: IssueDetail }>(`/api/v1/issues/${issueId}`);
      setIssue(res.issue);
    } catch {
      onClose();
    }
  }, [issueId, onClose]);
  useEffect(() => { load(); }, [load]);

  const examples = issue ? EXAMPLE_SUGGESTIONS[issue.category as CategoryCode] ?? [] : [];

  const submit = () =>
    requireIdentity(async () => {
      if (!content.trim()) { setError("Bạn chưa viết câu nhắc"); return; }
      if (optIn && !phone.trim()) { setError("Nhập số điện thoại để FPT gửi ưu đãi nhé"); return; }
      setBusy(true);
      setError(null);
      try {
        await apiSend("POST", `/api/v1/issues/${issueId}/suggestions`, {
          content: content.trim(),
          lead_opt_in: optIn,
          phone: optIn ? phone.trim() : "",
        });
        showToast(COPY.toastSuggestionSent);
        onChanged();
        onEngaged?.();
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
      } finally {
        setBusy(false);
      }
    });

  return (
    <Modal title="Gửi câu nhắc" onClose={onClose}>
      {/* Frame 247: tên chủ đề 30px Bold, cách 4px tới dòng địa chỉ 14px Light #969696 */}
      <div className="mb-5">
        <div className="text-[22px] font-bold leading-tight tracking-[-0.02em] sm:text-[30px]">
          {issue ? categoryLabel(issue.category) : "Đang tải…"}
        </div>
        {issue && (
          <div className="mt-1 font-light text-[14px] text-ink-soft">
            <IconPin className="mr-2 text-brick" />
            {issue.neighborhood_name}
            {issue.location_text ? ` · ${issue.location_text}` : ""}
          </div>
        )}
      </div>

      <Field label="Viết câu nhắc của bạn" size="lg">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, 120))}
          placeholder={COPY.suggestionPlaceholder}
          rows={3}
          className="kp-input kp-input-lg"
        />
      </Field>
      {/* Frame 243: 4 chip 4N RỘNG BẰNG NHAU (147×37), cách nhau 16px — chip tĩnh,
          KHÔNG chấm tự động (Q2). Bộ đếm ký tự nằm dưới, design không vẽ khung riêng. */}
      <div className="mt-3.5 grid grid-cols-4 gap-2 sm:gap-4">
        {["Nhắc", "Nhở", "Nhỏ", "Nhẹ"].map((n) => (
          <span key={n} className="kp-n4chip">{n}</span>
        ))}
      </div>
      <p className="m-0 mt-3.5 flex items-center justify-between gap-3 font-light text-[13px] text-ink-soft sm:text-[14px]">
        <span>{COPY.note4N}</span>
        <span className="flex-none">{content.length}/120</span>
      </p>

      {/* Frame 245: nhãn 16px Bold, các ví dụ là pill cao 50 viền 1.5px #3D3D3D */}
      {examples.length > 0 && (
        <div className="mt-5">
          <div className="text-[15px] font-bold sm:text-[16px]">
            Bí quá? xem vài ví dụ (bấm để điền rồi sửa theo ý mình):
          </div>
          <div className="mt-4 flex flex-col gap-4">
            {examples.map((ex) => (
              <button
                key={ex}
                onClick={() => setContent(ex.slice(0, 120))}
                className="tap cursor-pointer rounded-full border-[1.5px] border-ink bg-white px-4 text-left font-light text-[14px] text-ink-soft transition hover:border-brick hover:text-ink sm:h-[50px] sm:text-[16px]"
              >
                “{ex}”
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lead tầng 1 — checkbox + ô SĐT chỉ hiện khi tick */}
      {/* Frame 196: ô tick 18×18 bo 6 viền 1.5px #3D3D3D, chữ 14px Light */}
      <label className="mt-6 flex cursor-pointer items-start gap-2 font-light text-[14px] leading-[1.45]">
        <input
          type="checkbox"
          checked={optIn}
          onChange={(e) => setOptIn(e.target.checked)}
          className="mt-[2px] h-[18px] w-[18px] flex-none cursor-pointer rounded-[6px] accent-brick"
        />
        <span>
          {COPY.optInCheckbox}
          <span className="mt-0.5 block text-ink-soft">{COPY.optInNoteTier1}</span>
        </span>
      </label>

      {optIn && (
        <Field label="Số điện thoại" size="lg" className="mt-4">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={me ? "Nhập số bạn muốn FPT liên hệ" : "VD: 0988 123 xxx"}
            className="kp-input kp-input-lg tap"
          />
          <span className="mt-1.5 block pl-1 font-light text-[13px] text-ink-soft">
            Số này chỉ dùng để gửi ưu đãi, được bảo mật và không hiển thị công khai.
          </span>
        </Field>
      )}

      {error && <p className="m-0 mt-3 text-sm font-medium text-status-waiting">{error}</p>}
      <div className="pb-5 pt-6">
        <button
          onClick={submit}
          disabled={busy}
          className="kp-btn kp-btn-primary tap h-[50px] w-full px-5 text-[16px] disabled:opacity-60"
        >
          {busy ? "Đang gửi…" : "Gửi câu nhắc"}
        </button>
      </div>
    </Modal>
  );
}
