"use client";
// Ô tra cứu "Xóm mình đã đạt chuẩn 4N chưa?" — email 18/8 yêu cầu chuyển từ cột phải
// (bảng xếp hạng) lên hero, đặt dưới KV khu phố; design vẽ thành thanh search pill lớn
// full-width + nút tròn cam bên phải.
import { useMemo, useRef, useState } from "react";
import type { MapNeighborhood } from "./types";
import { formatAddress } from "@/lib/address";
import { IconSearch } from "./ui";

/** Bỏ dấu để gõ "banco" vẫn ra "Bàn Cờ" */
function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase();
}

export default function HeroLookup({
  neighborhoods,
  placeholder,
  onPropose,
  onOpenNeighborhood,
}: {
  neighborhoods: MapNeighborhood[];
  placeholder: string;
  /** Không tìm thấy khu phố → mời đề xuất luôn */
  onPropose: () => void;
  /** Mở hồ sơ khu phố dạng POPUP (18/8) — trước đây rời trang sang /khu-pho/[slug] */
  onOpenNeighborhood: (slug: string) => void;
}) {
  const [text, setText] = useState("");
  const [picked, setPicked] = useState<MapNeighborhood | null>(null);
  const [open, setOpen] = useState(false);
  const blurTimer = useRef<number | null>(null);

  const matches = useMemo(() => {
    const needle = fold(text.trim());
    if (!needle) return [];
    return neighborhoods
      .filter((n) => fold(`${n.name} ${n.ward ?? ""} ${n.city ?? ""}`).includes(needle))
      .slice(0, 8);
  }, [neighborhoods, text]);

  const miss = !picked && text.trim().length > 1 && matches.length === 0;

  // .fig Frame 233: ô tra cứu 816×45 ở y=1140 (ngay dưới KV), viền cam 1.5px, KHÔNG bóng.
  return (
    <div className="relative mx-auto w-full max-w-[816px] px-4 pt-2 sm:px-0 sm:pt-0">
      <div className="flex h-[52px] items-center gap-2 rounded-full border-[1.5px] border-brick bg-white p-1.5 pl-5 shadow-kp sm:h-[45px] sm:shadow-none">
        <IconSearch className="ml-0.5 h-[19px] w-[19px] text-brick" />
        <input
          value={text}
          onChange={(e) => { setText(e.target.value); setPicked(null); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => { blurTimer.current = window.setTimeout(() => setOpen(false), 150); }}
          placeholder={placeholder}
          aria-label="Tra cứu khu phố đạt chuẩn 4N"
          role="combobox"
          aria-expanded={open}
          className="min-w-0 flex-1 border-0 bg-transparent py-3 text-[15px] text-ink outline-none placeholder:text-ink-soft/70"
        />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Tra cứu"
          className="grid h-11 w-11 flex-none cursor-pointer place-items-center rounded-full bg-brick text-xl font-bold text-white transition hover:bg-brick-dark sm:h-[30px] sm:w-[30px] sm:text-[18px]"
        >
          +
        </button>
      </div>

      {open && matches.length > 0 && (
        <div className="absolute inset-x-4 top-full z-20 mt-2 max-h-64 overflow-y-auto rounded-2xl border border-cream-dark bg-white py-1 shadow-kp sm:inset-x-0">
          {matches.map((n) => (
            <button
              key={n.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                if (blurTimer.current) window.clearTimeout(blurTimer.current);
                setPicked(n);
                setText(n.name);
                setOpen(false);
              }}
              className="block w-full cursor-pointer px-5 py-2.5 text-left text-[14px] hover:bg-cream"
            >
              {n.name}
              {n.certified_4n && " 🏅"}
              {(n.ward || n.city) && (
                <span className="block text-[12px] text-ink-soft">{formatAddress(n.ward, n.city)}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {picked && (
        <div
          className={`mt-3 flex flex-col items-center gap-2.5 rounded-2xl px-5 py-3.5 text-[14px] font-semibold sm:flex-row sm:justify-between sm:text-left ${
            picked.certified_4n
              ? "bg-status-signed-bg text-status-signed"
              : "bg-white text-brick-dark shadow-kp-s"
          }`}
        >
          <span className="text-center sm:text-left">
            {picked.certified_4n ? (
              <>
                {picked.name} đã chính thức trở thành “Khu phố biết thương” chuẩn 4N
                {picked.certified_at
                  ? ` từ ngày ${new Date(picked.certified_at).toLocaleDateString("vi-VN")}`
                  : ""}
                .
              </>
            ) : (
              <>{picked.name} còn thiếu biển để đạt chuẩn 4N. Hãy cùng góp thêm câu nhắc cho xóm mình!</>
            )}
          </span>
          {/* Hồ sơ khu phố mở POPUP ngay tại trang chủ, không rời trang nữa */}
          <button
            onClick={() => onOpenNeighborhood(picked.slug)}
            className="kp-btn kp-btn-primary tap flex-none px-5 py-2 text-sm"
          >
            Xem khu phố
          </button>
        </div>
      )}

      {miss && (
        <div className="mt-3 flex flex-col items-center gap-2.5 rounded-2xl bg-white px-5 py-3.5 text-center text-[14px] text-ink-soft shadow-kp-s sm:flex-row sm:justify-between sm:text-left">
          <span>
            Chưa tìm thấy “{text.trim()}” — khu phố này chưa tham gia.
          </span>
          <button onClick={onPropose} className="kp-btn kp-btn-primary tap flex-none px-5 py-2 text-sm">
            + Đề xuất góc phố mới
          </button>
        </div>
      )}
    </div>
  );
}
