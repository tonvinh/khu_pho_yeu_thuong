"use client";
// Duyệt câu nhắc với checklist 4N THỦ CÔNG (Q2, 04 §3):
// nút "Duyệt hiển thị" chỉ bật khi admin tick đủ 4 ô Nhắc · Nhở · Nhỏ · Nhẹ.
import { useCallback, useEffect, useState } from "react";
import { apiGet, apiSend } from "@/components/client-api";
import { Btn, Card } from "@/components/admin/AdminShell";
import { categoryIcon, categoryLabel } from "@/lib/taxonomy";

interface PendingSuggestion {
  id: string; content: string; created_at: string; author_name: string;
  category: string; location_text: string; neighborhood_name: string;
}

const FOUR_N: Array<{ key: "nhac" | "nho" | "nho2" | "nhe"; label: string; hint: string }> = [
  { key: "nhac", label: "Nhắc", hint: "Nhắc một hành vi cụ thể, tích cực" },
  { key: "nho", label: "Nhở", hint: "Giọng gợi nhớ nhẹ nhàng, không ra lệnh (không 'cấm', 'phạt'...)" },
  { key: "nho2", label: "Nhỏ", hint: "≤120 ký tự, ≤2 mệnh đề — vừa một tấm biển" },
  { key: "nhe", label: "Nhẹ", hint: "Không công kích, không đích danh người/nhà, không tiêu cực" },
];

type Checks = Record<"nhac" | "nho" | "nho2" | "nhe", boolean>;
const EMPTY: Checks = { nhac: false, nho: false, nho2: false, nhe: false };

export default function ReviewSuggestionsPage() {
  const [rows, setRows] = useState<PendingSuggestion[]>([]);
  const [checks, setChecks] = useState<Record<string, Checks>>({});
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    apiGet<{ suggestions: PendingSuggestion[] }>("/api/admin/suggestions?status=submitted")
      .then((r) => setRows(r.suggestions)).catch(() => {});
  }, []);
  useEffect(load, [load]);

  const toggle = (id: string, key: keyof Checks) =>
    setChecks((c) => ({ ...c, [id]: { ...(c[id] || EMPTY), [key]: !(c[id] || EMPTY)[key] } }));

  const approve = async (id: string) => {
    try {
      await apiSend("PATCH", `/api/admin/suggestions/${id}`, { action: "approve", review_4n: checks[id] });
      setMsg("Đã duyệt hiển thị — mở bình chọn, +5đ cho tác giả");
      load();
    } catch (e) { setMsg(e instanceof Error ? e.message : "Có lỗi"); }
  };

  const reject = async (id: string) => {
    try {
      await apiSend("PATCH", `/api/admin/suggestions/${id}`, { action: "reject", note });
      setRejectId(null); setNote("");
      setMsg("Đã từ chối");
      load();
    } catch (e) { setMsg(e instanceof Error ? e.message : "Có lỗi"); }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold">Duyệt câu nhắc — checklist 4N</h1>
      {msg && <p className="rounded-xl bg-white px-3 py-2 text-sm shadow-sm">{msg}</p>}
      <Card>
        {rows.length === 0 && <p className="text-sm text-ink-soft">Hàng chờ trống 🎉</p>}
        <div className="space-y-4">
          {rows.map((r) => {
            const c = checks[r.id] || EMPTY;
            const all4 = c.nhac && c.nho && c.nho2 && c.nhe;
            return (
              <div key={r.id} className="rounded-2xl border border-cream-dark p-4">
                <p className="text-lg font-bold leading-snug">“{r.content}”</p>
                <p className="mt-1 text-xs text-ink-soft">
                  — {r.author_name} · {categoryIcon(r.category)} {categoryLabel(r.category)} ·{" "}
                  {r.location_text} · {r.neighborhood_name} ·{" "}
                  {new Date(r.created_at).toLocaleString("vi-VN")} · {r.content.length}/120 ký tự
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {FOUR_N.map((f) => (
                    <label
                      key={f.key}
                      className={`flex cursor-pointer items-start gap-2 rounded-xl border p-2.5 text-sm ${
                        c[f.key] ? "border-status-signed bg-status-signed/5" : "border-cream-dark"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={c[f.key]}
                        onChange={() => toggle(r.id, f.key)}
                        className="mt-0.5 h-4 w-4 accent-brick"
                      />
                      <span>
                        <strong>{f.label}</strong>
                        <span className="block text-xs text-ink-soft">{f.hint}</span>
                      </span>
                    </label>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Btn onClick={() => approve(r.id)} disabled={!all4}>
                    Duyệt hiển thị {all4 ? "" : "(cần đủ 4 ô)"}
                  </Btn>
                  <Btn variant="outline" onClick={() => setRejectId(rejectId === r.id ? null : r.id)}>
                    Từ chối…
                  </Btn>
                </div>
                {rejectId === r.id && (
                  <div className="mt-2 flex gap-2">
                    <input
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Lý do (nội bộ)"
                      className="flex-1 rounded-xl border border-cream-dark bg-cream px-3 py-2 text-sm"
                    />
                    <Btn variant="danger" onClick={() => reject(r.id)}>Xác nhận</Btn>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
