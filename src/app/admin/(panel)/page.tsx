"use client";
// Dashboard phân tích (thay dashboard tổng quan cũ): bộ lọc kỳ/khu phố/chủ đề,
// hàng đợi cần xử lý, KPI + sparkline, diễn biến ngày, phễu, phân bố, xếp hạng khu phố.
// Dữ liệu: GET /api/admin/analytics (cache server 60s).
import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/components/client-api";
import { Card } from "@/components/admin/AdminShell";
import { useUrlState } from "@/components/admin/table-tools";
import { CATEGORY_CODES, categoryIcon, categoryLabel } from "@/lib/taxonomy";
import {
  FunnelChart, GroupedBarsH, LineChart, Sparkline, StackedBarsH, bucket, fmtN,
} from "@/components/admin/analytics-charts";

interface DailyRow {
  day: string; issues: number; suggestions: number; votes: number;
  leads: number; installed: number; new_users: number;
}
interface Analytics {
  range: { days: number; neighborhood_id: string | null; category: string | null };
  kpis: Record<string, number>;
  daily: DailyRow[];
  funnel_issues: { submitted: number; approved: number; voting: number; signed: number };
  funnel_suggestions: { submitted: number; approved: number; selected: number; produced: number; installed: number };
  categories: Array<{ category: string; issues: number; suggestions: number }>;
  leads_break: Array<{ source: string; new: number; contacted: number; converted: number; closed: number }>;
  rank: Array<{ id: string; name: string; ward: string | null; city: string | null; certified_4n: boolean; points: number; installed: number; issues: number; votes: number }>;
  ops: {
    issues_pending: number; issues_pending_over_24h: number; issues_oldest_hours: number;
    suggestions_pending: number; suggestions_oldest_days: number;
    leads_new_over_48h: number; selected_over_14d: number;
  };
  fraud: { ip_clusters: number; burst_targets: number; fast_voters: number };
  quality: {
    issues_approved: number; issues_rejected: number; sug_approved: number; sug_rejected: number;
    votes_invalid: number; votes_total: number; shadow_banned: number;
  };
  neighborhoods: Array<{ id: string; name: string }>;
}

const KPI_DEFS = [
  { key: "installed", daily: "installed", label: "Biển đã lắp" },
  { key: "issues", daily: "issues", label: "Đề xuất góc phố" },
  { key: "suggestions", daily: "suggestions", label: "Câu nhắc gửi lên" },
  { key: "votes", daily: "votes", label: "Lượt thương hợp lệ" },
  { key: "new_users", daily: "new_users", label: "Cư dân mới" },
  { key: "leads", daily: "leads", label: "Leads đồng ý liên hệ" },
] as const;

type Severity = "crit" | "warn" | "good";
const SEV_STYLE: Record<Severity, { border: string; text: string; icon: string; label: string }> = {
  crit: { border: "border-l-status-waiting", text: "text-status-waiting", icon: "▲", label: "Khẩn" },
  warn: { border: "border-l-status-voting", text: "text-status-voting", icon: "●", label: "Chú ý" },
  good: { border: "border-l-status-signed", text: "text-status-signed", icon: "✓", label: "Ổn" },
};

