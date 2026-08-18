"use client";
// Khối "Khu phố tiêu biểu" trong hero — skin mới (docs/lp/lp1.png) + email review 18/8:
//  · CHỈ hiện khu phố đã đạt chuẩn 4N ("đây chỉ là chỗ vinh danh")
//  · BỎ hàng chip chọn phường, BỎ bộ đếm ảnh "2/5", BỎ nút đề xuất góc phố
//  · Địa chỉ dồn 1 dòng, đưa lên thành pill nổi góc phải trên ảnh
// Mỗi khu phố hiển thị ĐÚNG MỘT ảnh — ảnh vị trí #1 trong neighborhood_photos (quyết định
// F14: vẫn giữ nguyên dữ liệu 4 ảnh/khu ở admin, trang chủ chỉ lấy ảnh đầu). Mũi tên &
// auto-slide 4s do đó chuyển thẳng sang KHU KẾ, không lật ảnh trong cùng một khu.
//
// TRƯỢT NGANG (18/8): track flex dịch bằng translateX. Để vòng lặp không bị "quét ngược"
// khi từ khu cuối về khu đầu, track được kẹp thêm bản sao khu cuối ở đầu và khu đầu ở cuối;
// trượt tới clone xong thì TẮT transition, nhảy về slide thật rồi bật lại (double rAF).
// Cú nhảy đó hẹn bằng SETTIMEOUT chứ không nghe `transitionend`: tab đang ẩn hoặc máy bật
// "giảm chuyển động" thì transition không chạy, sự kiện không bắn, index sẽ trôi ra ngoài
// dãy slide và khung ảnh trắng trơn.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MapData, MapNeighborhood } from "./types";
import { shortAddress } from "@/lib/address";
import { IconPin } from "./ui";

/** Thời lượng một cú trượt (ms) — dùng chung cho transition và hẹn giờ nhảy qua clone */
const SLIDE_MS = 450;

