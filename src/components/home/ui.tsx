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

export const IconCheck = (p: { className?: string }) => (
  <Icon {...p} path={<path d="m5 12.5 4.5 4.5L19 7.5" />} />
);

export const IconChevronDown = (p: { className?: string }) => (
  <Icon {...p} path={<path d="m6 9.5 6 6 6-6" />} />
);

export const IconClose = (p: { className?: string }) => (
  <Icon {...p} path={<path d="M7 7l10 10M17 7 7 17" />} />
);

export const IconArrowLeft = (p: { className?: string }) => (
  <Icon {...p} path={<path d="M13.5 7.5 9 12l4.5 4.5" />} />
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
    /* Mobile: cuộn ngang nhưng VẪN chừa lề 16px — bản cũ dùng -mx-4 nên tab đầu
       chạm sát mép màn hình (quy chuẩn mobile 2/9: không phần tử nào chạm mép). */
    <div className="kp-scroll-x flex flex-nowrap justify-start gap-2 px-4 sm:flex-wrap sm:justify-center sm:gap-4 sm:overflow-visible sm:px-0">
      {tabs.map((t) => {
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            /* Tab: cao 39, r hết cỡ, gap 10 — đang chọn nền #FF8206 viền #E86305,
               tab thường viền #3D3D3D 1.5px (không phải viền kem).
               Lề trong LỆCH theo design: trái 20, PHẢI 8 — chip số gần như chạm mép
               phải (đo trên `docs/lp/Landing page.png`: mép chip → mép pill = 7.5px,
               trong khi chữ cách mép trái 20px). Lề đều 20/20 làm chip trôi vào giữa. */
            className={`tap tap-sm-auto inline-flex h-[44px] flex-none cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-full border-[1.5px] pl-4 pr-2 text-[14px] transition sm:h-[39px] sm:pl-5 sm:text-[16px] ${
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
                 tab đang chọn = tròn trắng chữ cam. Ø24 (đo trên ảnh export: 24.5),
                 chữ 13px — bản cũ Ø22/11.5px nên chip nhỏ hơn design thấy rõ. */
              className={`grid h-[24px] min-w-[24px] place-items-center rounded-full px-1 text-[13px] font-bold leading-none ${
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
  size = "md",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  /** `lg` = nhãn 16px Bold, cách ô 8px — cỡ của 4 popup trong .fig (Frame 190).
   *  `md` = nhãn 14px, dùng cho khối ưu đãi (nhãn 16px nhưng khối chật hơn). */
  size?: "md" | "lg";
}) {
  return (
    <label className={`block ${className}`}>
      <span
        className={`block font-bold text-ink ${
          size === "lg" ? "mb-2 text-[15px] sm:text-[16px]" : "mb-1.5 text-[14px] sm:text-[16px]"
        }`}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

/* ── Khoá cuộn trang nền khi có modal (QC 2/9 · C2) ──────────────────────────
   Đếm số modal đang mở: modal định danh mở CHỒNG lên modal viết câu/bình chọn,
   đóng cái trên mà nhả khoá ngay thì trang nền cuộn được trong khi vẫn còn popup.
   Vị trí cuộn lưu một lần lúc modal ĐẦU TIÊN mở và trả lại lúc modal CUỐI đóng. */
let lockCount = 0;
let lockedAt = 0;

function lockScroll() {
  if (lockCount++ > 0) return;
  lockedAt = window.scrollY;
  const body = document.body;
  // Bù đúng bề rộng thanh cuộn để trang không giật ngang lúc mở popup
  const gap = window.innerWidth - document.documentElement.clientWidth;
  body.style.position = "fixed";
  body.style.top = `-${lockedAt}px`;
  body.style.width = "100%";
  if (gap > 0) body.style.paddingRight = `${gap}px`;
}

function unlockScroll() {
  if (--lockCount > 0) return;
  lockCount = 0;
  const body = document.body;
  body.style.position = "";
  body.style.top = "";
  body.style.width = "";
  body.style.paddingRight = "";
  // QC 2/9 · C3 — PHẢI là `behavior: "instant"`. Trang khai `scroll-behavior: smooth`
  // toàn cục (globals.css) nên dạng `scrollTo(0, y)` biến thành cuộn MƯỢT: lệnh khôi
  // phục bị cuộn kế tiếp (hoặc một focus()) cắt ngang và dừng giữa đường — đúng triệu
  // chứng "scrollTo(0,0) dừng ở y=88 / 172.5" mà QC quan sát được.
  // Đo trên Chrome thật: dùng dạng 2 tham số thì đóng popup ở y=1600 rơi về 0.
  window.scrollTo({ top: lockedAt, behavior: "instant" });
}

/**
 * Modal giữa màn hình — số đo lấy nguyên từ 4 frame popup trong .fig
 * (7458:41634 · 7458:41714 · 7458:42002 · 7502:932):
 *   khung 700×auto · bo 24 · viền 2px #FF8206 · lề trong 32px
 *   thanh tiêu đề cao 67: nút ‹ và × 35×35 ở hai mép, tiêu đề 25px REGULAR #3D3D3D
 *   dải sọc cam 12px là phần tử CUỐI, nằm TRONG khung, bị bo góc cắt.
 * z-50 để luôn nằm trên mọi lớp khác (modal định danh có thể mở chồng lên modal khác).
 * Mobile (không có trong design — quy chuẩn 2/9): bottom sheet full width, bo trên 24,
 * có tay nắm kéo, cuộn trong, giấu dải sọc vì sheet chạm mép dưới màn hình.
 */
export function Modal({
  title,
  onClose,
  onBack,
  children,
  topmost = false,
}: {
  title?: React.ReactNode;
  onClose: () => void;
  onBack?: () => void;
  children: React.ReactNode;
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

  // QC 2/9 · C2 — khoá cuộn trang nền.
  // `overflow: hidden` trên body KHÔNG đủ trên iOS Safari (vẫn cuộn được) nên ghim
  // hẳn `position: fixed; top: -scrollY`, đóng thì trả lại đúng vị trí cũ. Chính
  // việc trả lại vị trí này cũng là chỗ nghi của C3 (sau chuỗi popup, scrollTo(0,0)
  // dừng ở y=88/172.5) — nay chỉ có một nơi khôi phục scroll, chạy đúng một lần.
  useEffect(() => {
    lockScroll();
    return unlockScroll;
  }, []);

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
        className="slide-up relative w-full sm:max-w-[700px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="kp-modal-card relative flex max-h-[92vh] flex-col overflow-hidden rounded-t-3xl border-2 border-brick bg-white shadow-kp sm:rounded-3xl">
          <div className="kp-safe-b min-h-0 flex-1 overflow-y-auto px-4 pt-4 sm:px-8 sm:pt-6">
            {/* Tay nắm kéo — gợi ý bottom sheet trên mobile (design không có mobile) */}
            <span aria-hidden className="mx-auto mb-3 block h-1 w-10 rounded-full bg-cream-dark sm:hidden" />
            {/* Title frame: cao 67, hai nút 35×35 sát lề 32 */}
            <div className="relative mb-4 flex min-h-[35px] items-center justify-center sm:mb-[16px] sm:min-h-[43px]">
              {onBack && (
                <button
                  onClick={onBack}
                  aria-label="Quay lại bước trước"
                  className="absolute left-0 grid h-[35px] w-[35px] cursor-pointer place-items-center rounded-full border-[1.5px] border-ink-soft/50 bg-white text-ink transition hover:border-brick hover:text-brick"
                >
                  <IconArrowLeft className="h-[18px] w-[18px]" />
                </button>
              )}
              {title && (
                <h3 className="m-0 px-12 text-center text-[19px] font-normal leading-tight tracking-[-0.02em] text-ink sm:text-[25px]">
                  {title}
                </h3>
              )}
              <button
                onClick={onClose}
                aria-label="Đóng"
                className="absolute right-0 grid h-[35px] w-[35px] cursor-pointer place-items-center rounded-full border-[1.5px] border-ink-soft/50 bg-white text-ink-soft transition hover:border-brick hover:text-brick"
              >
                <IconClose className="h-[16px] w-[16px]" />
              </button>
            </div>
            {children}
          </div>
          {/* Frame 155 — dải sọc cam đáy modal, nằm TRONG khung. Mobile ẩn vì
              bottom sheet chạm mép dưới màn hình. */}
          <div aria-hidden className="kp-stripe-b hidden flex-none sm:block" />
        </div>
      </div>
    </div>
  );
}
