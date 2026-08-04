"use client";
// Lưới 4 ô số liệu trong hero (prototype .counters .ct) — nền paper2, số Baloo màu theo loại
import type { CounterData } from "./types";
import { COPY } from "@/lib/copy";

export default function Counters({ counters }: { counters: CounterData }) {
  const items = [
    { value: counters.signs_installed, label: COPY.counterLabels[0], color: "text-teal" },
    { value: counters.issues_waiting, label: COPY.counterLabels[1], color: "text-brick" },
    { value: counters.contributors, label: COPY.counterLabels[2], color: "text-olive-dark" },
    { value: counters.neighborhoods_joined, label: COPY.counterLabels[3], color: "text-fpt" },
  ];
  // Mobile: gộp 4 ô thành MỘT thẻ chia lưới 2×2 bằng đường kẻ mảnh — gọn hơn
  // 4 hộp rời; từ sm trở lên tách lại thành 4 thẻ như prototype.
  return (
    <div className="mt-6 grid w-full grid-cols-2 overflow-hidden rounded-[14px] border border-cream-dark bg-cream-panel sm:mt-7 sm:grid-cols-4 sm:gap-3 sm:border-0 sm:bg-transparent">
      {items.map((it, i) => (
        <div
          key={it.label}
          className={`px-3.5 py-3 sm:rounded-[14px] sm:border sm:border-cream-dark sm:bg-cream-panel sm:p-3.5 ${
            i % 2 === 0 ? "border-r border-cream-dark" : ""
          } ${i < 2 ? "border-b border-cream-dark" : ""}`}
        >
          <div className={`font-display text-[24px] font-extrabold leading-none sm:text-[26px] ${it.color}`}>
            {it.value.toLocaleString("vi-VN")}
          </div>
          <div className="mt-1 text-[11.5px] leading-snug text-ink-soft sm:mt-1.5 sm:text-xs">{it.label}</div>
        </div>
      ))}
    </div>
  );
}
