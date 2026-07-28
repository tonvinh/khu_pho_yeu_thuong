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
      <h2 className="m-0 font-display text-2xl font-extrabold leading-tight">{title}</h2>
      {hint && <span className="text-[13.5px] text-ink-soft">{hint}</span>}
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
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  sub?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
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
        className="kp-drawer absolute right-0 top-0 flex h-full w-full max-w-[440px] flex-col bg-cream shadow-[-12px_0_40px_rgba(40,25,10,0.2)]"
      >
        <div className="flex items-start gap-3 border-b border-cream-dark px-5 py-[18px]">
          {icon && (
            <div className="grid h-11 w-11 flex-none place-items-center rounded-[11px] bg-[#F3ECE0] text-[22px]">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="m-0 font-display text-[19px] font-bold leading-tight">{title}</h3>
            {sub && <div className="text-[13px] text-ink-soft">{sub}</div>}
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="tap ml-auto w-[38px] flex-none cursor-pointer rounded-[10px] border border-cream-dark bg-white text-[17px] text-ink-soft hover:text-brick"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-[18px]">{children}</div>
      </aside>
    </div>
  );
}

/** Biển treo minh hoạ (prototype .donebox .sign) — có móc treo, nghiêng nhẹ */
export function HangSign({
  quote,
  by,
  spot,
  tilt = -1.5,
}: {
  quote: string;
  by?: string;
  spot?: string;
  tilt?: number;
}) {
  return (
    <figure className="m-0 flex flex-col items-center gap-2 text-center">
      <span aria-hidden className="flex flex-col items-center">
        <span className="h-1.5 w-1.5 rounded-full bg-[#b9a888]" />
        <span className="h-3 w-[2px] bg-[#b9a888]" />
      </span>
      <blockquote
        className="m-0 rounded-xl border-[1.5px] border-olive bg-white px-[18px] py-[13px] font-display text-[17px] font-semibold leading-snug shadow-kp-s"
        style={{ transform: `rotate(${tilt}deg)` }}
      >
        {quote}
      </blockquote>
      {(by || spot) && (
        <figcaption className="text-xs text-ink-soft">
          — {by}
          {spot && ` · ${spot}`}
        </figcaption>
      )}
    </figure>
  );
}
