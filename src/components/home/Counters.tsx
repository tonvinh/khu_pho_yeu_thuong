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
  return (
    <div className="mt-7 grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((it) => (
        <div key={it.label} className="rounded-[14px] border border-cream-dark bg-cream-panel p-3.5">
          <div className={`font-display text-[26px] font-extrabold leading-none ${it.color}`}>
            {it.value.toLocaleString("vi-VN")}
          </div>
          <div className="mt-1.5 text-xs text-ink-soft">{it.label}</div>
        </div>
      ))}
    </div>
  );
}
