"use client";
// Chart SVG thuần cho dashboard phân tích /admin — không thêm thư viện.
// Palette đã chạy validator colorblind-safety trên nền trắng:
//   2 series: accent-blue #2d6cb5 + brick #c0573b (ΔE CVD 19.0, normal 26.4)
//   ordinal (phễu): 5 bước xanh #86abd6→#143c6b (monotone, light-end 2.38:1)
// Mọi chart có nhãn trực tiếp + bảng dữ liệu (không giá trị nào chỉ đọc được bằng hover).
import { useRef, useState } from "react";

export const S1 = "#2d6cb5"; // accent-blue
export const S2 = "#c0573b"; // brick
const ORD = ["#86abd6", "#5c8fc7", "#2d6cb5", "#1f5490", "#143c6b"];
const GRID = "#f0eadd";
const AXIS = "#e4d9c7";
const MUTED = "#6e665a";
const INK = "#2b2620";

export const fmtN = new Intl.NumberFormat("vi-VN");
export function fmtDay(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function niceMax(v: number): number {
  if (v <= 0) return 4;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}
const TABNUM = { fontVariantNumeric: "tabular-nums" } as const;

/** Bảng dữ liệu đi kèm mỗi chart — kênh đọc không cần hover/màu */
export function DataTable({ cols, rows }: { cols: string[]; rows: (string | number)[][] }) {
  return (
    <details className="mt-2">
      <summary className="cursor-pointer select-none text-xs text-ink-soft">Dữ liệu dạng bảng</summary>
      <div className="mt-2 max-h-52 overflow-auto rounded-xl border border-cream-dark">
        <table className="w-full text-xs">
          <thead>
            <tr>
              {cols.map((c, i) => (
                <th key={c} className={`sticky top-0 bg-white px-2.5 py-1.5 font-semibold text-ink-soft ${i > 0 ? "text-right" : "text-left"}`}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri} className="border-t border-cream">
                {r.map((v, i) => (
                  <td key={i} className={`px-2.5 py-1 ${i > 0 ? "text-right" : ""}`} style={i > 0 ? TABNUM : undefined}>
                    {typeof v === "number" ? fmtN.format(v) : v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

/** Sparkline 12 điểm: đường xám, điểm hiện tại màu nhấn */
export function Sparkline({ vals }: { vals: number[] }) {
  const W = 120, H = 26, P = 3;
  const max = Math.max(...vals, 1), min = Math.min(...vals, 0);
  const X = (i: number) => P + ((W - 2 * P) * i) / Math.max(vals.length - 1, 1);
  const Y = (v: number) => P + (H - 2 * P) * (1 - (v - min) / (max - min || 1));
  const d = vals.map((v, i) => `${i ? "L" : "M"} ${X(i)} ${Y(v)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 block h-[26px] w-full" aria-hidden="true">
      <path d={d} fill="none" stroke={AXIS} strokeWidth={1.5} strokeLinejoin="round" />
      <circle cx={X(vals.length - 1)} cy={Y(vals[vals.length - 1])} r={3} fill={S1} stroke="#fff" strokeWidth={2} />
    </svg>
  );
}

/** Biểu đồ đường 1 series + crosshair tooltip (điều khiển được bằng bàn phím) */
export function LineChart({ days, vals, name }: { days: string[]; vals: number[]; name: string }) {
  const W = 520, H = 170, L = 44, R = 14, T = 12, B = 24;
  const pw = W - L - R, ph = H - T - B;
  const [idx, setIdx] = useState<number>(-1);
  const svgRef = useRef<SVGSVGElement>(null);
  const max = niceMax(Math.max(...vals, 1));
  const X = (i: number) => L + (pw * i) / Math.max(vals.length - 1, 1);
  const Y = (v: number) => T + ph * (1 - v / max);
  const dLine = vals.map((v, i) => `${i ? "L" : "M"} ${X(i)} ${Y(v)}`).join(" ");
  const dArea = `M ${X(0)} ${Y(0)} ${vals.map((v, i) => `L ${X(i)} ${Y(v)}`).join(" ")} L ${X(vals.length - 1)} ${Y(0)} Z`;
  const last = vals.length - 1;
  const mid = Math.floor(last / 2);

  const onMove = (e: React.PointerEvent) => {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r) return;
    const px = ((e.clientX - r.left) * W) / r.width;
    setIdx(Math.max(0, Math.min(last, Math.round(((px - L) / pw) * last))));
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") { setIdx((i) => Math.max(0, (i < 0 ? last : i) - 1)); e.preventDefault(); }
    if (e.key === "ArrowRight") { setIdx((i) => Math.min(last, (i < 0 ? last : i) + 1)); e.preventDefault(); }
  };

  return (
    <div className="relative">
      <svg
        ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={name}
        tabIndex={0} onPointerMove={onMove} onPointerLeave={() => setIdx(-1)}
        onFocus={() => setIdx(last)} onBlur={() => setIdx(-1)} onKeyDown={onKey}
      >
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={L} x2={W - R} y1={Y(max * f)} y2={Y(max * f)} stroke={f === 0 ? AXIS : GRID} strokeWidth={1} />
            {Number.isInteger(max * f) && (
              <text x={L - 7} y={Y(max * f) + 3.5} textAnchor="end" fontSize={10} fill={MUTED} style={TABNUM}>
                {fmtN.format(max * f)}
              </text>
            )}
          </g>
        ))}
        {([[0, "start"], [mid, "middle"], [last, "end"]] as const).map(([i, an]) => (
          <text key={an} x={X(i)} y={H - 7} textAnchor={an} fontSize={10} fill={MUTED}>
            {fmtDay(days[i])}
          </text>
        ))}
        <path d={dArea} fill={S1} opacity={0.09} />
        <path d={dLine} fill="none" stroke={S1} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={X(last)} cy={Y(vals[last])} r={5} fill={S1} stroke="#fff" strokeWidth={2} />
        <text x={Math.min(X(last), W - R - 4)} y={Math.max(Y(vals[last]) - 9, 11)} textAnchor="end" fontSize={11} fontWeight={650} fill={INK}>
          {fmtN.format(vals[last])}
        </text>
        {idx >= 0 && (
          <g>
            <line x1={X(idx)} x2={X(idx)} y1={T} y2={H - B} stroke={AXIS} strokeWidth={1} />
            <circle cx={X(idx)} cy={Y(vals[idx])} r={4.5} fill={S1} stroke="#fff" strokeWidth={2} />
          </g>
        )}
      </svg>
      {idx >= 0 && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-cream-dark bg-white px-2.5 py-1.5 text-xs shadow-kp-s"
          style={{
            left: `${Math.max(10, Math.min(90, (X(idx) / W) * 100))}%`,
            top: `${(Y(vals[idx]) / H) * 100}%`,
            transform: "translate(-50%, calc(-100% - 10px))",
          }}
        >
          <div className="text-[10px] text-ink-soft">{fmtDay(days[idx])}</div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 rounded border-t-[3px]" style={{ borderColor: S1 }} />
            <b style={TABNUM}>{fmtN.format(vals[idx])}</b>
          </div>
        </div>
      )}
      <DataTable cols={["Ngày", name]} rows={days.map((d, i) => [fmtDay(d), vals[i]])} />
    </div>
  );
}

/** Phễu ngang — ramp ordinal 1 tông xanh, nhãn giá trị + % ngoài đầu bar */
export function FunnelChart({ stages }: { stages: { label: string; value: number }[] }) {
  const W = 520, rowH = 34, L = 152, R = 92, T = 6;
  const H = T + stages.length * rowH + 6;
  const max = stages[0]?.value || 1;
  const pw = W - L - R;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img">
        {stages.map((s, i) => {
          const y = T + i * rowH, bh = 22;
          const bw = Math.max((pw * s.value) / max, 2);
          const pct = Math.round((100 * s.value) / max);
          const stepPct = i === 0 ? null : Math.round((100 * s.value) / (stages[i - 1].value || 1));
          return (
            <g key={s.label}>
              <text x={L - 10} y={y + bh / 2 + 4} textAnchor="end" fontSize={12} fill={MUTED}>{s.label}</text>
              <rect x={L} y={y} width={bw} height={bh} rx={4} ry={4} fill={ORD[Math.min(i, ORD.length - 1)]}>
                <title>{`${s.label}: ${fmtN.format(s.value)} (${pct}% đầu phễu${stepPct === null ? "" : ` · ${stepPct}% so với bước trước`})`}</title>
              </rect>
              <rect x={L} y={y} width={Math.min(5, bw)} height={bh} fill={ORD[Math.min(i, ORD.length - 1)]} />
              <text x={L + bw + 8} y={y + bh / 2 + 4} fontSize={11.5} fontWeight={650} fill={INK} style={TABNUM}>
                {fmtN.format(s.value)} · {pct}%
              </text>
            </g>
          );
        })}
      </svg>
      <DataTable
        cols={["Bước", "Số lượng", "% đầu phễu"]}
        rows={stages.map((s) => [s.label, s.value, `${Math.round((100 * s.value) / max)}%`])}
      />
    </div>
  );
}

/** Bar ngang nhóm 2 series (xanh + gạch), legend + nhãn ở đầu bar */
export function GroupedBarsH({
  cats, s1, s2, s1Name, s2Name,
}: { cats: string[]; s1: number[]; s2: number[]; s1Name: string; s2Name: string }) {
  const W = 520, L = 172, R = 60, rowH = 40, T = 4;
  const H = T + cats.length * rowH + 18;
  const max = niceMax(Math.max(...s1, ...s2, 1));
  const pw = W - L - R;
  return (
    <div>
      <div className="mb-2 flex gap-4 text-xs text-ink-soft">
        {[[s1Name, S1], [s2Name, S2]].map(([n, c]) => (
          <span key={n} className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: c }} />{n}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img">
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={L + pw * f} x2={L + pw * f} y1={T} y2={H - 16} stroke={f === 0 ? AXIS : GRID} strokeWidth={1} />
            {Number.isInteger(max * f) && (
              <text x={L + pw * f} y={H - 4} textAnchor="middle" fontSize={10} fill={MUTED} style={TABNUM}>
                {fmtN.format(max * f)}
              </text>
            )}
          </g>
        ))}
        {cats.map((c, i) => {
          const y = T + i * rowH;
          return (
            <g key={c}>
              <text x={L - 10} y={y + rowH / 2 + 2} textAnchor="end" fontSize={11.5} fill={MUTED}>{c}</text>
              {([[s1[i], S1, s1Name, 0], [s2[i], S2, s2Name, 1]] as const).map(([v, col, nm, k]) => {
                const bh = 14, gy = y + 4 + k * (bh + 2); // khe 2px nền giữa 2 bar
                const bw = Math.max((pw * v) / max, 1.5);
                return (
                  <g key={nm}>
                    <rect x={L} y={gy} width={bw} height={bh} rx={4} ry={4} fill={col}>
                      <title>{`${c} — ${nm}: ${fmtN.format(v)}`}</title>
                    </rect>
                    <rect x={L} y={gy} width={Math.min(4, bw)} height={bh} fill={col} />
                    <text x={L + bw + 6} y={gy + bh - 3} fontSize={10.5} fill={MUTED} style={TABNUM}>
                      {fmtN.format(v)}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
      <DataTable cols={["Chủ đề", s1Name, s2Name]} rows={cats.map((c, i) => [c, s1[i], s2[i]])} />
    </div>
  );
}

/** Stacked ngang theo trạng thái (ramp ordinal) — dùng cho leads theo nguồn */
export function StackedBarsH({
  rows, segNames, convIndex,
}: { rows: { label: string; vals: number[] }[]; segNames: string[]; convIndex?: number }) {
  const W = 520, L = 172, R = 56, rowH = 46, T = 4;
  const H = T + rows.length * rowH + 4;
  const max = Math.max(...rows.map((r) => r.vals.reduce((a, b) => a + b, 0)), 1);
  const pw = W - L - R;
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-3 text-xs text-ink-soft">
        {segNames.map((n, i) => (
          <span key={n} className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: ORD[i + 1] }} />{n}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img">
        {rows.map((r, ri) => {
          const y = T + ri * rowH, bh = 20;
          const total = r.vals.reduce((a, b) => a + b, 0);
          let x = L;
          const segs = r.vals.map((v, si) => {
            const bw = (pw * v) / max;
            const seg = { v, si, x, bw };
            x += bw;
            return seg;
          });
          const conv = convIndex !== undefined && total > 0 ? Math.round((100 * r.vals[convIndex]) / total) : null;
          return (
            <g key={r.label}>
              <text x={L - 10} y={y + bh / 2 + 4} textAnchor="end" fontSize={11.5} fill={MUTED}>{r.label}</text>
              {segs.map(({ v, si, x: sx, bw }) => {
                if (bw <= 0) return null;
                const label = fmtN.format(v);
                const fits = bw > label.length * 7 + 14;
                return (
                  <g key={si}>
                    <rect
                      x={sx} y={y} width={Math.max(bw - 2, 1)} height={bh}
                      rx={si === segs.length - 1 ? 4 : 0} ry={si === segs.length - 1 ? 4 : 0}
                      fill={ORD[si + 1]}
                    >
                      <title>{`${r.label} — ${segNames[si]}: ${label}${total ? ` (${Math.round((100 * v) / total)}%)` : ""}`}</title>
                    </rect>
                    {fits && (
                      <text x={sx + (bw - 2) / 2} y={y + bh / 2 + 4} textAnchor="middle" fontSize={11} fontWeight={600}
                        fill={si < 2 ? INK : "#ffffff"} style={TABNUM}>
                        {label}
                      </text>
                    )}
                  </g>
                );
              })}
              <text x={x + 8} y={y + bh / 2 + 4} fontSize={11.5} fontWeight={650} fill={INK} style={TABNUM}>
                {fmtN.format(total)}
              </text>
              {conv !== null && (
                <text x={L} y={y + bh + 14} fontSize={10.5} fill={MUTED}>Chuyển đổi: {conv}%</text>
              )}
            </g>
          );
        })}
      </svg>
      <DataTable
        cols={["Nguồn", ...segNames, "Tổng"]}
        rows={rows.map((r) => [r.label, ...r.vals, r.vals.reduce((a, b) => a + b, 0)])}
      />
    </div>
  );
}

/** Gom mảng ngày về n điểm sparkline */
export function bucket(arr: number[], n: number): number[] {
  if (arr.length <= n) return arr;
  const out: number[] = [];
  const step = arr.length / n;
  for (let i = 0; i < n; i++) {
    out.push(arr.slice(Math.floor(i * step), Math.floor((i + 1) * step)).reduce((a, b) => a + b, 0));
  }
  return out;
}
