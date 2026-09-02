"use client";
// Ô tra cứu "Xóm mình đã đạt chuẩn 4N chưa?" — email 18/8 yêu cầu chuyển từ cột phải
// (bảng xếp hạng) lên hero, đặt dưới KV khu phố; design vẽ thành thanh search pill lớn
// full-width + nút tròn cam bên phải.
import { useMemo, useRef, useState } from "react";
import type { MapNeighborhood } from "./types";
import { formatAddress } from "@/lib/address";
import { IconPin, IconSearch } from "./ui";

/** Pill "Đạt chuẩn 4N" — .fig: w≈140 h=35 r=88.9 nền #2323FF, icon vuesax tick-circle
 *  + chữ 14.2px trắng. Thay emoji 🏅 của bản 18/8. */
function Badge4N() {
  return (
    <span className="inline-flex h-[30px] flex-none items-center gap-1.5 rounded-full bg-accent-blue px-3 text-[12px] text-white sm:h-[35px] sm:px-4 sm:text-[14.2px]">
      <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 flex-none" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="9" />
        <path d="m8.5 12 2.4 2.4 4.6-4.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Đạt chuẩn 4N
    </span>
  );
}

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

  // .fig bản 2/9 vẽ RIÊNG ba trạng thái của dropdown Frame 261:
  //   (a) nhiều kết quả  → danh sách, mỗi dòng có pill "Đạt chuẩn 4N"
  //   (b) đúng 1 kết quả → hiện thẳng card kết quả, khỏi bắt bấm chọn
  //   (c) rỗng           → pin + "Chưa tìm thấy khu phố này" + nút đề xuất
  const typed = text.trim();
  const miss = !picked && typed.length > 1 && matches.length === 0;
  // Người dùng đã bấm chọn một khu, HOẶC gõ tới lúc chỉ còn đúng một khu khớp
  const single = picked ?? (typed.length > 1 && matches.length === 1 ? matches[0] : null);
  const showList = open && matches.length > 1 && !picked;

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

      {/* (a) .fig Frame 261 — panel r=16, mỗi dòng: tên 18px Bold + pin/phường 14px Light,
             bên phải là PILL xanh "Đạt chuẩn 4N" (bản 18/8 dùng emoji 🏅). */}
      {showList && (
        <div
          role="listbox"
          className="absolute inset-x-4 top-full z-20 mt-2 max-h-64 overflow-y-auto rounded-2xl border border-cream-dark bg-white py-1 shadow-kp sm:inset-x-0"
        >
          {matches.map((n) => (
            <button
              key={n.id}
              type="button"
              role="option"
              aria-selected={false}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                if (blurTimer.current) window.clearTimeout(blurTimer.current);
                setPicked(n);
                setText(n.name);
                setOpen(false);
              }}
              className="flex w-full cursor-pointer items-center gap-3 px-5 py-2.5 text-left hover:bg-cream"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-bold tracking-[-0.02em] sm:text-[18px]">
                  {n.name}
                </span>
                {(n.ward || n.city) && (
                  <span className="mt-0.5 flex items-center gap-1.5 font-light text-[12px] text-ink-soft sm:text-[14px]">
                    <IconPin className="text-brick" />
                    {formatAddress(n.ward, n.city)}
                  </span>
                )}
              </span>
              {n.certified_4n && <Badge4N />}
            </button>
          ))}
        </div>
      )}

      {/* (b) .fig Frame 274 (768×77 r=16 nền #FFF7EA) + Frame 263: dòng mời viết câu
             kèm nút "Xem khu phố" — hồ sơ khu phố mở POPUP, không rời trang. */}
      {single && (
        <div className="mt-3">
          <div
            data-testid="lookup-single"
            className="flex items-center gap-3 rounded-2xl bg-[#FFF7EA] px-5 py-3.5 sm:min-h-[77px]"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-bold tracking-[-0.02em] text-black sm:text-[18px]">
                {single.name}
              </span>
              {(single.ward || single.city) && (
                <span className="mt-0.5 flex items-center gap-1.5 font-light text-[12px] text-ink-soft sm:text-[14px]">
                  <IconPin className="text-brick" />
                  {formatAddress(single.ward, single.city)}
                </span>
              )}
            </span>
            {single.certified_4n && <Badge4N />}
          </div>
          <div className="mt-3 flex flex-col items-center gap-2.5 text-center sm:flex-row sm:justify-between sm:text-left">
            <span className="font-light text-[13px] text-ink sm:text-[14px]">
              {/* Design chỉ vẽ MỘT dòng cho trạng thái này, không phân biệt khu đã đạt
                  chuẩn 4N hay chưa. Giữ nguyên văn theo design (quyết định "design
                  thắng spec", docs/20 §2.1) — đã ghi vào danh sách hỏi lại Design. */}
              Khu phố mình chưa có nhiều lời nhắc, bạn viết câu đầu tiên nhé?
            </span>
            <button
              onClick={() => onOpenNeighborhood(single.slug)}
              className="kp-btn kp-btn-primary tap flex-none px-5 py-2 text-sm"
            >
              Xem khu phố
            </button>
          </div>
        </div>
      )}

      {/* (c) .fig panel h=72: pin + "Chưa tìm thấy khu phố này" 16px Light #969696,
             nút 212.3×40 r=100 viền #FF8206 1.5px. */}
      {miss && (
        <div
          data-testid="lookup-empty"
          className="mt-3 flex flex-col items-center gap-2.5 rounded-2xl bg-white px-5 py-3.5 text-center shadow-kp-s sm:h-[72px] sm:flex-row sm:justify-between sm:py-0 sm:text-left"
        >
          <span className="flex items-center gap-2 font-light text-[14px] text-ink-soft sm:text-[16px]">
            <IconPin className="text-brick" />
            Chưa tìm thấy khu phố này
          </span>
          <button
            onClick={onPropose}
            className="kp-btn kp-btn-primary tap flex-none px-5 py-2 text-sm sm:h-[40px] sm:w-[212px]"
          >
            + Đề xuất góc phố mới
          </button>
        </div>
      )}
    </div>
  );
}
