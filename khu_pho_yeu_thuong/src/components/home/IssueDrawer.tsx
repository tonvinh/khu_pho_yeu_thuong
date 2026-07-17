"use client";
// Drawer vấn đề — viết & bình chọn câu nhắc (02 §3)
import { useCallback, useEffect, useState } from "react";
import type { IssueDetail, Me, SuggestionItem } from "./types";
import { apiGet, apiSend } from "../client-api";
import { categoryIcon, categoryLabel } from "@/lib/taxonomy";
import { COPY } from "@/lib/copy";

export default function IssueDrawer({
  issueId,
  me,
  requireIdentity,
  onClose,
  showToast,
  onChanged,
}: {
  issueId: string;
  me: Me | null;
  requireIdentity: (fn: () => void) => void;
  onClose: () => void;
  showToast: (msg: string) => void;
  onChanged: () => void;
}) {
  const [issue, setIssue] = useState<IssueDetail | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [content, setContent] = useState("");
  const [optIn, setOptIn] = useState(false); // mặc định KHÔNG tick (quy tắc cứng 5)
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [popId, setPopId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiGet<{ issue: IssueDetail; suggestions: SuggestionItem[] }>(
        `/api/v1/issues/${issueId}`
      );
      setIssue(res.issue);
      setSuggestions(res.suggestions);
    } catch {
      onClose();
    }
  }, [issueId, onClose]);

  useEffect(() => { load(); }, [load]);

  const vote = (s: SuggestionItem) =>
    requireIdentity(async () => {
      // Optimistic UI
      setPopId(s.id);
      setSuggestions((list) =>
        list.map((it) =>
          it.id === s.id
            ? { ...it, voted: !it.voted, votes: it.votes + (it.voted ? -1 : 1) }
            : it
        )
      );
      try {
        await apiSend("POST", `/api/v1/suggestions/${s.id}/vote`);
        onChanged();
      } catch (e) {
        setSuggestions((list) =>
          list.map((it) =>
            it.id === s.id
              ? { ...it, voted: s.voted, votes: s.votes }
              : it
          )
        );
        if (e instanceof Error) showToast(e.message);
      }
    });

  const submit = () =>
    requireIdentity(async () => {
      if (!content.trim()) { setError("Bạn chưa viết câu nhắc"); return; }
      setBusy(true);
      setError(null);
      try {
        await apiSend("POST", `/api/v1/issues/${issueId}/suggestions`, {
          content: content.trim(),
          lead_opt_in: optIn,
        });
        setContent("");
        setOptIn(false);
        showToast(COPY.toastSuggestionSent);
        onChanged();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
      } finally {
        setBusy(false);
      }
    });

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 sm:items-center" onClick={onClose}>
      <div
        className="slide-up max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-extrabold">
              {issue ? `${categoryIcon(issue.category)} ${categoryLabel(issue.category)}` : "…"}
            </h3>
            <p className="text-sm text-ink-soft">{issue?.location_text}</p>
          </div>
          <button onClick={onClose} className="tap px-2 text-lg text-ink-soft">✕</button>
        </div>

        {/* Danh sách câu nhắc đang chờ bình chọn */}
        <div className="mt-4 space-y-2.5">
          {suggestions.length === 0 && (
            <p className="rounded-2xl bg-cream p-4 text-center text-sm text-ink-soft">
              {COPY.emptySuggestions}
            </p>
          )}
          {suggestions.map((s) => (
            <div key={s.id} className="rounded-2xl border border-cream-dark p-4">
              <p className="font-semibold leading-snug">“{s.content}”</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="text-xs text-ink-soft">
                  — {s.author_name}
                  <span className="ml-2 rounded-full bg-status-signed/10 px-2 py-0.5 font-semibold text-status-signed">
                    ✓ Đạt chuẩn 4N
                  </span>
                </div>
                {/* Không tự thương câu của chính mình (02 §3) */}
                {s.is_mine ? (
                  <span className="text-xs font-semibold text-ink-soft">{s.votes} thương · câu của bạn</span>
                ) : (
                  <button
                    onClick={() => vote(s)}
                    className={`tap rounded-full px-4 py-2 text-sm font-bold ${
                      s.voted ? "bg-brick text-white" : "bg-brick-light text-brick"
                    } ${popId === s.id ? "heart-pop" : ""}`}
                  >
                    💛 {s.votes} thương
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Viết câu nhắc */}
        {issue && issue.status !== "signed" && (
          <div className="mt-5 rounded-2xl bg-cream p-4">
            <div className="font-bold">Viết câu nhắc của bạn</div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, 120))}
              placeholder={COPY.suggestionPlaceholder}
              rows={3}
              className="mt-2 w-full rounded-xl border border-cream-dark bg-white px-4 py-3"
            />
            <div className="mt-1 flex items-center justify-between text-xs text-ink-soft">
              {/* Checklist 4N tự soát — chip tĩnh, KHÔNG chấm tự động (Q2) */}
              <div className="flex gap-1.5">
                {["Nhắc", "Nhở", "Nhỏ", "Nhẹ"].map((n) => (
                  <span key={n} className="rounded-full bg-white px-2 py-0.5 font-semibold">{n}</span>
                ))}
              </div>
              <span>{content.length}/120</span>
            </div>
            <p className="mt-2 text-xs text-ink-soft">{COPY.note4N}</p>

            {/* Lead tầng 1: chỉ checkbox — SĐT đã có từ định danh, KHÔNG hỏi lại (02 §7.1) */}
            <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={optIn}
                onChange={(e) => setOptIn(e.target.checked)}
                className="mt-1 h-4 w-4 accent-brick"
              />
              <span>
                {COPY.optInCheckbox}
                <span className="block text-xs text-ink-soft">{COPY.optInNoteTier1}</span>
              </span>
            </label>

            <p className="mt-3 text-xs leading-relaxed text-ink-soft">{COPY.noteEthics}</p>
            {error && <p className="mt-2 text-sm font-medium text-status-waiting">{error}</p>}
            <button
              onClick={submit}
              disabled={busy}
              className="tap mt-3 w-full rounded-full bg-brick px-5 py-3 font-bold text-white disabled:opacity-60"
            >
              {busy ? "Đang gửi…" : "Gửi câu nhắc"}
            </button>
            {!me && (
              <p className="mt-2 text-center text-xs text-ink-soft">
                Bạn sẽ được hỏi số điện thoại một lần để xóm nhận ra bạn 💛
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
