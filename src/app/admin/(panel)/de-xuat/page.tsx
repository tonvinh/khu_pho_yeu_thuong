"use client";
// Duyệt đề xuất vấn đề (04 §2)
import { useCallback, useEffect, useState } from "react";
import { apiGet, apiSend } from "@/components/client-api";
import { Btn, Card } from "@/components/admin/AdminShell";
import { categoryIcon, categoryLabel } from "@/lib/taxonomy";
import { formatAddress } from "@/lib/address";

interface PendingIssue {
  id: string; category: string; location_text: string; description: string | null;
  created_at: string; neighborhood_name: string; ward: string | null; city: string | null;
  hidden: boolean; proposer_name: string | null; attached_suggestion: string | null;
}

const CRITERIA = [
  "Thuộc danh mục an toàn đời thường",
  "Không đích danh người/nhà",
  "Vị trí đủ cụ thể",
  "Không trùng vấn đề đã có",
];

export default function ReviewIssuesPage() {
  const [rows, setRows] = useState<PendingIssue[]>([]);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    apiGet<{ issues: PendingIssue[] }>("/api/admin/issues?status=pending_review")
      .then((r) => setRows(r.issues)).catch(() => {});
  }, []);
  useEffect(load, [load]);

  const act = async (id: string, action: "approve" | "reject") => {
    try {
      await apiSend("PATCH", `/api/admin/issues/${id}`, { action, note: action === "reject" ? note : undefined });
      setRejectId(null);
      setNote("");
      setMsg(action === "approve" ? "Đã duyệt — hiện công khai với pin đỏ, +2đ (nếu chưa vượt trần 3/tuần)" : "Đã từ chối (ẩn, lý do lưu nội bộ)");
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Có lỗi");
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold">Duyệt đề xuất vấn đề</h1>
      <Card>
        <div className="mb-3 flex flex-wrap gap-2 text-[11px] text-ink-soft">
          {CRITERIA.map((c) => <span key={c} className="rounded-full bg-cream px-2.5 py-1">✓ {c}</span>)}
        </div>
        {msg && <p className="mb-3 rounded-xl bg-cream px-3 py-2 text-sm">{msg}</p>}
        {rows.length === 0 && <p className="text-sm text-ink-soft">Hàng chờ trống 🎉</p>}
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="rounded-2xl border border-cream-dark p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <strong>{categoryIcon(r.category)} {categoryLabel(r.category)}</strong>
                <span>· {formatAddress(r.location_text, r.ward || r.neighborhood_name, r.city)}</span>
                {r.hidden && (
                  <span className="rounded-full bg-status-voting-bg px-2 py-0.5 text-[11px] font-semibold text-status-voting">
                    Khu phố mới (dân tự nhập) — duyệt sẽ hiện công khai
                  </span>
                )}
                <span className="ml-auto text-xs text-ink-soft">
                  {r.proposer_name || "—"} · {new Date(r.created_at).toLocaleString("vi-VN")}
                </span>
              </div>
              {r.description && <p className="mt-1.5 text-sm text-ink-soft">{r.description}</p>}
              {r.attached_suggestion && (
                <p className="mt-1.5 rounded-xl bg-cream px-3 py-2 text-sm">
                  💬 Câu nhắc gửi kèm: “{r.attached_suggestion}”
                  <span className="block text-xs text-ink-soft">
                    Duyệt đề xuất xong, câu này sẽ vào hàng “Duyệt câu nhắc” như bình thường.
                  </span>
                </p>
              )}
              <div className="mt-3 flex gap-2">
                <Btn onClick={() => act(r.id, "approve")}>Duyệt</Btn>
                <Btn variant="outline" onClick={() => setRejectId(rejectId === r.id ? null : r.id)}>Từ chối…</Btn>
              </div>
              {rejectId === r.id && (
                <div className="mt-2 flex gap-2">
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Lý do nội bộ (không hiển thị công khai)"
                    className="flex-1 rounded-xl border border-cream-dark bg-cream px-3 py-2 text-sm"
                  />
                  <Btn variant="danger" onClick={() => act(r.id, "reject")}>Xác nhận từ chối</Btn>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
