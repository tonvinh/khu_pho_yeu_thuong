"use client";
// Mảnh UI dùng chung theo SKIN MỚI (docs/lp/*.png, 18/8):
// tiêu đề section IN HOA căn giữa, tab pill (đang chọn = khối cam đặc),
// modal GIỮA màn hình (thay drawer trượt phải của bản cũ), dải sọc cam.
import { useEffect } from "react";

/**
 * Icon line 16px dùng ở dòng meta (design vẽ icon nét cam, bản cũ dùng emoji nên
 * mỗi hệ điều hành ra một kiểu và màu không theo brand được).
 * `currentColor` để chỗ nào cần cam thì bọc `text-brick`.
 */
function Icon({ path, className = "" }: { path: React.ReactNode; className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`inline-block h-[15px] w-[15px] flex-none ${className}`}
    >
      {path}
    </svg>
  );
}

export const IconPin = (p: { className?: string }) => (
  <Icon
    {...p}
    path={
      <>
        <path d="M12 21s7-5.3 7-11a7 7 0 1 0-14 0c0 5.7 7 11 7 11Z" />
        <circle cx="12" cy="10" r="2.6" />
      </>
    }
  />
);

export const IconPencil = (p: { className?: string }) => (
  <Icon
    {...p}
    path={
      <>
        <path d="M4 20h4.5L20 8.5a2.1 2.1 0 0 0-3-3L5.5 17 4 20Z" />
        <path d="M14.5 6.5 17.5 9.5" />
      </>
    }
  />
);

export const IconUser = (p: { className?: string }) => (
  <Icon
    {...p}
    path={
      <>
        <circle cx="12" cy="8" r="3.6" />
        <path d="M4.8 20a7.2 7.2 0 0 1 14.4 0" />
      </>
    }
  />
);

export const IconHeart = (p: { className?: string }) => (
  <Icon
    {...p}
    path={<path d="M12 20s-7.5-4.7-7.5-9.5A4.2 4.2 0 0 1 12 7.6a4.2 4.2 0 0 1 7.5 2.9C19.5 15.3 12 20 12 20Z" />}
  />
);

export const IconHeartSolid = (p: { className?: string }) => (
  <svg
    aria-hidden
    viewBox="0 0 24 24"
    fill="currentColor"
    className={`inline-block h-[15px] w-[15px] flex-none ${p.className ?? ""}`}
  >
    <path d="M12 20.4S3.6 15.2 3.6 9.9a4.7 4.7 0 0 1 8.4-2.9 4.7 4.7 0 0 1 8.4 2.9c0 5.3-8.4 10.5-8.4 10.5Z" />
  </svg>
);

export const IconSearch = (p: { className?: string }) => (
  <Icon
    {...p}
    path={
      <>
        <circle cx="11" cy="11" r="6.4" />
        <path d="m15.8 15.8 4 4" />
      </>
    }
  />
);

/** Dải sọc chéo cam — viền trên/dưới card danh sách và mép dưới modal */
export function Stripe({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`kp-stripe ${className}`} />;
}

export function SectionHead({
  title,
  hint,
  /** Cột biển "Ngõ Xóm / Khu phố Biết Thương" bên trái tiêu đề (design khối đóng góp) */
  signpost = false,
}: {
  title: string;
  hint?: string;
  signpost?: boolean;
}) {
  return (
    <div className="relative mb-6 text-center">
      {signpost && (
        // "06 3" trong .fig: x=66 y=1368.5 w=216 h=378 (khổ 1440) — tức lệch trái 18px
        // so với khung nội dung (x=84) và thấp hơn mép trên tiêu đề 12px.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/brand/signpost.webp"
          alt=""
          aria-hidden
          className="pointer-events-none absolute -left-[18px] top-[12px] hidden w-[216px] lg:block"
        />
      )}
      {/* Frame 158: tiêu đề Bold 40px ls-2% IN HOA #3D3D3D, gap 8, hint Light 16px */}
      <h2 className="kp-h2 kp-sec-title m-0 text-[clamp(22px,4.4vw,40px)] tracking-[-0.02em] text-ink text-balance">{title}</h2>
      {hint && (
        <p className="m-0 mt-2 font-light text-[14px] leading-snug tracking-[-0.02em] text-ink sm:text-[16px] sm:leading-[24px]">{hint}</p>
      )}
    </div>
  );
}

