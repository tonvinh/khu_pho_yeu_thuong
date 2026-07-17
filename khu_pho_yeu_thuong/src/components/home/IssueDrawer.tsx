"use client";
// Drawer góc xóm — trượt từ phải theo prototype: xem/viết & bình chọn câu nhắc (02 §3).
// Biển đã treo → khung donebox; nút thương kiểu ô số + nhãn; có chip ví dụ điền nhanh.
import { useCallback, useEffect, useState } from "react";
import type { IssueDetail, Me, SuggestionItem } from "./types";
import { apiGet, apiSend, BASE } from "../client-api";
import { categoryIcon, categoryLabel, type CategoryCode } from "@/lib/taxonomy";
import { COPY } from "@/lib/copy";
import { EXAMPLE_SUGGESTIONS } from "@/lib/examples";
import { Drawer, Field } from "./ui";

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
            it.id === s.id ? { ...it, voted: s.voted, votes: s.votes } : it
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

  const installed = suggestions.find((s) => s.status === "installed");
  const sorted = [...suggestions].sort((a, b) => b.votes - a.votes);
  // Bỏ ví dụ trùng với câu đã có trong danh sách
  const examples = (issue ? EXAMPLE_SUGGESTIONS[issue.category as CategoryCode] ?? [] : []).filter(
    (ex) => !suggestions.some((s) => s.content === ex)
  );

  return (
    <Drawer
      icon={issue ? categoryIcon(issue.category) : "…"}
      title={issue ? categoryLabel(issue.category) : "Đang tải…"}
      sub={issue?.location_text}
      onClose={onClose}
    >
      {issue?.photo_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={issue.photo_url}
          alt={issue.location_text}
          className="mb-3.5 h-40 w-full rounded-[13px] border border-cream-dark object-cover"
        />
      )}

      {issue?.status === "signed" && installed ? (
        <>
          {/* Biển đã treo (prototype .donebox) */}
          <div className="rounded-[14px] border border-[#CFE2D5] bg-[#E9F1EB] p-4 text-center">
            <div className="mb-2.5 text-[12.5px] text-ink-soft">{COPY.panelSignTitle}</div>
            <div className="inline-block -rotate-[1.5deg] rounded-xl border-[1.5px] border-olive bg-white px-[18px] py-[13px] font-display text-[17px] font-semibold shadow-kp-s">
              {installed.content}
            </div>
          </div>
          {installed.sign_photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={installed.sign_photo_url}
              alt={COPY.panelSignTitle}
              className="mt-3 h-40 w-full rounded-[13px] border border-cream-dark object-cover"
            />
          )}
          <p className="m-0 mt-3 text-[13px] text-ink-soft">{COPY.panelSignThanks}</p>
          <a
            href={`${BASE}/bien/${installed.id}`}
            className="kp-btn kp-btn-primary tap mt-3 w-full px-5 py-2.5"
          >
            Chia sẻ
          </a>
        </>
      ) : (
        <>
          <div className="mb-2.5 text-[13px] text-ink-soft">
            {suggestions.length > 0
              ? `${suggestions.length} câu nhắc đang chờ bình chọn`
              : COPY.emptySuggestions}
          </div>

          {/* Danh sách câu nhắc — nút thương bên phải (prototype .proposal/.vote) */}
          <div className="flex flex-col gap-2.5">
            {sorted.map((s) => (
              <div key={s.id} className="flex items-start gap-3 rounded-[13px] border border-cream-dark bg-white p-3">
                <div className="min-w-0 flex-1 text-[14.5px]">
                  {s.content}
                  <div className="mt-1 text-[11.5px] text-ink-soft">
                    — {s.author_name}
                    <span className="ml-2 rounded-full bg-status-signed-bg px-2 py-0.5 font-semibold text-status-signed">
                      ✓ Đạt chuẩn 4N
                    </span>
                  </div>
                </div>
                {/* Không tự thương câu của chính mình (02 §3) */}
                {s.is_mine ? (
                  <div className="min-w-[54px] flex-none rounded-[10px] border border-cream-dark bg-[#F7F1E7] px-2 py-1.5 text-center opacity-70">
                    <div className="font-display text-base font-bold leading-none">{s.votes}</div>
                    <div className="mt-0.5 text-[10px] text-ink-soft">câu của bạn</div>
                  </div>
                ) : (
                  <button
                    onClick={() => vote(s)}
                    className={`min-w-[54px] flex-none cursor-pointer rounded-[10px] border px-2 py-1.5 text-center transition ${
                      s.voted
                        ? "border-olive bg-olive text-white"
                        : "border-cream-dark bg-[#F7F1E7] hover:border-olive hover:bg-olive-light"
                    } ${popId === s.id ? "heart-pop" : ""}`}
                  >
                    <div className="font-display text-base font-bold leading-none">{s.votes}</div>
                    <div className="mt-0.5 text-[10px]">{s.voted ? "đã thương" : "thương"}</div>
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Viết câu nhắc */}
          {issue && issue.status !== "signed" && (
            <>
              <Field label="Viết câu nhắc của bạn" className="mt-4">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value.slice(0, 120))}
                  placeholder={COPY.suggestionPlaceholder}
                  rows={3}
                  className="kp-input"
                />
              </Field>
              <div className="mt-1.5 flex items-center justify-between gap-2">
                {/* Checklist 4N tự soát — chip tĩnh, KHÔNG chấm tự động (Q2) */}
                <div className="flex gap-1.5">
                  {["Nhắc", "Nhở", "Nhỏ", "Nhẹ"].map((n) => (
                    <span key={n} className="kp-n4chip">{n}</span>
                  ))}
                </div>
                <span className="text-xs text-ink-soft">{content.length}/120</span>
              </div>
              <p className="m-0 mt-1.5 text-xs text-ink-soft">{COPY.note4N}</p>

              {/* Ví dụ minh hoạ — bấm để điền nhanh rồi sửa theo ý mình */}
              {examples.length > 0 && (
                <div className="mt-3">
                  <div className="text-[12.5px] font-semibold text-ink-soft">
                    Bí quá? Xem vài ví dụ (bấm để điền rồi sửa theo ý mình):
                  </div>
                  <div className="mt-1.5 flex flex-col gap-1.5">
                    {examples.map((ex) => (
                      <button
                        key={ex}
                        onClick={() => setContent(ex.slice(0, 120))}
                        className="cursor-pointer rounded-[10px] border border-dashed border-cream-dark bg-white px-3 py-2 text-left text-[13px] text-ink-soft transition hover:border-olive hover:text-ink"
                      >
                        “{ex}”
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Lead tầng 1: chỉ checkbox — SĐT đã có từ định danh, KHÔNG hỏi lại (02 §7.1) */}
              <label className="mt-3.5 flex cursor-pointer items-start gap-2.5 text-[13px] leading-[1.45]">
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

              <p className="m-0 mt-3 text-xs leading-relaxed text-ink-soft">{COPY.noteEthics}</p>
              {error && <p className="m-0 mt-2 text-sm font-medium text-status-waiting">{error}</p>}
              <button
                onClick={submit}
                disabled={busy}
                className="kp-btn kp-btn-primary tap mt-3 w-full px-5 py-3 disabled:opacity-60"
              >
                {busy ? "Đang gửi…" : "Gửi câu nhắc"}
              </button>
              {!me && (
                <p className="m-0 mt-2 text-center text-xs text-ink-soft">
                  Bạn sẽ được hỏi số điện thoại một lần để xóm nhận ra bạn 💛
                </p>
              )}
            </>
          )}
        </>
      )}
    </Drawer>
  );
}
