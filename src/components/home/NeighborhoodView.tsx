"use client";
// Hồ sơ khu phố — dùng CHUNG hai nơi:
//   · popup `NeighborhoodModal` mở từ ô tra cứu 4N / slider khu phố tiêu biểu (mặc định)
//   · trang share `/khu-pho/[slug]` (link chia sẻ ra ngoài, cần OG nên vẫn là trang thật)
//
// Figma bản 2/9 · B9 (frame MỚI 7756:2954) đổi hẳn ruột: bỏ tiến độ 4N, dải 3 con số
// và lưới biển SignCard của bản 18/8, thay bằng DANH SÁCH CÂU NHẮC — mỗi thẻ 636×73
// r=16 viền #3D3D3D 1.5px gồm nội dung câu + pill trạng thái + tên người viết + nút
// Bình chọn 119×35 viền #2323FF.
//
// Quyết định Q5 (2/9): đổi theo design mới cho cả hai chỗ, NHƯNG trang share giữ lại
// khối ảnh + badge 4N (prop `hero`) — nội dung chứng nhận là lý do tồn tại của trang
// đó (docs/02 §6, §11) và ảnh OG dựng theo nó.
import { useState } from "react";
import type { NeighborhoodDetail, NeighborhoodNote } from "./types";
import { wardAddress } from "@/lib/address";
import { apiSend } from "../client-api";
import { IconHeartSolid, IconPin, IconUser } from "./ui";

/** Pill trạng thái câu nhắc — .fig: h=25 r=6, 14px Regular, ba cặp màu cố định */
const STATUS_PILL: Record<NeighborhoodNote["status"], { label: string; cls: string }> = {
  approved: { label: "Đang chờ bạn bình chọn", cls: "bg-[#D7F3FF] text-[#2323FF]" },
  selected: { label: "Chờ treo biển", cls: "bg-[#FFF5E4] text-[#FF8206]" },
  produced: { label: "Chờ treo biển", cls: "bg-[#FFF5E4] text-[#FF8206]" },
  installed: { label: "Đã lên biển", cls: "bg-[#F0FFC8] text-[#5ED400]" },
};

