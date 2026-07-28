"use client";
// Quản lý leads (04 §6): chỉ opted_in; SĐT che, bấm-để-hiện có log; export CSV có log
import { useCallback, useEffect, useState } from "react";
import { apiGet, apiSend, BASE } from "@/components/client-api";
import { Btn, Card } from "@/components/admin/AdminShell";
import { INTERESTS } from "@/lib/taxonomy";

interface Lead {
  id: string; name: string | null; phone_masked: string; neighborhood_text: string | null;
  interests: string[]; source: string; status: string; note: string | null; created_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  new: "Mới", contacted: "Đã liên hệ", converted: "Chuyển đổi", closed: "Đóng",
};

export default function LeadsPage() {
  const [rows, setRows] = useState<Lead[]>([]);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    apiGet<{ leads: Lead[] }>("/api/admin/leads").then((r) => setRows(r.leads)).catch(() => {});
  }, []);
  useEffect(load, [load]);

  const reveal = async (id: string) => {
    try {
      const r = await apiGet<{ phone: string }>(`/api/admin/leads/${id}`);
      setRevealed((m) => ({ ...m, [id]: r.phone }));
    } catch (e) { setMsg(e instanceof Error ? e.message : "Có lỗi"); }
  };

  const setStatus = async (id: string, status: string) => {
    try {
      await apiSend("PATCH", `/api/admin/leads/${id}`, { status });
      load();
    } catch (e) { setMsg(e instanceof Error ? e.message : "Có lỗi"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold">Leads (chỉ bản ghi đã opt-in)</h1>
        <a
          href={`${BASE}/api/admin/leads?format=csv`}
          className="rounded-full bg-brick px-4 py-2 text-sm font-bold text-white"
        >
          ⬇ Export CSV (có log)
        </a>
      </div>
      {msg && <p className="rounded-xl bg-white px-3 py-2 text-sm shadow-sm">{msg}</p>}

      <Card>
        {rows.length === 0 && <p className="text-sm text-ink-soft">Chưa có lead nào.</p>}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-cream-dark text-left text-xs text-ink-soft">
                <th className="py-2 pr-3">Thời gian</th>
                <th className="py-2 pr-3">Tên</th>
                <th className="py-2 pr-3">SĐT</th>
                <th className="py-2 pr-3">Khu phố</th>
                <th className="py-2 pr-3">Quan tâm</th>
                <th className="py-2 pr-3">Nguồn</th>
                <th className="py-2 pr-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id} className="border-b border-cream-dark/60 align-top">
                  <td className="py-2.5 pr-3 text-xs text-ink-soft">
                    {new Date(l.created_at).toLocaleString("vi-VN")}
                  </td>
                  <td className="py-2.5 pr-3 font-semibold">{l.name || "—"}</td>
                  <td className="py-2.5 pr-3">
                    {revealed[l.id] ? (
                      <span className="font-mono">{revealed[l.id]}</span>
                    ) : (
                      <button onClick={() => reveal(l.id)} className="font-mono underline" title="Bấm để hiện (có log truy cập)">
                        {l.phone_masked}
                      </button>
                    )}
                  </td>
                  <td className="py-2.5 pr-3">{l.neighborhood_text || "—"}</td>
                  <td className="py-2.5 pr-3 text-xs">
                    {l.interests.map((i) => (INTERESTS as Record<string, string>)[i] || i).join(", ") || "—"}
                  </td>
                  <td className="py-2.5 pr-3 text-xs">
                    {l.source === "soft_drawer" ? "Tầng 1 (drawer)" : "Tầng 2 (ưu đãi)"}
                  </td>
                  <td className="py-2.5 pr-3">
                    <select
                      value={l.status}
                      onChange={(e) => setStatus(l.id, e.target.value)}
                      className="rounded-lg border border-cream-dark bg-cream px-2 py-1 text-xs"
                    >
                      {Object.entries(STATUS_LABEL).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
