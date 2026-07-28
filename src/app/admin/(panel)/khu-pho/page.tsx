"use client";
// Khu phố: tiến độ, chứng nhận 4N (04 §5), link trình quản lý bản đồ (04 §10)
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, apiSend } from "@/components/client-api";
import { Btn, Card } from "@/components/admin/AdminShell";

interface Nb {
  id: string; name: string; ward: string | null; district: string | null;
  slug: string; certified_4n: boolean; certified_at: string | null;
  has_map: boolean; total_issues: number; signed_issues: number;
}

export default function NeighborhoodsPage() {
  const [rows, setRows] = useState<Nb[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  const load = useCallback(() => {
    apiGet<{ neighborhoods: Nb[] }>("/api/admin/neighborhoods")
      .then((r) => setRows(r.neighborhoods)).catch(() => {});
  }, []);
  useEffect(load, [load]);

  const certify = async (id: string) => {
    try {
      await apiSend("PATCH", `/api/admin/neighborhoods/${id}/certify`, {});
      setMsg("Đã cấp chứng nhận 'Khu phố biết thương' chuẩn 4N 🏅");
      load();
    } catch (e) { setMsg(e instanceof Error ? e.message : "Có lỗi"); }
  };

  const addNb = async () => {
    if (!newName.trim()) return;
    try {
      await apiSend("POST", "/api/admin/neighborhoods", { name: newName.trim() });
      setNewName("");
      load();
    } catch (e) { setMsg(e instanceof Error ? e.message : "Có lỗi"); }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold">Khu phố & chứng nhận</h1>
      {msg && <p className="rounded-xl bg-white px-3 py-2 text-sm shadow-sm">{msg}</p>}

      <Card>
        <div className="mb-4 flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Thêm khu phố mới (tên)…"
            className="flex-1 rounded-xl border border-cream-dark bg-cream px-3 py-2 text-sm"
          />
          <Btn onClick={addNb}>Thêm</Btn>
        </div>

        <div className="space-y-2">
          {rows.map((n) => {
            const pct = n.total_issues === 0 ? 0 : Math.round((n.signed_issues / n.total_issues) * 100);
            return (
              <div key={n.id} className="rounded-2xl border border-cream-dark p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <strong>{n.name}</strong>
                  {n.certified_4n && (
                    <span className="rounded-full bg-status-signed/10 px-2 py-0.5 text-xs font-bold text-status-signed">
                      🏅 Chuẩn 4N
                    </span>
                  )}
                  <span className="text-xs text-ink-soft">
                    {[n.ward, n.district].filter(Boolean).join(", ")}
                  </span>
                  <span className="ml-auto text-xs font-semibold">
                    {n.signed_issues}/{n.total_issues} biển · {pct}%
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-cream-dark">
                  <div className="h-full rounded-full bg-status-signed" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/admin/khu-pho/${n.id}/ban-do`}
                    className="rounded-full border border-brick px-3.5 py-1.5 text-xs font-bold text-brick"
                  >
                    {n.has_map ? "🗺️ Quản lý bản đồ & pins" : "🗺️ Upload bản đồ…"}
                  </Link>
                  {!n.certified_4n && n.total_issues > 0 && n.signed_issues === n.total_issues && (
                    <Btn onClick={() => certify(n.id)}>Cấp chứng nhận 4N</Btn>
                  )}
                  <a
                    href={`/khu-pho/${n.slug}`} target="_blank"
                    className="rounded-full px-3.5 py-1.5 text-xs font-semibold text-ink-soft underline"
                  >
                    Trang công khai ↗
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
