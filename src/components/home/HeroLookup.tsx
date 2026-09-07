"use client";
// Ô tra cứu "Xóm mình đã đạt chuẩn 4N chưa?" — email 18/8 yêu cầu chuyển từ cột phải
// (bảng xếp hạng) lên hero, đặt dưới KV khu phố; design vẽ thành thanh search pill lớn
// full-width (KHÔNG có nút tròn cam bên phải — xem ghi chú ở phần render).
import { useMemo, useRef, useState } from "react";
import type { MapNeighborhood } from "./types";
import { wardAddress } from "@/lib/address";
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
  // Ruột là `Frame 135` (autolayout ngang, lề trong 16) chỉ có kính lúp 18px + placeholder
  // 16px Light #969696. Node `Button` (tròn cam 30×30, icon vuesax/linear/add) CÓ trong
  // component Searchbox nhưng instance ở frame landing `7458:39755` override
  // `visible=false` — dump.py không đọc override của INSTANCE nên bản 2/9 dựng nhầm nút "+".
  // Ảnh export `docs/lp/Landing page*.png` cũng không có nút này (QC 7/9).
  return (
    <div className="relative mx-auto w-full max-w-[816px] px-4 pt-2 sm:px-0 sm:pt-0">
      <div className="flex h-[52px] items-center gap-2 rounded-full border-[1.5px] border-brick bg-white px-4 shadow-kp sm:h-[45px] sm:shadow-none">
        <IconSearch className="h-[18px] w-[18px] flex-none text-brick" />
        <input
          value={text}
          onChange={(e) => { setText(e.target.value); setPicked(null); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => { blurTimer.current = window.setTimeout(() => setOpen(false), 150); }}
          placeholder={placeholder}
          aria-label="Tra cứu khu phố đạt chuẩn 4N"
          role="combobox"
          aria-expanded={open}
          className="min-w-0 flex-1 border-0 bg-transparent py-3 font-light text-[16px] text-ink outline-none placeholder:text-ink-soft"
        />
      </div>

      {/* (a) .fig Frame 261 — panel r=16, mỗi dòng: tên 18px Bold + pin/phường 14px Light,
             bên phải là PILL xanh "Đạt chuẩn 4N" (bản 18/8 dùng emoji 🏅). */}
      {showList && (
        <div
          role="listbox"
          className="kp-lookup-panel max-h-64 overflow-y-auto py-2 sm:py-3"
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
              className="flex w-full cursor-pointer items-center gap-3 px-5 py-2.5 text-left hover:bg-cream sm:px-6"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-bold tracking-[-0.02em] sm:text-[18px]">
                  {n.name}
                </span>
                {(n.ward || n.city) && (
                  <span className="mt-0.5 flex items-center gap-1.5 font-light text-[12px] text-ink-soft sm:text-[14px]">
                    <IconPin className="text-brick" />
                    {wardAddress(n.ward, n.city)}
                  </span>
                )}
              </span>
              {n.certified_4n && <Badge4N />}
            </button>
          ))}
        </div>
      )}

      {/* (b) .fig 7458:38738 — panel `Frame 261` 816×184 r=16 nền trắng (DROPDOWN nổi,
             không đẩy nội dung), lề trong 24 · card `Frame 274` 768×77 r=16 nền #FFF7EA ·
             gap 24 · hàng `Frame 263` cao 35: chữ CAM Bold 16 + nút 140×35 viền cam. */}
      {single && (
        <div className="kp-lookup-panel p-4 sm:p-6">
          <div
            data-testid="lookup-single"
            className="flex items-center gap-3 rounded-2xl bg-[#FFF7EA] px-4 py-3 sm:h-[77px] sm:py-0"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-bold tracking-[-0.02em] text-black sm:text-[18px]">
                {single.name}
              </span>
              {(single.ward || single.city) && (
                <span className="mt-1 flex items-center gap-2 font-light text-[12px] text-ink-soft sm:text-[14px]">
                  <IconPin className="text-brick" />
                  {wardAddress(single.ward, single.city)}
                </span>
              )}
            </span>
            {single.certified_4n && <Badge4N />}
          </div>
          <div className="mt-4 flex flex-col items-center gap-3 text-center sm:mt-6 sm:h-[35px] sm:flex-row sm:justify-between sm:gap-4 sm:text-left">
            <span className="font-bold text-[14px] text-brick sm:text-[16px]">
              {/* Design chỉ vẽ MỘT dòng cho ô này. Chốt 4/9: khu ĐÃ CÓ lời nhắc thì
                  câu "viết câu đầu tiên" sai (khu đạt chuẩn 4N vẫn đọc thấy) → tách
                  hai câu theo `notes_count` (số câu đã duyệt của khu). */}
              {single.notes_count > 0
                ? "Hãy cùng góp thêm lời nhắc cho khu phố nhé!"
                : "Khu phố mình chưa có lời nhắc, bạn viết câu đầu tiên nhé?"}
            </span>
            <button
              onClick={() => onOpenNeighborhood(single.slug)}
              className="kp-btn kp-btn-primary kp-btn-row h-11 flex-none px-5 sm:h-[35px] sm:w-[140px] sm:px-0"
            >
              Xem khu phố
            </button>
          </div>
        </div>
      )}

      {/* (c) .fig 7745:1345 — cùng panel `Frame 261` nhưng h=72: pin + "Chưa tìm thấy
             khu phố này" 16px Light #969696 (x=344 ⇒ lề trong 32) và nút 212.3×40 r=100
             viền #FF8206 1.5px sát lề phải 24. */}
      {miss && (
        <div
          data-testid="lookup-empty"
          className="kp-lookup-panel flex flex-col items-center gap-3 px-5 py-4 text-center sm:h-[72px] sm:flex-row sm:justify-between sm:gap-4 sm:py-0 sm:pl-8 sm:pr-6 sm:text-left"
        >
          <span className="flex items-center gap-2 font-light text-[14px] text-ink-soft sm:text-[16px]">
            <IconPin className="text-brick" />
            Chưa tìm thấy khu phố này
          </span>
          <button
            onClick={onPropose}
            className="kp-btn kp-btn-primary kp-btn-row h-11 flex-none px-5 sm:h-[40px] sm:w-[212px] sm:px-0"
          >
            + Đề xuất góc phố mới
          </button>
        </div>
      )}
    </div>
  );
}
