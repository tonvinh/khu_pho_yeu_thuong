"use client";
// Modal "Bình chọn lời nhắc" — nút "Bình chọn" ở mỗi dòng góc phố (IssueBoard) mở modal này.
//
// Design mới bỏ drawer góc xóm (nơi trước đây vừa xem danh sách câu vừa bấm "thương"),
// nên phải có chỗ để cư dân CHỌN câu nào mình thương: giữ nguyên luật 1 phiếu/câu,
// cấm tự thương câu của mình (02 §3) — chỉ đổi vỏ từ drawer sang modal.
// Góc phố đã treo biển thì modal hiện biển đã treo thay cho danh sách bình chọn.
import { useCallback, useEffect, useState } from "react";
import type { IssueDetail, SuggestionItem } from "./types";
import { apiGet, apiSend, BASE } from "../client-api";
import { categoryLabel } from "@/lib/taxonomy";
import { COPY } from "@/lib/copy";
import { IconPin, Modal } from "./ui";

export default function VoteModal({
  issueId,
  requireIdentity,
  onClose,
  showToast,
  onChanged,
  onEngaged,
  onWrite,
}: {
  issueId: string;
  requireIdentity: (fn: () => void) => void;
  onClose: () => void;
  showToast: (msg: string) => void;
  onChanged: () => void;
  /** Gọi sau khi bình chọn thành công — mở popup ưu đãi */
  onEngaged?: () => void;
  /** Chuyển sang form viết câu cho chính góc phố này */
  onWrite: (issueId: string) => void;
}) {
  const [issue, setIssue] = useState<IssueDetail | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
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
      // Optimistic UI — lỗi thì trả lại như cũ
      setPopId(s.id);
      setSuggestions((list) =>
        list.map((it) =>
          it.id === s.id ? { ...it, voted: !it.voted, votes: it.votes + (it.voted ? -1 : 1) } : it
        )
      );
      try {
        await apiSend("POST", `/api/v1/suggestions/${s.id}/vote`);
        onChanged();
        if (!s.voted) onEngaged?.();
      } catch (e) {
        setSuggestions((list) =>
          list.map((it) => (it.id === s.id ? { ...it, voted: s.voted, votes: s.votes } : it))
        );
        if (e instanceof Error) showToast(e.message);
      }
    });

  const installed = suggestions.find((s) => s.status === "installed");
  const sorted = [...suggestions].sort((a, b) => b.votes - a.votes);

  return (
    <Modal title="Bình chọn lời nhắc" onClose={onClose}>
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

      {issue?.status === "signed" && installed ? (
        <>
          <div className="rounded-2xl border border-[#CFE2D5] bg-[#E9F1EB] p-5 text-center">
            <div className="mb-2.5 text-[12.5px] text-ink-soft">{COPY.panelSignTitle}</div>
            <div className="inline-block rounded-xl border-[1.5px] border-olive bg-white px-5 py-3.5 font-display text-[17px] font-semibold shadow-kp-s">
              {installed.content}
            </div>
          </div>
          <p className="m-0 mt-3 text-[13px] text-ink-soft">{COPY.panelSignThanks}</p>
          <div className="py-5">
            <a href={`${BASE}/bien/${installed.id}`} className="kp-btn kp-btn-primary tap w-full px-5 py-3">
              Chia sẻ
            </a>
          </div>
        </>
      ) : (
        <>
          <div className="mb-3 text-[13px] text-ink-soft">
            {suggestions.length > 0
              ? `${suggestions.length} câu nhắc đang chờ bình chọn — chọn câu bạn thương nhất`
              : COPY.emptySuggestions}
          </div>

          <div className="flex flex-col gap-2.5">
            {sorted.map((s) => (
              <div
                key={s.id}
                className="flex items-start gap-3 rounded-2xl border border-cream-dark bg-white p-3.5"
              >
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
                  <div className="min-w-[56px] flex-none rounded-xl border border-cream-dark bg-cream px-2 py-1.5 text-center opacity-70">
                    <div className="font-display text-base font-bold leading-none">{s.votes}</div>
                    <div className="mt-0.5 text-[10px] text-ink-soft">câu của bạn</div>
                  </div>
                ) : (
                  <button
                    onClick={() => vote(s)}
                    className={`min-w-[56px] flex-none cursor-pointer rounded-xl border px-2 py-1.5 text-center transition ${
                      s.voted
                        ? "border-accent-blue bg-accent-blue text-white"
                        : "border-accent-blue/40 bg-white text-accent-blue hover:bg-accent-blue-light"
                    } ${popId === s.id ? "heart-pop" : ""}`}
                  >
                    <div className="font-display text-base font-bold leading-none">{s.votes}</div>
                    <div className="mt-0.5 text-[10px]">{s.voted ? "đã thương" : "thương"}</div>
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="py-5">
            <button
              onClick={() => { onClose(); onWrite(issueId); }}
              className="kp-btn kp-btn-primary tap w-full px-5 py-3"
            >
              Viết câu nhắc của bạn
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
