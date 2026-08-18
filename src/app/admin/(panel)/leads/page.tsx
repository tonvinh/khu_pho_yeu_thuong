"use client";
// Quản lý leads (04 §6): chỉ opted_in; SĐT che, bấm-để-hiện có log; export CSV có log
import { useCallback, useEffect, useState } from "react";
import { apiGet, apiSend, BASE } from "@/components/client-api";
import { Btn, Card } from "@/components/admin/AdminShell";
import { INTERESTS } from "@/lib/taxonomy";

interface Lead {
  id: string; name: string | null; phone_masked: string; neighborhood_text: string | null;
  // 18/8: form ưu đãi tách tỉnh thành + địa chỉ ra 2 cột riêng (trước gộp vào neighborhood_text)
  province: string | null; address: string | null;
  interests: string[]; source: string; status: string; note: string | null; created_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  new: "Mới", contacted: "Đã liên hệ", converted: "Chuyển đổi", closed: "Đóng",
};

export default function LeadsPage() {
  const [rows, setRows] = useState<Lead[]>([]);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  // Lọc theo tỉnh — sale chia vùng, cũng áp vào file CSV xuất ra
  const [province, setProvince] = useState("");
  const [provinces, setProvinces] = useState<string[]>([]);

  const load = useCallback(() => {
    const qs = province ? `?province=${encodeURIComponent(province)}` : "";
    apiGet<{ leads: Lead[] }>(`/api/admin/leads${qs}`).then((r) => setRows(r.leads)).catch(() => {});
  }, [province]);
  useEffect(load, [load]);

  // Danh sách tỉnh cho ô lọc lấy từ toàn bộ lead (không phụ thuộc bộ lọc đang chọn)
  useEffect(() => {
    apiGet<{ leads: Lead[] }>("/api/admin/leads")
      .then((r) => setProvinces([...new Set(r.leads.map((l) => l.province).filter(Boolean) as string[])].sort()))
      .catch(() => {});
  }, []);

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
        <div className="flex flex-wrap items-center gap-2">
        <select
          value={province}
          onChange={(e) => setProvince(e.target.value)}
          className="rounded-full border border-cream-dark bg-white px-3 py-2 text-sm"
        >
          <option value="">Tất cả tỉnh thành ({rows.length})</option>
          {provinces.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <a
          href={`${BASE}/api/admin/leads?format=csv${province ? `&province=${encodeURIComponent(province)}` : ""}`}
          className="rounded-full bg-brick px-4 py-2 text-sm font-bold text-white"
        >
          ⬇ Export CSV (có log)
        </a>
        </div>
      </div>
      {msg && <p className="rounded-xl bg-white px-3 py-2 text-sm shadow-sm">{msg}</p>}

      <Card>
        {rows.length === 0 && <p className="text-sm text-ink-soft">Chưa có lead nào.</p>}
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              {/* Header đông cứng khi cuộn: sticky + kẻ dưới bằng shadow */}
              <tr className="text-left text-xs text-ink-soft">
                {["Thời gian", "Tên", "SĐT", "Tỉnh thành", "Địa chỉ", "Quan tâm", "Nguồn", "Trạng thái"].map((h) => (
                  <th key={h} className="sticky top-0 z-10 bg-white py-2 pr-3 shadow-[0_1px_0_0_var(--color-cream-dark)]">
                    {h}
                  </th>
                ))}
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
                  <td className="py-2.5 pr-3">{l.province || "—"}</td>
                  {/* Lead cũ (trước 18/8) chưa có cột địa chỉ → hiện lại khu phố đã nhập */}
                  <td className="py-2.5 pr-3">{l.address || l.neighborhood_text || "—"}</td>
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
