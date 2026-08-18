"use client";
// Modal "Gửi câu nhắc" (docs/lp/lp5.png) — thay phần VIẾT CÂU của drawer góc xóm cũ.
// Gồm: tên chủ đề + phường · ô viết câu (≤120) · 4 chip 4N tự soát (KHÔNG chấm tự động — Q2)
// · ví dụ bấm-để-điền · checkbox nhận ưu đãi · Ô SỐ ĐIỆN THOẠI (email review 18/8:
// "đang ko có ô điền số điện thoại") — chỉ hiện & bắt buộc khi tick nhận ưu đãi.
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
      <div className="mb-4">
        <div className="font-display text-[20px] font-bold leading-tight sm:text-[22px]">
          {issue ? categoryLabel(issue.category) : "Đang tải…"}
        </div>
        {issue && (
          <div className="mt-1 text-[13px] text-ink-soft">
            <IconPin className="mr-1 text-brick" />
            {issue.neighborhood_name}
            {issue.location_text ? ` · ${issue.location_text}` : ""}
          </div>
        )}
      </div>

      <Field label="Viết câu nhắc của bạn">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, 120))}
          placeholder={COPY.suggestionPlaceholder}
          rows={3}
          className="kp-input"
        />
      </Field>
      <div className="mt-2 flex items-center justify-between gap-2">
        {/* Checklist 4N tự soát — chip tĩnh, KHÔNG chấm tự động (Q2) */}
        <div className="flex flex-wrap gap-1.5">
          {["Nhắc", "Nhở", "Nhỏ", "Nhẹ"].map((n) => (
            <span key={n} className="kp-n4chip">{n}</span>
          ))}
        </div>
        <span className="text-xs text-ink-soft">{content.length}/120</span>
      </div>
      <p className="m-0 mt-2 text-[12px] text-ink-soft">{COPY.note4N}</p>

      {examples.length > 0 && (
        <div className="mt-4">
          <div className="text-[13px] font-bold">Bí quá? xem vài ví dụ (bấm để điền rồi sửa theo ý mình):</div>
          <div className="mt-2 flex flex-col gap-2">
            {examples.map((ex) => (
              <button
                key={ex}
                onClick={() => setContent(ex.slice(0, 120))}
                className="cursor-pointer rounded-full border border-cream-dark bg-white px-4 py-2.5 text-left text-[13.5px] text-ink-soft transition hover:border-brick hover:text-ink"
              >
                “{ex}”
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lead tầng 1 — checkbox + ô SĐT chỉ hiện khi tick */}
      <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-[13px] leading-[1.45]">
        <input
          type="checkbox"
          checked={optIn}
          onChange={(e) => setOptIn(e.target.checked)}
          className="mt-[3px] h-4 w-4 flex-none cursor-pointer accent-brick"
        />
        <span>
          {COPY.optInCheckbox}
          <span className="mt-0.5 block text-[11.5px] text-ink-soft">{COPY.optInNoteTier1}</span>
        </span>
      </label>

      {optIn && (
        <Field label="Số điện thoại" className="mt-3">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={me ? "Nhập số bạn muốn FPT liên hệ" : "VD: 0988 123 xxx"}
            className="kp-input tap"
          />
          <span className="mt-1.5 block pl-1 text-[11.5px] text-ink-soft">
            Số này chỉ dùng để gửi ưu đãi, được bảo mật và không hiển thị công khai.
          </span>
        </Field>
      )}

      <p className="m-0 mt-3 text-[12px] leading-relaxed text-ink-soft">{COPY.noteEthics}</p>
      {error && <p className="m-0 mt-2 text-sm font-medium text-status-waiting">{error}</p>}
      <div className="py-5">
        <button
          onClick={submit}
          disabled={busy}
          className="kp-btn kp-btn-primary tap w-full px-5 py-3 disabled:opacity-60"
        >
          {busy ? "Đang gửi…" : "Gửi câu nhắc"}
        </button>
        {!me && (
          <p className="m-0 mt-2 text-center text-xs text-ink-soft">
            Bạn sẽ được hỏi số điện thoại một lần để xóm nhận ra bạn 💛
          </p>
        )}
      </div>
    </Modal>
  );
}