export default function NeighborhoodSlider({ map }: { map: MapData }) {
  // Chỉ khu ĐÃ ĐẠT CHUẨN 4N; is_featured chỉ còn dùng để ưu tiên thứ tự
  // (server đã ORDER BY featured_position, name).
  const list = useMemo(
    () => map.neighborhoods.filter((n) => n.certified_4n),
    [map.neighborhoods]
  );
  const len = list.length;
  const multiple = len > 1;

  // index logic: -1 và len là hai slide clone (chỉ tồn tại trong lúc trượt)
  const [index, setIndex] = useState(0);
  const [animate, setAnimate] = useState(true);

  // Đang ở clone (index ngoài [0, len-1]) thì bỏ qua cú bấm mới — chờ nhảy về slide thật
  // đã, nếu không bấm dồn sẽ đẩy index ra ngoài dãy slide.
  const step = useCallback(
    (d: 1 | -1) => multiple && setIndex((i) => (i < 0 || i >= len ? i : i + d)),
    [multiple, len]
  );
  const prev = useCallback(() => step(-1), [step]);
  const next = useCallback(() => step(1), [step]);

  // Trượt hết sang clone → tắt transition, nhảy sang slide thật tương ứng
  useEffect(() => {
    if (index >= 0 && index < len) return;
    const t = setTimeout(() => {
      setAnimate(false);
      setIndex((i) => ((i % len) + len) % len);
    }, SLIDE_MS + 20);
    return () => clearTimeout(t);
  }, [index, len]);

  // Bật lại transition SAU khi trình duyệt đã vẽ xong vị trí vừa nhảy (2 khung hình),
  // nếu không cú nhảy đó cũng bị animate và người dùng thấy ảnh quét ngược.
  useEffect(() => {
    if (animate) return;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setAnimate(true));
    });
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); };
  }, [animate]);

  // Tự trượt 4s; người dùng bấm tay thì index đổi → hẹn giờ tính lại từ đầu
  useEffect(() => {
    if (!multiple) return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") next();
    }, 4000);
    return () => clearInterval(t);
  }, [next, index, multiple]);

  // Vuốt ngang trên mobile (ngưỡng 40px, bỏ qua nếu vuốt dọc để không chặn cuộn trang)
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touch.current;
    touch.current = null;
    if (!start) return;
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
    dx < 0 ? next() : prev();
  };

  // Slide thật + 2 clone hai đầu (chỉ khi có nhiều hơn 1 khu)
  const slides = multiple ? [list[len - 1], ...list, list[0]] : list;
  const offset = multiple ? index + 1 : 0;

  return (
    <div className="relative mx-auto mt-8 w-full max-w-[920px] px-10 sm:mt-8 sm:px-10">
      {/* Badge xanh dương nhô ra góc trái trên — Frame 142: 213×55, r hết cỡ, #2323FF,
          viền #DBE9FF 3.3px, chữ Bold 18px, NGHIÊNG -2° (đo trên lp1.png: mép trên đi
          từ y=289 ở x=300 xuống y=281 ở x=470). Hộp chưa xoay đặt ở (284.7, 281.7)
          khổ 1440 → cách mép trái khối slider 24px, cách mép trên khung ảnh 11px. */}
      <span className="absolute -top-[10px] left-2 z-10 grid h-[44px] -rotate-2 place-items-center rounded-full border-[3.3px] border-accent-blue-light bg-accent-blue px-5 font-display text-[13px] font-bold uppercase tracking-[-0.02em] text-white shadow-kp sm:-top-[11px] sm:left-[24.7px] sm:h-[55px] sm:w-[213px] sm:px-0 sm:text-[18px] sm:shadow-none">
        Khu phố tiêu biểu
      </span>

      {/* Frame 136 (khung r=40, nền TRẮNG 50% + viền trắng 1.5px — không phải trắng đặc,
          đo trên lp1.png: #FFDCBD trên nền #FFB97C) bọc Frame 137 (ảnh r=28), chèn 14px */}
      <div className="relative aspect-[840/430] overflow-hidden rounded-[28px] border-[1.5px] border-white bg-white/50 p-2 sm:rounded-[40px] sm:p-[12.5px]">
        <div
          className="relative h-full w-full overflow-hidden rounded-[20px] sm:rounded-[28px]"
          onTouchStart={multiple ? onTouchStart : undefined}
          onTouchEnd={multiple ? onTouchEnd : undefined}
        >
          {slides.length === 0 ? (
            <PhotoPlaceholder />
          ) : (
            <div
              className="flex h-full w-full motion-reduce:transition-none"
              style={{
                transform: `translate3d(-${offset * 100}%, 0, 0)`,
                transition: animate ? `transform ${SLIDE_MS}ms cubic-bezier(0.4, 0, 0.2, 1)` : undefined,
              }}
            >
              {slides.map((n, i) => (
                <Slide key={`${n.id}-${i}`} nb={n} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mũi tên nằm NGOÀI ảnh: Button 40×40 ở (280…320, 502…542) và (1160…1200, …)
          khổ 1440 → tâm đúng mép khối slider, nền trắng 50%, chevron cam #FF8206 */}
      {multiple && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Khu phố trước"
            className="absolute left-0 top-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-white/50 text-brick transition hover:bg-white/70 sm:top-[53.2%]"
          >
            <IconChevron className="rotate-180" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Khu phố sau"
            className="absolute right-0 top-1/2 grid h-10 w-10 translate-x-1/2 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-white/50 text-brick transition hover:bg-white/70 sm:top-[53.2%]"
          >
            <IconChevron />
          </button>
        </>
      )}
    </div>
  );
}

/** Một khu phố = 1 ảnh (ảnh #1, chưa upload thì dùng bản đồ cách điệu) + pill địa chỉ */
function Slide({ nb }: { nb: MapNeighborhood }) {
  const photo = nb.photo_urls[0] ?? nb.map_url ?? null;
  const addr = shortAddress(nb.ward, nb.city, nb.name);
  return (
    <div className="relative h-full w-full flex-none">
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo}
          alt={`Khu phố ${nb.name}`}
          draggable={false}
          className="absolute inset-0 h-full w-full select-none object-cover"
        />
      ) : (
        <PhotoPlaceholder />
      )}

      {/* Địa chỉ dồn 1 dòng — pill nổi góc phải trên (thay dòng địa chỉ dưới ảnh) */}
      <span className="absolute right-2.5 top-2.5 flex max-w-[75%] items-center gap-2 rounded-full border-[2.7px] border-white bg-brick px-3 py-1.5 text-white shadow-kp-s sm:right-3 sm:top-2.5 sm:h-[45px] sm:px-4 sm:py-0">
        <span aria-hidden className="grid h-6 w-6 flex-none place-items-center rounded-full bg-white/25">
          <IconPin />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-bold leading-tight sm:text-[14.4px]">
            {nb.name}
          </span>
          {addr && (
            <span className="block truncate text-[10.5px] leading-tight opacity-90 sm:text-[12px]">
              {addr}
            </span>
          )}
        </span>
      </span>
    </div>
  );
}

/** Chưa có khu phố nào đạt chuẩn 4N (đầu chiến dịch) → giữ khung, báo "sắp có" */
function PhotoPlaceholder() {
  return (
    <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-[#FFE9D2] to-[#FFD3A6] px-6 text-center">
      <div>
        <div className="font-display text-[19px] font-bold text-brick-dark sm:text-[23px]">
          Khu phố đạt chuẩn 4N đầu tiên sắp lộ diện
        </div>
        <p className="m-0 mt-1.5 text-[13px] text-ink-soft sm:text-[14px]">
          Cùng góp lời nhắc để xóm mình được vinh danh ở đây nhé!
        </p>
      </div>
    </div>
  );
}

/** Chevron cam của nút chuyển khu (vuesax/linear/arrow-right trong .fig) */
function IconChevron({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 14 22"
      aria-hidden
      className={`h-[21px] w-[13px] ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 1.5 11.5 11l-9 9.5" />
    </svg>
  );
}
