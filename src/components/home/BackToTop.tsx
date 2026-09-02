"use client";
// Nút "Lên đầu trang" — Figma bản 2/9 · B7 (khối MỚI, bản 18/8 chưa có).
// .fig Frame 259 (x=1313 y=642) và Frame 260 (x=1313 y=3556) là CÙNG một component
// đặt ở hai vị trí: icon tròn 55×55 nền cam + nhãn 12px Regular ls -2% #3D3D3D nằm
// dưới, cách 4px, cả khối rộng 89 và cách mép phải 1440−1402 = 38px.
// Trên web dựng thành nút NỔI (fixed) thay vì hai khối rời — cùng tác dụng mà không
// phải chèn hai chỗ vào luồng cuộn, và luôn với tới được.
import { useEffect, useState } from "react";

export default function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Chỉ hiện khi đã cuộn QUÁ một màn hình — dưới ngưỡng đó người dùng còn thấy
    // hero nên nút chỉ tổ che nội dung.
    const onScroll = () => setShow(window.scrollY > window.innerHeight);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!show) return null;

  const toTop = () => {
    // Tôn trọng prefers-reduced-motion như NeighborhoodSlider (QC 2/9 · C3):
    // cuộn mượt cả trang là chuyển động lớn, người bật giảm chuyển động không nên gặp.
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  };

  return (
    <button
      onClick={toTop}
      aria-label="Lên đầu trang"
      className="fixed bottom-6 right-4 z-40 flex w-[89px] cursor-pointer flex-col items-center gap-1 sm:right-[38px]"
    >
      <span className="grid h-[48px] w-[48px] place-items-center rounded-full bg-brick text-white shadow-kp transition hover:bg-brick-dark sm:h-[55px] sm:w-[55px]">
        <svg
          viewBox="0 0 24 24"
          aria-hidden
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 19V5" />
          <path d="m5 12 7-7 7 7" />
        </svg>
      </span>
      <span className="text-center text-[12px] leading-tight tracking-[-0.02em] text-ink">
        Lên đầu trang
      </span>
    </button>
  );
}