export default function AdminDashboard() {
  // Bộ lọc nằm trên URL → chia sẻ link là ra đúng kỳ / khu phố / chủ đề đang xem
  const [ui, setUi, uiReady] = useUrlState({ days: "30", nb: "", cat: "" });
  const days = Number(ui.days) || 30;
  const { nb, cat } = ui;
  const [d, setD] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!uiReady) return;
    let alive = true;
    setLoading(true);
    const qs = new URLSearchParams({ days: String(days) });
    if (nb) qs.set("neighborhood_id", nb);
    if (cat) qs.set("category", cat);
    apiGet<Analytics>(`/api/admin/analytics?${qs}`)
      .then((r) => { if (alive) { setD(r); setError(false); } })
      .catch(() => { if (alive) setError(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [uiReady, days, nb, cat]);

  if (!d && loading) return <p className="text-ink-soft">Đang tải…</p>;
  if (!d) return <p className="text-status-waiting">Không tải được dữ liệu — thử tải lại trang.</p>;

  const alerts = buildAlerts(d);
  const catRows = d.categories.map((c) => ({ ...c, label: `${categoryIcon(c.category)} ${categoryLabel(c.category)}` }));
  const leadsRows = (["soft_drawer", "active_section"] as const).map((src) => {
    const r = d.leads_break.find((x) => x.source === src);
    return {
      label: src === "soft_drawer" ? "Popup tầng 1" : "Form tầng 2",
      vals: [r?.new ?? 0, r?.contacted ?? 0, r?.converted ?? 0, r?.closed ?? 0],
    };
  });
  const votesInvalidPct = d.quality.votes_total
    ? ((100 * d.quality.votes_invalid) / d.quality.votes_total).toFixed(1).replace(".", ",")
    : "0";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-extrabold">Dashboard phân tích</h1>
        {error && <span className="text-xs text-status-waiting">Lỗi tải dữ liệu — đang hiển thị số liệu cũ</span>}
      </div>

      {/* Bộ lọc: một hàng, áp cho mọi khối bên dưới trừ "Cần xử lý ngay" */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
        <div className="flex overflow-hidden rounded-xl border border-cream-dark">
          {[7, 30, 90].map((n) => (
            <button
              key={n}
              onClick={() => setUi({ days: String(n) })}
              className={`px-3 py-1.5 text-sm ${days === n ? "bg-cream font-bold text-ink" : "text-ink-soft hover:bg-cream-panel"}`}
              aria-pressed={days === n}
            >
              {n} ngày
            </button>
          ))}
        </div>
        <select value={nb} onChange={(e) => setUi({ nb: e.target.value })}
          className="rounded-xl border border-cream-dark bg-white px-2.5 py-1.5 text-sm">
          <option value="">Tất cả khu phố</option>
          {d.neighborhoods.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
        </select>
        <select value={cat} onChange={(e) => setUi({ cat: e.target.value })}
          className="rounded-xl border border-cream-dark bg-white px-2.5 py-1.5 text-sm">
          <option value="">Tất cả 6 chủ đề</option>
          {CATEGORY_CODES.map((c) => <option key={c} value={c}>{categoryIcon(c)} {categoryLabel(c)}</option>)}
        </select>
        <span className="ml-auto text-xs text-ink-soft">
          So với {days} ngày liền trước{(nb || cat) && " · leads & cư dân mới không lọc theo chủ đề, leads không lọc theo khu phố"}
        </span>
      </div>

      <div className={loading ? "pointer-events-none opacity-60 transition-opacity" : "transition-opacity"}>
        {/* Cần xử lý ngay */}
        <Card title="Cần xử lý ngay (không theo bộ lọc)">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {alerts.map((a) => {
              const s = SEV_STYLE[a.sev];
              return (
                <div key={a.msg} className={`border-l-[3px] pl-3 ${s.border}`}>
                  <div className={`text-[11px] font-bold uppercase tracking-wide ${s.text}`}>{s.icon} {s.label}</div>
                  <div className="text-sm font-semibold">{a.msg}</div>
                  {a.sla && <div className="text-xs text-ink-soft">{a.sla}</div>}
                  {a.href && (
                    <Link href={a.href} className="text-xs font-semibold text-accent-blue hover:underline">
                      {a.act} →
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-3 border-t border-cream pt-2 text-xs text-ink-soft">
            Hàng đợi: {fmtN.format(d.ops.issues_pending)} đề xuất chờ duyệt · {fmtN.format(d.ops.suggestions_pending)} câu chờ duyệt
            · {fmtN.format(d.ops.selected_over_14d)} biển chọn quá 14 ngày chưa sản xuất
          </div>
        </Card>

        {/* KPI trong kỳ */}
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {KPI_DEFS.map((k) => {
            const cur = d.kpis[`${k.key}_cur`] ?? 0;
            const prev = d.kpis[`${k.key}_prev`] ?? 0;
            const pct = prev > 0 ? Math.round((100 * (cur - prev)) / prev) : null;
            return (
              <div key={k.key} className="rounded-2xl bg-white p-3.5 shadow-sm">
                <div className="text-xs text-ink-soft">{k.label}</div>
                <div className="text-2xl font-extrabold">{fmtN.format(cur)}</div>
                <div className={`text-xs font-semibold ${pct !== null && pct < 0 ? "text-status-waiting" : "text-status-signed"}`}>
                  {pct === null ? "—" : `${pct >= 0 ? "+" : ""}${pct}%`}
                  <span className="ml-1 font-normal text-ink-soft">vs kỳ trước</span>
                </div>
                <Sparkline vals={bucket(d.daily.map((x) => x[k.daily]), 12)} />
              </div>
            );
          })}
        </div>

        {/* Diễn biến theo ngày */}
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {([
            ["Đề xuất góc phố mỗi ngày", "issues"],
            ["Câu nhắc gửi mỗi ngày", "suggestions"],
            ["Lượt thương hợp lệ mỗi ngày", "votes"],
            ["Leads mới mỗi ngày", "leads"],
          ] as const).map(([title, key]) => (
            <Card key={key} title={title}>
              <LineChart days={d.daily.map((x) => x.day)} vals={d.daily.map((x) => x[key])} name={title} />
            </Card>
          ))}
        </div>

        {/* Phễu cohort trong kỳ */}
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <Card title="Phễu đề xuất → biển (tạo trong kỳ)">
            <FunnelChart stages={[
              { label: "Gửi lên", value: d.funnel_issues.submitted },
              { label: "Được duyệt (+2đ)", value: d.funnel_issues.approved },
              { label: "Vào bình chọn", value: d.funnel_issues.voting },
              { label: "Đã có biển", value: d.funnel_issues.signed },
            ]} />
          </Card>
          <Card title="Phễu câu nhắc → lắp biển (tạo trong kỳ)">
            <FunnelChart stages={[
              { label: "Gửi lên", value: d.funnel_suggestions.submitted },
              { label: "Duyệt 4N (+5đ)", value: d.funnel_suggestions.approved },
              { label: "Chọn sản xuất", value: d.funnel_suggestions.selected },
              { label: "Đã sản xuất", value: d.funnel_suggestions.produced },
              { label: "Đã lắp (+30đ)", value: d.funnel_suggestions.installed },
            ]} />
          </Card>
        </div>

        {/* Phân bố */}
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <Card title="Theo 6 chủ đề (trong kỳ)">
            <GroupedBarsH
              cats={catRows.map((c) => c.label)}
              s1={catRows.map((c) => c.issues)} s1Name="Đề xuất"
              s2={catRows.map((c) => c.suggestions)} s2Name="Câu nhắc"
            />
          </Card>
          <Card title="Leads theo nguồn & trạng thái (trong kỳ)">
            <StackedBarsH rows={leadsRows} segNames={["Mới", "Đã liên hệ", "Chuyển đổi", "Đóng"]} convIndex={2} />
          </Card>
        </div>

        {/* Xếp hạng khu phố */}
        <div className="mt-4">
          <Card title="Top khu phố trong kỳ (điểm hợp lệ của cư dân)">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead>
                  <tr className="border-b border-cream-dark text-left text-xs text-ink-soft">
                    <th className="px-2 py-2">#</th>
                    <th className="px-2 py-2">Khu phố (Phường/Xã · Tỉnh/TP)</th>
                    <th className="px-2 py-2 text-right">Điểm kỳ này</th>
                    <th className="px-2 py-2 text-right">Biển lắp</th>
                    <th className="px-2 py-2 text-right">Đề xuất</th>
                    <th className="px-2 py-2 text-right">Thương</th>
                    <th className="px-2 py-2">4N</th>
                  </tr>
                </thead>
                <tbody style={{ fontVariantNumeric: "tabular-nums" }}>
                  {d.rank.map((r, i) => (
                    <tr key={r.id} className="border-b border-cream hover:bg-cream-panel">
                      <td className="px-2 py-2 text-ink-soft">{i + 1}</td>
                      <td className="px-2 py-2">
                        <div className="font-semibold">
                          {r.name}{r.ward && <span className="ml-1 font-normal text-ink-soft">— {r.ward}</span>}
                        </div>
                        <div className="text-[11px] text-ink-soft">{r.city || "Chưa có tỉnh/thành"}</div>
                      </td>
                      <td className="px-2 py-2 text-right font-bold">{fmtN.format(r.points)}</td>
                      <td className="px-2 py-2 text-right">{fmtN.format(r.installed)}</td>
                      <td className="px-2 py-2 text-right">{fmtN.format(r.issues)}</td>
                      <td className="px-2 py-2 text-right">{fmtN.format(r.votes)}</td>
                      <td className="px-2 py-2">
                        {r.certified_4n
                          ? <span className="rounded-full bg-status-signed-bg px-2 py-0.5 text-[11px] font-bold text-status-signed">✓ Đạt 4N</span>
                          : <span className="text-[11px] text-ink-soft">Chưa đạt</span>}
                      </td>
                    </tr>
                  ))}
                  {d.rank.length === 0 && (
                    <tr><td colSpan={7} className="px-2 py-4 text-center text-ink-soft">Chưa có dữ liệu trong kỳ</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Chất lượng & gian lận */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <QTile label="Tỉ lệ duyệt đề xuất" value={ratePct(d.quality.issues_approved, d.quality.issues_rejected)} hint="đã duyệt / tổng đã xử lý" />
          <QTile label="Tỉ lệ duyệt câu (4N)" value={ratePct(d.quality.sug_approved, d.quality.sug_rejected)} hint="đã duyệt / tổng đã xử lý" />
          <QTile label="Thương bị vô hiệu" value={`${votesInvalidPct}%`} hint={`${fmtN.format(d.quality.votes_invalid)} / ${fmtN.format(d.quality.votes_total)} phiếu`} />
          <QTile label="Tài khoản shadow-ban" value={fmtN.format(d.quality.shadow_banned)} hint="xử lý im lặng" />
          <div className="rounded-2xl bg-white p-3.5 shadow-sm">
            <div className="text-xs text-ink-soft">Tín hiệu bất thường</div>
            <div className="mt-1 space-y-1 text-xs">
              <div>{d.fraud.ip_clusters} cụm IP nhiều tài khoản (24h)</div>
              <div>{d.fraud.burst_targets} người nhận thương từ tài khoản mới</div>
              <div>{d.fraud.fast_voters} tài khoản vote &gt;20 lượt/giờ</div>
            </div>
            <Link href="/admin/gian-lan" className="mt-1.5 inline-block text-xs font-semibold text-accent-blue hover:underline">
              Mở màn chống gian lận →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function QTile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl bg-white p-3.5 shadow-sm">
      <div className="text-xs text-ink-soft">{label}</div>
      <div className="text-xl font-extrabold">{value}</div>
      <div className="text-[11px] text-ink-soft">{hint}</div>
    </div>
  );
}

function ratePct(ok: number, rejected: number): string {
  const total = ok + rejected;
  return total ? `${Math.round((100 * ok) / total)}%` : "—";
}

function buildAlerts(d: Analytics) {
  const out: Array<{ sev: Severity; msg: string; sla?: string; act?: string; href?: string }> = [];
  const { ops, fraud } = d;
  if (ops.issues_pending_over_24h > 0) {
    out.push({
      sev: "crit",
      msg: `${fmtN.format(ops.issues_pending_over_24h)} đề xuất chờ duyệt quá 24 giờ`,
      sla: `Cam kết duyệt trong 24h — cũ nhất đã chờ ${ops.issues_oldest_hours} giờ`,
      act: "Mở hàng duyệt đề xuất", href: "/admin/khu-pho?tab=de-xuat&status=pending_review",
    });
  }
  if (fraud.ip_clusters > 0) {
    out.push({
      sev: "crit",
      msg: `${fmtN.format(fraud.ip_clusters)} cụm IP có ≥3 tài khoản mới trong 24h`,
      sla: "Heuristic gian lận — kiểm tra trước khi duyệt điểm",
      act: "Mở màn chống gian lận", href: "/admin/gian-lan",
    });
  }
  if (fraud.burst_targets > 0) {
    out.push({
      sev: "crit",
      msg: `${fmtN.format(fraud.burst_targets)} người nhận thương hàng loạt từ tài khoản mới`,
      act: "Mở màn chống gian lận", href: "/admin/gian-lan",
    });
  }
  if (ops.suggestions_pending > 0) {
    out.push({
      sev: "warn",
      msg: `${fmtN.format(ops.suggestions_pending)} câu nhắc chờ duyệt 4N`,
      sla: ops.suggestions_oldest_days > 0 ? `Cũ nhất đã chờ ${ops.suggestions_oldest_days} ngày` : undefined,
      act: "Mở hàng duyệt câu", href: "/admin/loi-nhac?status=submitted",
    });
  }
  if (ops.leads_new_over_48h > 0) {
    out.push({
      sev: "warn",
      msg: `${fmtN.format(ops.leads_new_over_48h)} leads mới chưa liên hệ quá 48h`,
      act: "Mở danh sách leads", href: "/admin/leads",
    });
  }
  if (ops.selected_over_14d > 0) {
    out.push({
      sev: "warn",
      msg: `${fmtN.format(ops.selected_over_14d)} biển đã chọn quá 14 ngày chưa sản xuất`,
      act: "Mở vòng đời biển", href: "/admin/loi-nhac?tab=bien",
    });
  }
  if (fraud.fast_voters > 0) {
    out.push({
      sev: "warn",
      msg: `${fmtN.format(fraud.fast_voters)} tài khoản vote hơn 20 lượt/giờ`,
      act: "Mở màn chống gian lận", href: "/admin/gian-lan",
    });
  }
  if (out.length === 0) {
    out.push({ sev: "good", msg: "Không có mục quá hạn hay tín hiệu bất thường", sla: "Hàng đợi trong SLA" });
  }
  return out;
}
