"use client";
// Dashboard tổng quan (04 §1)
import { useEffect, useState } from "react";
import { apiGet } from "@/components/client-api";
import { Card } from "@/components/admin/AdminShell";

interface Dash {
  counters: { signs_installed: number; issues_waiting: number; contributors: number; neighborhoods_joined: number };
  ops: { issues_pending: number; suggestions_pending: number; selected_not_produced: number; producing: number };
  leads: { tier1: number; tier2: number; new: number; contacted: number; converted: number };
  daily: Array<{ day: string; suggestions: number; votes: number; leads: number }>;
}

export default function AdminDashboard() {
  const [d, setD] = useState<Dash | null>(null);
  useEffect(() => { apiGet<Dash>("/api/admin/dashboard").then(setD).catch(() => {}); }, []);
  if (!d) return <p className="text-ink-soft">Đang tải…</p>;

  const maxVal = Math.max(1, ...d.daily.map((x) => Math.max(x.suggestions, x.votes, x.leads)));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Biển đã treo" value={d.counters.signs_installed} color="text-status-signed" />
        <Kpi label="Vấn đề đang chờ" value={d.counters.issues_waiting} color="text-status-voting" />
        <Kpi label="Người đóng góp" value={d.counters.contributors} color="text-brick" />
        <Kpi label="Khu phố tham gia" value={d.counters.neighborhoods_joined} color="text-accent-blue" />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Đề xuất chờ duyệt" value={d.ops.issues_pending} />
        <Kpi label="Câu chờ duyệt" value={d.ops.suggestions_pending} />
        <Kpi label="Đã chọn, chưa sản xuất" value={d.ops.selected_not_produced} />
        <Kpi label="Đang sản xuất" value={d.ops.producing} />
      </div>

      <Card title="Thương mại (chỉ admin thấy)">
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
          <Kpi small label="Lead tầng 1" value={d.leads.tier1} />
          <Kpi small label="Lead tầng 2" value={d.leads.tier2} />
          <Kpi small label="Mới" value={d.leads.new} />
          <Kpi small label="Đã liên hệ" value={d.leads.contacted} />
          <Kpi small label="Chuyển đổi" value={d.leads.converted} />
        </div>
      </Card>

      <Card title="14 ngày gần nhất — câu nhắc · lượt thương · lead">
        <div className="flex items-end gap-1.5 overflow-x-auto pb-2">
          {d.daily.map((x) => (
            <div key={x.day} className="flex shrink-0 flex-col items-center gap-0.5">
              <div className="flex items-end gap-0.5" style={{ height: 90 }}>
                <div className="w-2.5 rounded-t bg-brick" style={{ height: (x.suggestions / maxVal) * 90 || 2 }} title={`${x.suggestions} câu`} />
                <div className="w-2.5 rounded-t bg-status-voting" style={{ height: (x.votes / maxVal) * 90 || 2 }} title={`${x.votes} thương`} />
                <div className="w-2.5 rounded-t bg-accent-blue" style={{ height: (x.leads / maxVal) * 90 || 2 }} title={`${x.leads} lead`} />
              </div>
              <div className="text-[9px] text-ink-soft">
                {new Date(x.day).getDate()}/{new Date(x.day).getMonth() + 1}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-1 flex gap-3 text-[11px] text-ink-soft">
          <span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-brick" />Câu nhắc</span>
          <span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-status-voting" />Lượt thương</span>
          <span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-accent-blue" />Lead</span>
        </div>
      </Card>
    </div>
  );
}

function Kpi({ label, value, color, small }: { label: string; value: number; color?: string; small?: boolean }) {
  return (
    <div className="rounded-2xl bg-white p-4 text-center shadow-sm">
      <div className={`font-extrabold ${small ? "text-xl" : "text-3xl"} ${color || "text-ink"}`}>{value}</div>
      <div className="mt-1 text-xs font-medium text-ink-soft">{label}</div>
    </div>
  );
}
