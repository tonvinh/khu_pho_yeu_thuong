"use client";
// Combobox chọn phường/khu phố (dieuchinh.1.8 #11): ô search + danh sách cuộn
// + cho phép TỰ NHẬP tên phường chưa có trong danh sách (free text).
import { useMemo, useRef, useState } from "react";
import type { MapNeighborhood } from "./types";
import { formatAddress } from "@/lib/address";

/** Bỏ dấu để search "banco" vẫn ra "Bàn Cờ" */
function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase();
}

export default function NeighborhoodPicker({
  neighborhoods,
  valueId,
  valueText,
  onChange,
  placeholder = "Gõ để tìm hoặc tự nhập tên phường…",
  allowFreeText = true,
}: {
  neighborhoods: MapNeighborhood[];
  /** id khu phố đã chọn từ danh sách (null nếu đang tự nhập) */
  valueId: string | null;
  /** text đang gõ / tên tự nhập */
  valueText: string;
  onChange: (id: string | null, text: string) => void;
  placeholder?: string;
  allowFreeText?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const blurTimer = useRef<number | null>(null);

  const matches = useMemo(() => {
    const needle = fold(valueText.trim());
    if (!needle) return neighborhoods;
    return neighborhoods.filter((n) =>
      fold(formatAddress(n.name, n.ward, n.city)).includes(needle)
    );
  }, [neighborhoods, valueText]);

  const selected = neighborhoods.find((n) => n.id === valueId) ?? null;
  const freeTextActive =
    allowFreeText && !selected && valueText.trim().length > 0 && matches.length === 0;

  return (
    <div className="relative">
      <input
        value={valueText}
        onChange={(e) => onChange(null, e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // Đợi click item chạy xong rồi mới đóng
          blurTimer.current = window.setTimeout(() => setOpen(false), 150);
        }}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={open}
        className="kp-input tap"
      />
      {selected && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-status-signed">
          ✓
        </span>
      )}
      {open && (
        <div className="absolute inset-x-0 top-full z-20 mt-1.5 max-h-52 overflow-y-auto rounded-2xl border border-cream-dark bg-white py-1 shadow-kp">
          {matches.map((n) => (
            <button
              key={n.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                if (blurTimer.current) window.clearTimeout(blurTimer.current);
                onChange(n.id, n.name);
                setOpen(false);
              }}
              className={`block w-full cursor-pointer px-4 py-2.5 text-left text-[13.5px] hover:bg-cream ${
                n.id === valueId ? "bg-cream font-semibold" : ""
              }`}
            >
              {n.name}
              {n.certified_4n && " 🏅"}
              {(n.ward || n.city) && (
                <span className="block text-[11.5px] text-ink-soft">
                  {formatAddress(n.ward, n.city)}
                </span>
              )}
            </button>
          ))}
          {matches.length === 0 && (
            <p className="m-0 px-4 py-2.5 text-[12.5px] text-ink-soft">
              {allowFreeText
                ? `Chưa có trong danh sách — dùng tên bạn vừa nhập: “${valueText.trim()}”`
                : "Không tìm thấy khu phố nào."}
            </p>
          )}
        </div>
      )}
      {freeTextActive && !open && (
        <p className="m-0 mt-1 pl-1 text-[11.5px] text-ink-soft">
          Sẽ dùng tên phường bạn tự nhập: “{valueText.trim()}”
        </p>
      )}
    </div>
  );
}