function NoteCard({ note }: { note: NeighborhoodNote }) {
  const [votes, setVotes] = useState(note.votes);
  const [voted, setVoted] = useState(note.voted);
  const [busy, setBusy] = useState(false);
  const pill = STATUS_PILL[note.status];

  // Câu đã lên biển thì hết vòng bình chọn; câu của mình không được tự thương
  // (quy tắc cứng 3). Đã bình chọn thì khoá — không rút phiếu (Q6).
  const canVote = !note.is_mine && note.status !== "installed";

  const vote = async () => {
    if (voted || busy) return;
    setBusy(true);
    setVoted(true);
    setVotes((n) => n + 1);
    try {
      await apiSend("POST", `/api/v1/suggestions/${note.id}/vote`);
    } catch {
      setVoted(false);
      setVotes(note.votes);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      data-note
      className="flex flex-col gap-2.5 rounded-2xl border-[1.5px] border-ink px-4 py-3 sm:flex-row sm:items-center sm:gap-4"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[15px] leading-snug tracking-[-0.02em] text-ink sm:text-[18px]">
            {note.content}
          </span>
          <span className={`inline-flex h-[25px] flex-none items-center rounded-md px-2 text-[13px] sm:text-[14px] ${pill.cls}`}>
            {pill.label}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-1.5 font-light text-[13px] text-ink-soft sm:text-[14px]">
          <IconUser className="text-brick" />
          {note.author_name}
          {votes > 0 && <span className="ml-2">· {votes.toLocaleString("vi-VN")} lượt thương</span>}
        </div>
      </div>
      {canVote && (
        <button
          onClick={vote}
          disabled={voted}
          aria-label={voted ? "Đã bình chọn" : `Bình chọn câu của ${note.author_name}`}
          className={`kp-btn kp-btn-vote tap tap-sm-auto h-[44px] flex-none px-5 text-[13.5px] sm:h-[35px] sm:w-[119px] sm:text-[14px] ${
            voted ? "cursor-default opacity-70" : ""
          }`}
        >
          {voted ? "Đã bình chọn" : "Bình chọn"}
        </button>
      )}
    </div>
  );
}

export default function NeighborhoodView({
  nb,
  footer,
  hero = false,
}: {
  nb: NeighborhoodDetail;
  /** Hàng nút ở đáy — popup và trang share có CTA khác nhau */
  footer?: React.ReactNode;
  /** Dựng thêm khối ảnh + badge 4N — chỉ trang share bật (quyết định Q5) */
  hero?: boolean;
}) {
  const photos = [
    ...(nb.certified_4n && nb.certificate_url ? [nb.certificate_url] : []),
    ...nb.photo_urls,
    ...(nb.photo_urls.length === 0 && nb.map_url ? [nb.map_url] : []),
  ];
  const [shot, setShot] = useState(0);
  const photo = photos[Math.min(shot, photos.length - 1)] ?? null;
  const addr = wardAddress(nb.ward, nb.city);

  return (
    <div>
      {/* ===== Khối ảnh + badge 4N — CHỈ trang share (Q5) ===== */}
      {hero && (
        <div className="relative mb-5">
          <div className="relative aspect-[840/430] overflow-hidden rounded-[24px] border-[1.5px] border-cream-dark bg-cream p-2">
            <div className="relative h-full w-full overflow-hidden rounded-[18px]">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photo}
                  alt={`Khu phố ${nb.name}`}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-[#FFE9D2] to-[#FFD3A6] px-6 text-center">
                  <p className="m-0 font-display text-[15px] font-bold text-brick-dark sm:text-[18px]">
                    Khu phố chưa có ảnh — hình xóm mình sắp lên đây thôi!
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Badge nghiêng -2° nhô ra góc trái trên (Frame 142 của design) */}
          {nb.certified_4n && (
            <span className="absolute -top-3 left-3 z-10 inline-flex h-[38px] -rotate-2 items-center gap-1.5 rounded-full border-[3px] border-accent-blue-light bg-accent-blue px-4 font-display text-[12px] font-bold uppercase tracking-[-0.02em] text-white shadow-kp-s sm:text-[13px]">
              <IconHeartSolid className="h-[13px] w-[13px]" />
              Đạt chuẩn 4N
            </span>
          )}

          {photos.length > 1 && (
            <div className="mt-3 flex justify-center gap-2">
              {photos.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setShot(i)}
                  aria-label={`Ảnh ${i + 1}`}
                  aria-current={i === shot}
                  className={`h-2.5 cursor-pointer rounded-full transition-all ${
                    i === shot ? "w-6 bg-brick" : "w-2.5 bg-cream-dark hover:bg-brick/40"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== Đầu khối: tên 30px Bold · pin địa chỉ 14px Light · dòng mời 16px Bold ===== */}
      <h3 className="m-0 text-[22px] font-bold leading-tight tracking-[-0.02em] text-ink sm:text-[30px]">
        {nb.name}
      </h3>
      {addr && (
        <div
          data-testid="nb-address"
          className="mt-1 flex items-center gap-1.5 font-light text-[13px] text-ink-soft sm:text-[14px]"
        >
          <IconPin className="text-brick" />
          {addr}
        </div>
      )}
      <p className="m-0 mt-3 text-[15px] font-bold tracking-[-0.02em] text-ink sm:text-[16px]">
        Cùng tham gia viết bình chọn câu nhắc cho khu phố bạn nhé!
      </p>

      {/* ===== Danh sách câu nhắc — .fig Frame 272, gap 12 ===== */}
      {nb.notes.length === 0 ? (
        <p className="m-0 mt-4 text-center font-light text-[13px] leading-snug text-ink-soft sm:text-[14px]">
          Chưa có câu nhắc nào được duyệt ở đây — lời nhắc đầu tiên có thể là của bạn 💛
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {nb.notes.map((n) => (
            <NoteCard key={n.id} note={n} />
          ))}
        </div>
      )}

      {/* CTA đáy — .fig Button 02: 636×50 r=100 viền #FF8206 1.5px */}
      {footer && <div className="mt-5 flex justify-center pb-2">{footer}</div>}
    </div>
  );
}
