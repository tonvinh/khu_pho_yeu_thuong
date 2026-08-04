"use client";
// Công cụ dùng chung cho các bảng admin (4/8): giữ bộ lọc / tìm kiếm / phân trang trên
// URL để CHIA SẺ LINK là ra đúng màn hình đang xem, ô tìm kiếm debounce, tabs, header
// dính đỉnh, thanh phân trang.
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * State bộ lọc ↔ query string.
 * - Đọc URL SAU khi mount (không đọc lúc render để khỏi lệch SSR/hydrate) → cờ `ready`
 *   để trang chờ tham số thật rồi mới gọi API, tránh gọi 2 lần sai tham số.
 * - Ghi bằng history.replaceState: không thêm entry lịch sử, không cần bọc Suspense
 *   (useSearchParams sẽ bắt buộc phải bọc).
 * - Giá trị trùng mặc định hoặc rỗng thì bỏ khỏi URL cho link gọn.
 */
export function useUrlState<T extends Record<string, string>>(defaults: T) {
  const defRef = useRef(defaults);
  const [state, setState] = useState<T>(defaults);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const next = { ...defRef.current };
    for (const k of Object.keys(defRef.current) as Array<keyof T & string>) {
      const v = sp.get(k);
      if (v !== null) next[k] = v as T[keyof T & string];
    }
    setState(next);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const sp = new URLSearchParams(window.location.search);
    for (const [k, v] of Object.entries(state)) {
      if (!v || v === defRef.current[k]) sp.delete(k);
      else sp.set(k, v);
    }
    const qs = sp.toString();
    window.history.replaceState(
      null, "", qs ? `${window.location.pathname}?${qs}` : window.location.pathname
    );
  }, [state, ready]);

  const patch = useCallback((p: Partial<T>) => setState((s) => ({ ...s, ...p })), []);
  return [state, patch, ready] as const;
}

/** Số trang hợp lệ (kẹp trong [1, số trang]) — dùng chung cho phân trang client & server */
export function clampPage(page: string | number, total: number, per: number): number {
  const pages = Math.max(1, Math.ceil(total / per));
  return Math.min(Math.max(1, Number(page) || 1), pages);
}

/** Ô tìm kiếm debounce 300ms — `value` là giá trị đang nằm trên URL */
export function SearchBox({
  value, onChange, placeholder, className = "",
}: {
  value: string; onChange: (v: string) => void; placeholder: string; className?: string;
}) {
  const [text, setText] = useState(value);
  const cb = useRef(onChange);
  cb.current = onChange;

  // URL đổi từ bên ngoài (đổi tab, mở link mới) → nạp lại vào ô nhập
  useEffect(() => { setText(value); }, [value]);
  useEffect(() => {
    if (text.trim() === value) return;
    const t = window.setTimeout(() => cb.current(text.trim()), 300);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <input
      value={text}
      onChange={(e) => setText(e.target.value)}
      placeholder={placeholder}
      className={`rounded-xl border border-cream-dark bg-cream px-3 py-2 text-sm ${className}`}
    />
  );
}

/** Tabs dạng pill (có badge số lượng tuỳ chọn) */
export function Tabs({
  value, onChange, items,
}: {
  value: string;
  onChange: (key: string) => void;
  items: Array<{ key: string; label: string; badge?: number }>;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it) => (
        <button
          key={it.key}
          onClick={() => onChange(it.key)}
          aria-pressed={value === it.key}
          className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
            value === it.key ? "bg-brick text-white shadow-sm" : "bg-white text-ink hover:bg-cream-dark/50"
          }`}
        >
          {it.label}
          {it.badge !== undefined && it.badge > 0 && (
            <span
              className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${
                value === it.key ? "bg-white/25" : "bg-cream-dark text-ink-soft"
              }`}
            >
              {it.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/** Ô header bảng — dính đỉnh vùng cuộn, kẻ dưới bằng shadow (border ô sticky không trôi) */
export function Th({
  children, className = "", title,
}: {
  children?: React.ReactNode; className?: string; title?: string;
}) {
  return (
    <th
      title={title}
      className={`sticky top-0 z-10 whitespace-nowrap bg-white px-3 py-2.5 font-bold shadow-[0_1px_0_0_var(--color-cream-dark)] ${className}`}
    >
      {children}
    </th>
  );
}

const PER_OPTIONS = [20, 50, 100];

/** Thanh phân trang — trang & số dòng/trang đều nằm trên URL nhờ useUrlState */
export function Pager({
  page, per, total, onPage, onPer,
}: {
  page: number; per: number; total: number;
  onPage: (p: number) => void; onPer?: (n: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / per));
  const from = total === 0 ? 0 : (page - 1) * per + 1;
  const to = Math.min(total, page * per);
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="text-ink-soft">
        {total === 0 ? "Không có dòng nào" : `Hiển thị ${from}–${to} / ${total}`}
      </span>
      {onPer && (
        <select
          value={per}
          onChange={(e) => onPer(Number(e.target.value))}
          className="rounded-lg border border-cream-dark bg-white px-2 py-1 text-xs"
        >
          {PER_OPTIONS.map((n) => <option key={n} value={n}>{n} dòng/trang</option>)}
        </select>
      )}
      <span className="ml-auto flex items-center gap-1">
        <PagerBtn disabled={page <= 1} onClick={() => onPage(page - 1)}>‹ Trước</PagerBtn>
        <span className="px-1.5 font-bold">Trang {page}/{pages}</span>
        <PagerBtn disabled={page >= pages} onClick={() => onPage(page + 1)}>Sau ›</PagerBtn>
      </span>
    </div>
  );
}

function PagerBtn({
  disabled, onClick, children,
}: {
  disabled: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-full border border-cream-dark px-2.5 py-1 font-bold disabled:opacity-40 enabled:hover:border-brick enabled:hover:text-brick"
    >
      {children}
    </button>
  );
}
