"use client";
// Đề xuất góc phố — gộp từ trang /admin/de-xuat cũ vào màn Khu phố (4/8).
// Ngoài hàng chờ duyệt (04 §2) còn xem được MỌI trạng thái: lọc theo trạng thái / chủ đề /
// khu phố, tìm kiếm theo vị trí – mô tả – khu phố – người đề xuất, phân trang.
// Toàn bộ bộ lọc do trang cha giữ trên URL (chia sẻ link ra đúng màn đang xem).
import { useCallback, useEffect, useState } from "react";
import { apiGet, apiSend } from "@/components/client-api";
import { Btn, Card } from "@/components/admin/AdminShell";
import { Pager, SearchBox, Tabs, Th } from "@/components/admin/table-tools";
import { CATEGORIES, CATEGORY_CODES, categoryIcon, categoryLabel } from "@/lib/taxonomy";

interface Issue {
  id: string; category: string; location_text: string; description: string | null;
  status: string; created_at: string; approved_at: string | null; review_note: string | null;
  neighborhood_id: string; neighborhood_name: string; ward: string | null; city: string | null;
  hidden: boolean; proposer_name: string | null;
  suggestion_count: number; attached_suggestion: string | null;
}
interface Nb { id: string; name: string; city: string | null; ward: string | null }
interface Counts { all: number; pending_review: number; waiting: number; voting: number; signed: number; rejected: number }

export const ISSUE_STATUS_LABEL: Record<string, string> = {
  pending_review: "Chờ duyệt",
  waiting: "Đã duyệt — đang chờ câu",
  voting: "Đang bình chọn",
  signed: "Đã có biển",
  rejected: "Từ chối",
};
const STATUS_CLASS: Record<string, string> = {
  pending_review: "bg-status-voting-bg text-status-voting",
  waiting: "bg-cream text-ink",
  voting: "bg-status-voting-bg text-status-voting",
  signed: "bg-status-signed text-white",
  rejected: "bg-status-waiting-bg text-status-waiting",
};
const CRITERIA = [
  "Thuộc danh mục an toàn đời thường",
  "Không đích danh người/nhà",
  "Vị trí đủ cụ thể",
  "Không trùng vấn đề đã có",
];

