"use client";
// Popup "Cây bút khu phố" — Figma bản 2/9 · B10 (frame MỚI 7727:1743, bản 18/8 chưa có).
// Mở từ nút "Bình chọn" ở tab 3 của IssueBoard (quyết định Q7 — nút này thay cho
// "Chia sẻ ↗" cũ; trang /dai-su/[slug] vẫn sống, chỉ không còn lối vào từ đây).
//
// .fig: tên + phường 30px Bold ls -2% · dòng mời 18px Regular · mỗi câu là thẻ 636×81
// r=16 nền #E8F8FF KHÔNG viền, gồm nội dung 18px #333, pin địa chỉ 14px Light, pill
// "Đạt chuẩn 4N" 125×25 r=28 nền #2323FF, nút thương 156×43 r=80 nền #FF8206.
//
// Mọi câu trong danh sách đều đã qua duyệt 4N (status approved trở lên) nên pill
// "Đạt chuẩn 4N" hiện cho tất cả — đúng như design vẽ.
import { useEffect, useState } from "react";
import type { AmbassadorDetail, AmbassadorNote } from "@/lib/ambassador";
import { apiGet, apiSend } from "../client-api";
import { wardAddress } from "@/lib/address";
import { IconHeartSolid, IconPin, Modal } from "./ui";

/** Pill "Đạt chuẩn 4N" — .fig 125×25 r=28 nền #2323FF, icon vuesax/linear/verify */
function Badge4N() {
  return (
    <span className="inline-flex h-[25px] flex-none items-center gap-1.5 rounded-full bg-accent-blue px-2.5 font-light text-[13px] text-white sm:text-[14px]">
      <svg viewBox="0 0 24 24" aria-hidden className="h-3.5 w-3.5 flex-none" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="9" />
        <path d="m8.5 12 2.4 2.4 4.6-4.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Đạt chuẩn 4N
    </span>
  );
}

function NoteCard({
  note,
  showToast,
  onChanged,
}: {
  note: AmbassadorNote;
  showToast: (msg: string) => void;
  onChanged: () => void;
}) {
  const [votes, setVotes] = useState(note.votes);
  const [voted, setVoted] = useState(note.voted);
  const [busy, setBusy] = useState(false);
  const addr = wardAddress(note.ward, note.city);

  const vote = async () => {
    if (voted || busy) return;
    setBusy(true);
    setVoted(true);
    setVotes((n) => n + 1);
    try {
      await apiSend("POST", `/api/v1/suggestions/${note.id}/vote`);
      onChanged();
    } catch (e) {
      // Bình chọn không rút lại được (Q6) — lỗi thì trả về đúng số cũ
      setVoted(false);
      setVotes(note.votes);
      if (e instanceof Error) showToast(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      data-note
      className="flex flex-col gap-3 rounded-2xl bg-[#E8F8FF] px-4 py-3 sm:flex-row sm:items-center sm:gap-4"
    >
      <div className="min-w-0 flex-1">
        <div className="text-[15px] leading-snug tracking-[-0.02em] text-[#333333] sm:text-[18px]">
          {note.content}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {addr && (
            <span className="inline-flex items-center gap-1.5 font-light text-[13px] text-ink-soft sm:text-[14px]">
              <IconPin className="text-brick" />
              {addr}
            </span>
          )}
          <Badge4N />
        </div>
      </div>
      {/* Câu của chính mình thì không tự thương được (quy tắc cứng 3) */}
      {!note.is_mine && (
        <button
          onClick={vote}
          disabled={voted}
          /* .fig cho nút 156px, nhưng số 3–4 chữ số + "lượt thương" ở 16px vượt 156
             nên chốt `w-` là chữ bị bẻ hai dòng (đo trên Chrome). Dùng min-w + nowrap:
             đúng 156 với số ngắn, tự nới khi số dài. */
          className={`tap tap-sm-auto inline-flex h-[44px] flex-none items-center justify-center gap-2 whitespace-nowrap rounded-full bg-brick px-4 text-[15px] text-white transition sm:h-[43px] sm:min-w-[156px] sm:text-[16px] ${
            voted ? "cursor-default opacity-75" : "cursor-pointer hover:bg-brick-dark"
          }`}
        >
          <IconHeartSolid className="h-[18px] w-[18px]" />
          {votes.toLocaleString("vi-VN")} lượt thương
        </button>
      )}
    </div>
  );
}

export default function AmbassadorModal({
  slug,
  onClose,
  showToast,
  onChanged,
}: {
  /** share_slug của cây bút */
  slug: string;
  onClose: () => void;
  showToast: (msg: string) => void;
  /** Bình chọn xong → trang chủ nạp lại bảng cây bút */
  onChanged: () => void;
}) {
  const [amb, setAmb] = useState<AmbassadorDetail | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let alive = true;
    apiGet<{ ambassador: AmbassadorDetail }>(`/api/v1/ambassadors/${encodeURIComponent(slug)}`)
      .then((res) => alive && setAmb(res.ambassador))
      .catch(() => alive && setMissing(true));
    return () => {
      alive = false;
    };
  }, [slug]);

  const addr = amb ? wardAddress(amb.ward, amb.city) : "";

  return (
    <Modal onClose={onClose} title="Cây bút khu phố">
      {missing ? (
        <p className="py-8 text-center text-[14px] text-ink-soft">Không tìm thấy cây bút này.</p>
      ) : !amb ? (
        <div className="animate-pulse">
          <div className="h-8 w-2/3 rounded-lg bg-cream" />
          <div className="mt-4 h-[81px] w-full rounded-2xl bg-cream" />
          <div className="mt-3 h-[81px] w-full rounded-2xl bg-cream" />
        </div>
      ) : (
        <>
          <h3
            data-testid="amb-name"
            className="m-0 text-[22px] font-bold leading-tight tracking-[-0.02em] text-ink sm:text-[30px]"
          >
            {addr ? `${amb.display_name} - ${addr}` : amb.display_name}
          </h3>
          <p className="m-0 mt-2 text-[15px] tracking-[-0.02em] text-ink sm:text-[18px]">
            Cùng bình chọn cho cây bút khu phố bạn nhé
          </p>

          {amb.notes.length === 0 ? (
            <p className="m-0 mt-4 text-center font-light text-[13px] leading-snug text-ink-soft sm:text-[14px]">
              Cây bút này chưa có câu nào được duyệt — quay lại sau nhé 💛
            </p>
          ) : (
            <div className="mt-4 flex flex-col gap-3 pb-2">
              {amb.notes.map((n) => (
                <NoteCard key={n.id} note={n} showToast={showToast} onChanged={onChanged} />
              ))}
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
