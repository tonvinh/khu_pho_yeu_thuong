"use client";
import type { CounterData } from "./types";
import { COPY } from "@/lib/copy";

export default function Counters({ counters }: { counters: CounterData }) {
  const items = [
    { value: counters.signs_installed, label: COPY.counterLabels[0], color: "text-status-signed" },
    { value: counters.issues_waiting, label: COPY.counterLabels[1], color: "text-status-voting" },
    { value: counters.contributors, label: COPY.counterLabels[2], color: "text-brick" },
    { value: counters.neighborhoods_joined, label: COPY.counterLabels[3], color: "text-accent-blue" },
  ];
  return (
    <section className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {items.map((it) => (
        <div key={it.label} className="rounded-2xl bg-white p-4 text-center shadow-sm">
          <div className={`text-3xl font-extrabold ${it.color}`}>{it.value}</div>
          <div className="mt-1 text-xs font-medium text-ink-soft">{it.label}</div>
        </div>
      ))}
    </section>
  );
}
