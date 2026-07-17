"use client";
// Chọn câu & vòng đời biển (04 §4): approved (xếp theo thương) → selected → produced → installed
import { useCallback, useEffect, useState } from "react";
import { apiGet, apiSend, apiUpload } from "@/components/client-api";
import { Btn, Card } from "@/components/admin/AdminShell";
import { categoryIcon, categoryLabel } from "@/lib/taxonomy";

interface Sugg {
  id: string; content: string; status: string; author_name: string; votes: number;
  issue_id: string; category: string; location_text: string; neighborhood_name: string;
}

export default function SignsPage() {
  const [approved, setApproved] = useState<Sugg[]>([]);
  const [selected, setSelected] = useState<Sugg[]>([]);
  const [produced, setProduced] = useState<Sugg[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [selectNoteId, setSelectNoteId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [installDate, setInstallDate] = useState("");

  const load = useCallback(async () => {
    try {
      const [a, s, p] = await Promise.all([
        apiGet<{ suggestions: Sugg[] }>("/api/admin/suggestions?status=approved"),
        apiGet<{ suggestions: Sugg[] }>("/api/admin/suggestions?status=selected"),
        apiGet<{ suggestions: Sugg[] }>("/api/admin/suggestions?status=produced"),
      ]);
      setApproved(a.suggestions); setSelected(s.suggestions); setProduced(p.suggestions);
    } catch { /* bỏ qua */ }
  }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (id: string, action: string, extra?: Record<string, unknown>) => {
    try {
      await apiSend("PATCH", `/api/admin/suggestions/${id}`, { action, ...extra });
      setSelectNoteId(null); setNote("");
      setMsg(
        action === "installed"
          ? "🎉 Đã treo biển: pin xanh, +30đ tác giả, counter +1, đã tạo thông báo in-web (không SMS)"
          : "Đã cập nhật"
      );
      load();
    } catch (e) { setMsg(e instanceof Error ? e.message : "Có lỗi"); }
  };

  const uploadSignPhoto = async (id: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    try {
      await apiUpload(`/api/admin/suggestions/${id}/sign-photo`, form);
      setMsg("Đã lưu ảnh biển");
    } catch (e) { setMsg(e instanceof Error ? e.message : "Lỗi upload"); }
  };

  // Nhóm câu approved theo issue, xếp theo thương
  const byIssue = new Map<string, Sugg[]>();
  for (const s of approved) {
    byIssue.set(s.issue_id, [...(byIssue.get(s.issue_id) || []), s]);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold">Chọn câu & quản lý vòng đời biển</h1>
      {msg && <p className="rounded-xl bg-white px-3 py-2 text-sm shadow-sm">{msg}</p>}

      <Card title="Đang bình chọn — chọn câu lên biển (gợi ý: câu cao phiếu nhất)">
        {byIssue.size === 0 && <p className="text-sm text-ink-soft">Chưa có câu nào được duyệt đang chờ chọn.</p>}
        <div className="space-y-4">
          {[...byIssue.entries()].map(([issueId, suggs]) => {
            const sorted = [...suggs].sort((a, b) => b.votes - a.votes);
            const top = sorted[0];
            return (
              <div key={issueId} className="rounded-2xl border border-cream-dark p-4">
                <div className="text-sm font-bold">
                  {categoryIcon(top.category)} {categoryLabel(top.category)} · {top.location_text}
                  <span className="ml-1 text-xs font-medium text-ink-soft">· {top.neighborhood_name}</span>
                </div>
                <div className="mt-2 space-y-2">
                  {sorted.map((s, i) => (
                    <div key={s.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-cream px-3 py-2">
                      <span className="text-sm font-semibold">“{s.content}”</span>
                      <span className="text-xs text-ink-soft">— {s.author_name}</span>
                      <span className="ml-auto text-xs font-bold text-brick">💛 {s.votes}</span>
                      {i === 0 ? (
                        <Btn onClick={() => act(s.id, "select")}>Chọn câu này lên biển</Btn>
                      ) : (
                        <Btn variant="outline" onClick={() => setSelectNoteId(selectNoteId === s.id ? null : s.id)}>
                          Chọn (cần lý do)
                        </Btn>
                      )}
                      {selectNoteId === s.id && (
                        <span className="flex w-full gap-2">
                          <input
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Lý do chọn câu không cao phiếu nhất (trung lập/rủi ro nội dung)"
                            className="flex-1 rounded-xl border border-cream-dark bg-white px-3 py-1.5 text-xs"
                          />
                          <Btn onClick={() => act(s.id, "select", { note })}>OK</Btn>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="Đã chọn → đưa sản xuất">
        {selected.length === 0 && <p className="text-sm text-ink-soft">Trống.</p>}
        {selected.map((s) => (
          <Row key={s.id} s={s}>
            <Btn onClick={() => act(s.id, "produced")}>Đưa sản xuất</Btn>
          </Row>
        ))}
      </Card>

      <Card title="Đang sản xuất → đã treo biển (kèm ảnh biển + ngày treo)">
        {produced.length === 0 && <p className="text-sm text-ink-soft">Trống.</p>}
        {produced.map((s) => (
          <Row key={s.id} s={s}>
            <label className="cursor-pointer rounded-full border border-brick px-3.5 py-1.5 text-xs font-bold text-brick">
              Ảnh biển…
              <input
                type="file" accept="image/*" className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadSignPhoto(s.id, e.target.files[0])}
              />
            </label>
            <input
              type="date" value={installDate} onChange={(e) => setInstallDate(e.target.value)}
              className="rounded-xl border border-cream-dark px-2 py-1 text-xs"
            />
            <Btn onClick={() => act(s.id, "installed", { installed_date: installDate || undefined })}>
              Đã treo biển
            </Btn>
          </Row>
        ))}
      </Card>
    </div>
  );
}

function Row({ s, children }: { s: Sugg; children: React.ReactNode }) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl bg-cream px-3 py-2 last:mb-0">
      <span className="text-sm font-semibold">“{s.content}”</span>
      <span className="text-xs text-ink-soft">
        — {s.author_name} · {s.location_text} · {s.neighborhood_name}
      </span>
      <span className="ml-auto flex flex-wrap items-center gap-2">{children}</span>
    </div>
  );
}