/** Dãy pill lọc — đang chọn là khối cam đặc, số lượng nằm trong chấm tròn */
export function FilterTabs<K extends string>({
  tabs,
  active,
  onChange,
}: {
  /** `short` là nhãn rút gọn cho mobile (< 640px) để các tab nằm gọn một hàng */
  tabs: { key: K; label: string; short?: string; count: number }[];
  active: K;
  onChange: (key: K) => void;
}) {
  return (
    <div className="kp-scroll-x -mx-4 flex flex-nowrap justify-start gap-2 px-4 sm:mx-0 sm:flex-wrap sm:justify-center sm:gap-4 sm:overflow-visible sm:px-0">
      {tabs.map((t) => {
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            /* Tab: cao 39, r hết cỡ, gap 10 — đang chọn nền #FF8206 viền #E86305,
               tab thường viền #3D3D3D 1.5px (không phải viền kem) */
            className={`tap tap-sm-auto inline-flex h-[44px] flex-none cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-full border-[1.5px] px-4 text-[14px] transition sm:h-[39px] sm:px-5 sm:text-[16px] ${
              isActive
                ? "border-brick-dark bg-brick text-white shadow-kp-s"
                : "border-ink bg-transparent text-ink hover:border-brick hover:text-brick-dark"
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
            <span
              /* Chip số trong tab (.fig): tab thường = tròn đặc #3D3D3D chữ trắng,
                 tab đang chọn = tròn trắng chữ cam */
              className={`grid h-[22px] min-w-[22px] place-items-center rounded-full px-1 text-[11.5px] font-bold ${
                isActive ? "bg-white text-brick" : "bg-ink text-white"
              }`}
            >
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
      <span className="mb-1.5 block text-[13px] font-bold text-ink">{label}</span>
      {children}
    </label>
  );
}

/**
 * Modal giữa màn hình theo design mới: card trắng bo 24px, tiêu đề căn giữa,
 * nút × góc phải, nút ‹ góc trái khi có bước trước, dải sọc cam ló ra mép dưới.
 * z-50 để luôn nằm trên mọi lớp khác (modal định danh có thể mở chồng lên modal khác).
 * Trên mobile trượt lên từ đáy như bottom sheet.
 */
export function Modal({
  title,
  onClose,
  onBack,
  children,
  wide = false,
  topmost = false,
}: {
  title?: React.ReactNode;
  onClose: () => void;
  onBack?: () => void;
  children: React.ReactNode;
  wide?: boolean;
  /** Modal mở CHỒNG lên modal khác (định danh mở từ trong modal bình chọn/viết câu).
   *  Cùng z-index thì cái đứng SAU trong DOM đè lên trước — HomeShell render modal định
   *  danh trước nên bắt buộc phải nâng lớp, nếu không nó nằm dưới và người dùng tưởng
   *  bấm không ăn (đúng lỗi #16 của bản drawer cũ). */
  topmost?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className={`fixed inset-0 flex items-end justify-center bg-ink/45 backdrop-blur-[3px] sm:items-center sm:p-6 ${
        topmost ? "z-[60]" : "z-50"
      }`}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`slide-up relative w-full ${wide ? "sm:max-w-[720px]" : "sm:max-w-[620px]"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sọc cam ló dưới đáy modal (design) — ẩn trên mobile vì modal chạm mép dưới */}
        <Stripe className="absolute inset-x-6 -bottom-2 hidden rounded-b-xl sm:block" />
        <div className="kp-safe-b relative max-h-[90vh] overflow-y-auto rounded-t-3xl border border-brick/40 bg-white px-5 pt-4 shadow-kp sm:rounded-3xl sm:px-8 sm:pt-6">
          {/* Tay nắm kéo — gợi ý bottom sheet trên mobile */}
          <span aria-hidden className="mx-auto mb-3 block h-1 w-10 rounded-full bg-cream-dark sm:hidden" />
          <div className="relative mb-4 flex min-h-9 items-center justify-center">
            {onBack && (
              <button
                onClick={onBack}
                aria-label="Quay lại bước trước"
                className="absolute left-0 grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-cream-dark bg-white text-lg text-ink hover:border-brick hover:text-brick"
              >
                ‹
              </button>
            )}
            {title && (
              <h3 className="m-0 px-10 text-center font-display text-[19px] font-bold leading-tight sm:text-[21px]">
                {title}
              </h3>
            )}
            <button
              onClick={onClose}
              aria-label="Đóng"
              className="absolute right-0 grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-cream-dark bg-white text-base text-ink-soft hover:border-brick hover:text-brick"
            >
              ×
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
