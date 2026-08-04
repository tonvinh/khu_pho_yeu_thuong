"use client";
// Mảnh UI dùng chung theo prototype v4: eyebrow pill, đầu section, drawer trượt phải,
// field có nhãn, biển treo minh hoạ
import { useEffect } from "react";

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <span className="kp-kicker self-start">{children}</span>;
}

export function SectionHead({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <h2 className="m-0 font-display text-[21px] font-extrabold leading-tight text-balance sm:text-2xl">
        {title}
      </h2>
      {hint && <span className="text-[13px] leading-snug text-ink-soft sm:text-[13.5px]">{hint}</span>}
    </div>
  );
}

/** Dãy pill lọc danh sách (Mới nhất · Chờ bạn bình chọn · …) — dùng chung cho
 *  danh sách góc phố và block lời nhắc, kèm số lượng từng mục */
export function FilterTabs<K extends string>({
  tabs,
  active,
  onChange,
}: {
  /** `short` là nhãn rút gọn dùng riêng cho mobile (< 640px) để 3 tab nằm gọn
   *  một hàng; màn rộng vẫn hiện nhãn đầy đủ. */
  tabs: { key: K; label: string; short?: string; count: number }[];
  active: K;
  onChange: (key: K) => void;
}) {
  // Mobile: một hàng cuộn ngang tràn mép màn hình (không xuống dòng lởm chởm);
  // từ sm trở lên xếp bình thường và tự xuống dòng.
  return (
    <div className="kp-scroll-x -mx-4 flex flex-nowrap gap-1.5 px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
      {tabs.map((t) => {
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={`tap inline-flex flex-none cursor-pointer items-center whitespace-nowrap rounded-full border px-3 text-[13px] font-semibold transition sm:px-3.5 sm:text-[12.5px] ${
              isActive
                ? "border-brick bg-brick text-white shadow-kp-s"
                : "border-cream-dark bg-white text-ink-soft hover:border-brick/35 hover:text-brick-dark"
            }`}
          >
            {t.short ? (
              <>
                <span className="sm:hidden">{t.short}</span>
                <span className="hidden sm:inline">{t.label}</span>
              </>
            ) : (
              t.label
            )}
            <span className={`ml-1.5 text-[11px] ${isActive ? "text-white/80" : "text-ink-soft/70"}`}>
              {t.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[12.5px] font-semibold text-ink-soft">{label}</span>
      {children}
    </label>
  );
}

/** Drawer trượt từ phải theo prototype (.scrim + .drawer), Esc để đóng */
export function Drawer({
  icon,
  title,
  sub,
  onClose,
  children,
  wide = false,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  sub?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  /** Bản rộng cho form dài (VD: đề xuất góc phố) */
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40">
      <div className="kp-scrim absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        className={`kp-drawer absolute right-0 top-0 flex h-full w-full flex-col bg-cream shadow-[-12px_0_40px_rgba(40,25,10,0.2)] ${
          wide ? "max-w-[600px]" : "max-w-[440px]"
        }`}
      >
        <div className="flex items-start gap-3 border-b border-cream-dark px-4 py-3.5 sm:px-5 sm:py-[18px]">
          {icon && (
            <div className="grid h-10 w-10 flex-none place-items-center rounded-[11px] bg-[#F3ECE0] text-[20px] sm:h-11 sm:w-11 sm:text-[22px]">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="m-0 font-display text-[17.5px] font-bold leading-tight sm:text-[19px]">{title}</h3>
            {sub && <div className="text-[12.5px] leading-snug text-ink-soft sm:text-[13px]">{sub}</div>}
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="tap ml-auto w-11 flex-none cursor-pointer rounded-[10px] border border-cream-dark bg-white text-[17px] text-ink-soft hover:text-brick sm:w-[38px]"
          >
            ×
          </button>
        </div>
        <div className="kp-safe-b flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-[18px]">{children}</div>
      </aside>
    </div>
  );
}

/** Biển treo minh hoạ (prototype .donebox .sign) — có móc treo, nghiêng nhẹ,
 *  lời nhắc đã duyệt có hình thì hiện hình ngay trong biển; truyền onVote để
 *  hiện nút bình chọn dưới dòng tác giả (đã bình chọn thì chip chỉ hiển thị) */
export function HangSign({
  quote,
  by,
  spot,
  imageUrl,
  tilt = -1.5,
  voted,
  onVote,
}: {
  quote: string;
  by?: string;
  spot?: string;
  imageUrl?: string | null;
  tilt?: number;
  voted?: boolean;
  onVote?: () => void;
}) {
  return (
    <figure className="m-0 flex w-full flex-col items-center gap-1.5 text-center sm:gap-2">
      <span aria-hidden className="flex flex-col items-center">
        <span className="h-1.5 w-1.5 rounded-full bg-[#b9a888]" />
        <span className="h-3 w-[2px] bg-[#b9a888]" />
      </span>
      <blockquote
        className="m-0 w-full rounded-xl border-[1.5px] border-olive bg-white px-4 py-3 font-display text-[15.5px] font-semibold leading-snug text-balance shadow-kp-s sm:px-[18px] sm:py-[13px] sm:text-[17px]"
        style={{ transform: `rotate(${tilt}deg)` }}
      >
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            loading="lazy"
            className="mb-2.5 h-28 w-full rounded-lg object-cover sm:h-32"
          />
        )}
        {quote}
      </blockquote>
      {(by || spot) && (
        <figcaption className="text-xs text-ink-soft">
          — {by}
          {spot && ` · ${spot}`}
        </figcaption>
      )}
      {onVote &&
        (voted ? (
          <span className="inline-flex cursor-default items-center gap-1 rounded-full border border-brick/25 bg-brick-light px-3.5 py-2 text-[12px] font-semibold text-brick-dark">
            🧡 Đã bình chọn
          </span>
        ) : (
          <button
            type="button"
            onClick={onVote}
            className="tap inline-flex cursor-pointer items-center gap-1 rounded-full border border-brick/35 bg-white px-5 text-[12.5px] font-semibold text-brick-dark transition hover:bg-brick-light"
          >
            🧡 Bình chọn
          </button>
        ))}
    </figure>
  );
}