export default function IssuesPanel({
  status, category, nbId, search, page, per, onChange, nbs, cities, onChanged,
}: {
  status: string; category: string; nbId: string; search: string; page: number; per: number;
  onChange: (patch: Record<string, string>) => void;
  nbs: Nb[]; cities: string[];
  /** Duyệt đề xuất có thể bỏ ẩn khu phố dân tự nhập → nạp lại bảng khu phố */
  onChanged: () => void;
}) {
  const [rows, setRows] = useState<Issue[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    const p = new URLSearchParams({ status, page: String(page), per: String(per) });
    if (category) p.set("category", category);
    if (nbId.startsWith("city:")) p.set("city", nbId.slice(5));
    else if (nbId) p.set("neighborhood", nbId);
    if (search) p.set("q", search);
    apiGet<{ issues: Issue[]; total: number; counts: Counts }>(`/api/admin/issues?${p}`)
      .then((r) => { setRows(r.issues); setTotal(r.total); setCounts(r.counts); })
      .catch(() => {});
  }, [status, category, nbId, search, page, per]);
  useEffect(load, [load]);

  // Link dán tay trỏ tới trang không còn tồn tại (VD ?page=9) → kéo về trang cuối.
  // Chỉ xét khi đã có dữ liệu (total > 0) để không phá page của link lúc chưa tải xong.
  useEffect(() => {
    const pages = Math.ceil(total / per);
    if (total > 0 && page > pages) onChange({ page: String(pages) });
  }, [total, per, page, onChange]);

  const notify = (text: string, ok = true) => {
    setMsg({ text, ok });
    window.setTimeout(() => setMsg(null), 6000);
  };

  const act = async (id: string, action: "approve" | "reject") => {
    if (busy) return;
    setBusy(true);
    try {
      await apiSend("PATCH", `/api/admin/issues/${id}`, {
        action, note: action === "reject" ? note : undefined,
      });
      setRejectId(null); setNote("");
      notify(action === "approve"
        ? "Đã duyệt — góc phố hiện công khai, +2đ cho người đề xuất (nếu chưa vượt trần 3/tuần)"
        : "Đã từ chối (ẩn, lý do lưu nội bộ)");
      load();
      onChanged();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Có lỗi xảy ra", false);
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-3">
      {msg && (
        <p className={`rounded-xl px-3 py-2 text-sm font-semibold shadow-sm ${
          msg.ok ? "bg-white text-status-signed" : "bg-status-waiting/10 text-status-waiting"
        }`}>
          {msg.text}
        </p>
      )}

      <Tabs
        value={status}
        onChange={(v) => onChange({ status: v, page: "1" })}
        items={[
          { key: "all", label: "Tất cả", badge: counts?.all },
          ...Object.entries(ISSUE_STATUS_LABEL).map(([k, v]) => ({
            key: k, label: v, badge: counts?.[k as keyof Counts],
          })),
        ]}
      />

      <Card>
        <div className="grid gap-2 md:grid-cols-4">
          <SearchBox
            value={search}
            onChange={(v) => onChange({ q: v, page: "1" })}
            placeholder="🔍 Tìm vị trí, mô tả, khu phố, người đề xuất…"
            className="md:col-span-2"
          />
          <select
            value={category}
            onChange={(e) => onChange({ category: e.target.value, page: "1" })}
            className="rounded-xl border border-cream-dark bg-cream px-3 py-2 text-sm"
          >
            <option value="">Chủ đề: tất cả</option>
            {CATEGORY_CODES.map((c) => (
              <option key={c} value={c}>{CATEGORIES[c].icon} {CATEGORIES[c].label}</option>
            ))}
          </select>
          <NbSelect
            value={nbId}
            onChange={(v) => onChange({ nb: v, page: "1" })}
            nbs={nbs}
            cities={cities}
          />
        </div>
        {status === "pending_review" && (
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-ink-soft">
            {CRITERIA.map((c) => <span key={c} className="rounded-full bg-cream px-2.5 py-1">✓ {c}</span>)}
          </div>
        )}
      </Card>

      <div className="max-h-[70vh] overflow-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr className="text-left text-xs text-ink-soft">
              <Th className="w-[34%]">Góc phố (vị trí · mô tả)</Th>
              <Th>Chủ đề</Th>
              <Th className="min-w-[150px]">Khu phố</Th>
              <Th>Trạng thái</Th>
              <Th className="text-center" title="Số câu nhắc đã gửi cho góc phố này">Câu</Th>
              <Th>Người đề xuất</Th>
              <Th>Gửi lúc</Th>
              <Th className="text-right">Thao tác</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-sm text-ink-soft">
                  {status === "pending_review" ? "Hàng chờ trống 🎉" : "Không có đề xuất nào khớp bộ lọc."}
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-cream-dark/60 align-top last:border-0 hover:bg-cream/40">
                <td className="px-3 py-2.5">
                  <div className="font-bold leading-snug">📍 {r.location_text}</div>
                  {r.description && <p className="mt-0.5 text-xs text-ink-soft">{r.description}</p>}
                  {r.attached_suggestion && (
                    <p className="mt-1 rounded-lg bg-cream px-2 py-1 text-[11px]">
                      💬 Câu nhắc gửi kèm: “{r.attached_suggestion}”
                      {r.status === "pending_review" && (
                        <span className="block text-ink-soft">
                          Duyệt xong, câu này vào hàng “Chờ duyệt” bên Lời nhắc.
                        </span>
                      )}
                    </p>
                  )}
                  {r.status === "rejected" && r.review_note && (
                    <p className="mt-0.5 text-[11px] text-status-waiting">Lý do: {r.review_note}</p>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <span className="whitespace-nowrap text-xs font-semibold">
                    {categoryIcon(r.category)} {categoryLabel(r.category)}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <div className="font-semibold leading-snug">{r.neighborhood_name}</div>
                  <div className="text-[11px] leading-4 text-ink-soft">
                    {r.city || "Chưa có tỉnh/thành"}{r.ward ? ` · ${r.ward}` : ""}
                  </div>
                  {r.hidden && (
                    <span className="mt-1 inline-block rounded-full bg-status-voting-bg px-2 py-0.5 text-[10px] font-semibold text-status-voting">
                      Khu phố mới (dân tự nhập) — duyệt sẽ hiện công khai
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ${
                    STATUS_CLASS[r.status] || "bg-cream text-ink"
                  }`}>
                    {ISSUE_STATUS_LABEL[r.status] || r.status}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-center font-bold">{r.suggestion_count}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold">
                  {r.proposer_name || "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-xs text-ink-soft">
                  {new Date(r.created_at).toLocaleDateString("vi-VN")}
                  <span className="block text-[11px]">
                    {new Date(r.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  {r.status === "pending_review" ? (
                    <div className="ml-auto flex w-[92px] flex-col gap-1">
                      <button
                        onClick={() => act(r.id, "approve")}
                        disabled={busy}
                        className="rounded-full bg-brick px-2 py-1 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
                      >
                        Duyệt
                      </button>
                      <button
                        onClick={() => { setRejectId(rejectId === r.id ? null : r.id); setNote(""); }}
                        className="rounded-full border border-brick px-2 py-1 text-xs font-bold text-brick hover:bg-brick/5"
                      >
                        Từ chối…
                      </button>
                      {rejectId === r.id && (
                        <div className="mt-1 flex flex-col gap-1">
                          <input
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Lý do nội bộ"
                            className="w-full rounded-lg border border-cream-dark bg-cream px-2 py-1 text-[11px]"
                          />
                          <Btn variant="danger" onClick={() => act(r.id, "reject")} disabled={busy}>
                            Xác nhận
                          </Btn>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="block text-right text-[11px] text-ink-soft">
                      {r.approved_at ? `Duyệt ${new Date(r.approved_at).toLocaleDateString("vi-VN")}` : "—"}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pager
        page={page}
        per={per}
        total={total}
        onPage={(p) => onChange({ page: String(p) })}
        onPer={(n) => onChange({ per: String(n), page: "1" })}
      />
    </div>
  );
}

/** Select khu phố gộp nhóm theo tỉnh/thành — giá trị "city:<tên>" lọc cả tỉnh/thành */
export function NbSelect({
  value, onChange, nbs, cities,
}: {
  value: string; onChange: (v: string) => void; nbs: Nb[]; cities: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-xl border border-cream-dark bg-cream px-3 py-2 text-sm"
    >
      <option value="">Khu phố: tất cả</option>
      {cities.map((c) => (
        <optgroup key={c} label={c}>
          <option value={`city:${c}`}>Cả tỉnh/thành {c}</option>
          {nbs.filter((n) => n.city === c).map((n) => (
            <option key={n.id} value={n.id}>{n.name}{n.ward ? ` — ${n.ward}` : ""}</option>
          ))}
        </optgroup>
      ))}
      {nbs.some((n) => !n.city) && (
        <optgroup label="Chưa có tỉnh/thành">
          {nbs.filter((n) => !n.city).map((n) => (
            <option key={n.id} value={n.id}>{n.name}</option>
          ))}
        </optgroup>
      )}
    </select>
  );
}
