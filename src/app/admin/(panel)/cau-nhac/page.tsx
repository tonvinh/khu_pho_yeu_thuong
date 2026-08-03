"use client";
// Quản lý câu duyệt dạng bảng (yêu cầu 3/8): tabs trạng thái lọc nhanh + tìm kiếm/chủ đề/
// khu phố; mỗi hàng gồm nội dung, 1 hình duy nhất, khu phố (tỉnh/thành · phường/xã),
// chủ đề, trạng thái, người đăng, thời gian đăng. SỬA MỌI NỘI DUNG qua drawer trượt phải
// (câu, chủ đề, khu phố, vị trí, tên người đăng, hình, trạng thái). Duyệt hiển thị vẫn
// qua checklist 4N THỦ CÔNG (Q2, 04 §3) — cả ở nút Duyệt nhanh lẫn khi đổi trạng thái.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiGet, apiSend, apiUpload } from "@/components/client-api";
import { Btn, Card } from "@/components/admin/AdminShell";
import ImportModal from "@/components/admin/ImportModal";
import { CATEGORIES, CATEGORY_CODES, categoryIcon, categoryLabel } from "@/lib/taxonomy";

interface Sugg {
  id: string; content: string; status: string; category: string;
  neighborhood_id: string; neighborhood_name: string;
  city: string | null; ward: string | null;
  location_text: string; author_name: string; created_at: string;
  votes: number; image_url: string | null; review_note: string | null;
}
interface Nb { id: string; name: string; city: string | null; ward: string | null }

const STATUS_LABEL: Record<string, string> = {
  submitted: "Chờ duyệt",
  approved: "Đã duyệt",
  selected: "Đã chọn lên biển",
  produced: "Đang sản xuất",
  installed: "Đã treo biển",
  rejected: "Từ chối",
};
const STATUS_CLASS: Record<string, string> = {
  submitted: "bg-status-voting-bg text-status-voting",
  approved: "bg-status-signed-bg text-status-signed",
  selected: "bg-status-signed-bg text-status-signed",
  produced: "bg-status-voting-bg text-status-voting",
  installed: "bg-status-signed text-white",
  rejected: "bg-status-waiting-bg text-status-waiting",
};
// Đổi trạng thái trong drawer: đi tới theo vòng đời + khôi phục câu từ chối (khớp API)
const STATUS_FLOW: Record<string, string[]> = {
  submitted: ["approved", "rejected"],
  approved: ["selected", "rejected"],
  selected: ["produced"],
  produced: ["installed"],
  installed: [],
  rejected: ["submitted"],
};

const FOUR_N: Array<{ key: keyof Checks; label: string; hint: string }> = [
  { key: "nhac", label: "Nhắc", hint: "Nhắc một hành vi cụ thể, tích cực" },
  { key: "nho", label: "Nhở", hint: "Giọng gợi nhớ nhẹ nhàng, không ra lệnh (không 'cấm', 'phạt'...)" },
  { key: "nho2", label: "Nhỏ", hint: "≤120 ký tự, ≤2 mệnh đề — vừa một tấm biển" },
  { key: "nhe", label: "Nhẹ", hint: "Không công kích, không đích danh người/nhà, không tiêu cực" },
];
type Checks = Record<"nhac" | "nho" | "nho2" | "nhe", boolean>;
const EMPTY_4N: Checks = { nhac: false, nho: false, nho2: false, nhe: false };

export default function SuggestionsTablePage() {
  const [rows, setRows] = useState<Sugg[]>([]);
  const [nbs, setNbs] = useState<Nb[]>([]);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Filters
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [nbId, setNbId] = useState("");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  // Duyệt nhanh / từ chối nhanh
  const [approving, setApproving] = useState<Sugg | null>(null);
  const [checks, setChecks] = useState<Checks>(EMPTY_4N);
  const [rejecting, setRejecting] = useState<Sugg | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  // Drawer sửa
  const [editing, setEditing] = useState<Sugg | null>(null);
  // Modal import file
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const load = useCallback(() => {
    const p = new URLSearchParams({ status });
    if (category) p.set("category", category);
    if (city) p.set("city", city);
    if (nbId) p.set("neighborhood", nbId);
    if (debounced) p.set("q", debounced);
    apiGet<{ suggestions: Sugg[] }>(`/api/admin/suggestions?${p}`)
      .then((r) => setRows(r.suggestions)).catch(() => {});
  }, [status, category, city, nbId, debounced]);
  useEffect(load, [load]);

  useEffect(() => {
    apiGet<{ neighborhoods: Nb[] }>("/api/admin/neighborhoods")
      .then((r) => setNbs(r.neighborhoods)).catch(() => {});
  }, []);

  const cities = useMemo(
    () => [...new Set(nbs.map((n) => n.city).filter((c): c is string => !!c))]
      .sort((a, b) => a.localeCompare(b, "vi")),
    [nbs]
  );

  const notify = (text: string, ok = true) => {
    setMsg({ text, ok });
    window.setTimeout(() => setMsg(null), 6000);
  };
  const fail = (e: unknown) => notify(e instanceof Error ? e.message : "Có lỗi xảy ra", false);

  const approve = async () => {
    if (!approving || busy) return;
    setBusy(true);
    try {
      await apiSend("PATCH", `/api/admin/suggestions/${approving.id}`, { action: "approve", review_4n: checks });
      notify("Đã duyệt hiển thị — mở bình chọn, +5đ cho tác giả ✓");
      setApproving(null); setChecks(EMPTY_4N); load();
    } catch (e) { fail(e); } finally { setBusy(false); }
  };

  const reject = async () => {
    if (!rejecting || busy) return;
    setBusy(true);
    try {
      await apiSend("PATCH", `/api/admin/suggestions/${rejecting.id}`, { action: "reject", note });
      notify("Đã từ chối câu");
      setRejecting(null); setNote(""); load();
    } catch (e) { fail(e); } finally { setBusy(false); }
  };

  const uploadImage = async (id: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    try {
      await apiUpload(`/api/admin/suggestions/${id}/photo`, fd);
      notify("Đã lưu hình của câu ✓"); load();
    } catch (e) { fail(e); }
  };

  // Drawer đang mở: đồng bộ dữ liệu mới sau mỗi load (VD vừa upload hình)
  useEffect(() => {
    setEditing((cur) => (cur ? rows.find((r) => r.id === cur.id) || cur : cur));
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-extrabold">✍️ Quản lý lời nhắc</h1>
        <Btn variant="outline" onClick={() => setImporting(true)}>📥 Import file</Btn>
      </div>

      {msg && (
        <p className={`rounded-xl px-3 py-2 text-sm font-semibold shadow-sm ${
          msg.ok ? "bg-white text-status-signed" : "bg-status-waiting/10 text-status-waiting"
        }`}>
          {msg.text}
        </p>
      )}

      {/* ===== Tabs trạng thái — lọc nhanh ===== */}
      <div className="flex flex-wrap gap-1.5">
        {[["all", "Tất cả"], ...Object.entries(STATUS_LABEL)].map(([k, v]) => (
          <button
            key={k}
            onClick={() => setStatus(k)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
              status === k ? "bg-brick text-white shadow-sm" : "bg-white text-ink hover:bg-cream-dark/50"
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {/* ===== Tìm kiếm + filter chủ đề / khu phố ===== */}
      <Card>
        <div className="grid gap-2 md:grid-cols-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Tìm câu, người đăng, khu phố, vị trí…"
            className="rounded-xl border border-cream-dark bg-cream px-3 py-2 text-sm md:col-span-2"
          />
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border border-cream-dark bg-cream px-3 py-2 text-sm">
            <option value="">Chủ đề: tất cả</option>
            {CATEGORY_CODES.map((c) => (
              <option key={c} value={c}>{CATEGORIES[c].icon} {CATEGORIES[c].label}</option>
            ))}
          </select>
          <select
            value={nbId ? `nb:${nbId}` : city ? `city:${city}` : ""}
            onChange={(e) => {
              const v = e.target.value;
              if (v.startsWith("nb:")) { setNbId(v.slice(3)); }
              else { setNbId(""); setCity(v.startsWith("city:") ? v.slice(5) : ""); }
            }}
            className="rounded-xl border border-cream-dark bg-cream px-3 py-2 text-sm"
          >
            <option value="">Khu phố: tất cả</option>
            {cities.map((c) => (
              <optgroup key={c} label={c}>
                <option value={`city:${c}`}>Cả tỉnh/thành {c}</option>
                {nbs.filter((n) => n.city === c).map((n) => (
                  <option key={n.id} value={`nb:${n.id}`}>{n.name}{n.ward ? ` — ${n.ward}` : ""}</option>
                ))}
              </optgroup>
            ))}
            {nbs.some((n) => !n.city) && (
              <optgroup label="Chưa có tỉnh/thành">
                {nbs.filter((n) => !n.city).map((n) => (
                  <option key={n.id} value={`nb:${n.id}`}>{n.name}</option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
      </Card>

      {/* ===== Bảng ===== */}
      <div className="max-h-[70vh] overflow-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full min-w-[1060px] text-sm">
          <thead>
            <tr className="text-left text-xs text-ink-soft">
              <Th className="w-[30%]">Lời nhắc</Th>
              <Th className="w-[72px] text-center">Hình ảnh</Th>
              <Th className="min-w-[160px]">Khu phố</Th>
              <Th>Chủ đề</Th>
              <Th>Trạng thái</Th>
              <Th>Người đăng</Th>
              <Th>Thời gian đăng</Th>
              <Th className="text-right">Thao tác</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-sm text-ink-soft">
                  Không có câu nào khớp bộ lọc.
                </td>
              </tr>
            )}
            {rows.map((s) => (
              <tr key={s.id} className="border-b border-cream-dark/60 align-middle last:border-0 hover:bg-cream/40">
                <td className="px-3 py-2.5">
                  <p className="font-bold leading-snug">“{s.content}”</p>
                  <p className="mt-0.5 text-[11px] text-ink-soft">💛 {s.votes} thương</p>
                  {s.status === "rejected" && s.review_note && (
                    <p className="mt-0.5 text-[11px] text-status-waiting">Lý do: {s.review_note}</p>
                  )}
                </td>
                <td className="px-2 py-2.5 text-center">
                  <ImageCell s={s} onUpload={(f) => uploadImage(s.id, f)} />
                </td>
                <td className="px-3 py-2.5">
                  <div className="font-semibold leading-snug">📍 {s.location_text}</div>
                  <div className="text-[11px] leading-4 text-ink-soft">
                    {s.neighborhood_name} · {s.city || "Chưa có tỉnh/thành"}{s.ward ? ` · ${s.ward}` : ""}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <span className="whitespace-nowrap text-xs font-semibold">
                    {categoryIcon(s.category)} {categoryLabel(s.category)}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ${
                    STATUS_CLASS[s.status] || "bg-cream text-ink"
                  }`}>
                    {STATUS_LABEL[s.status] || s.status}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold">{s.author_name}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-xs text-ink-soft">
                  {new Date(s.created_at).toLocaleDateString("vi-VN")}
                  <span className="block text-[11px]">
                    {new Date(s.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5">
                  {/* Xếp dọc, cùng bề rộng — cột thao tác hẹp, tiết kiệm không gian ngang */}
                  <div className="ml-auto flex w-[76px] flex-col gap-1">
                    {s.status === "submitted" && (
                      <button
                        onClick={() => { setApproving(s); setChecks(EMPTY_4N); }}
                        className="rounded-full bg-brick px-2 py-1 text-xs font-bold text-white hover:opacity-90"
                      >
                        Duyệt
                      </button>
                    )}
                    {(s.status === "submitted" || s.status === "approved") && (
                      <button
                        onClick={() => { setRejecting(s); setNote(""); }}
                        className="rounded-full border border-brick px-2 py-1 text-xs font-bold text-brick hover:bg-brick/5"
                      >
                        Từ chối
                      </button>
                    )}
                    <button
                      onClick={() => setEditing(s)}
                      className="rounded-full border border-cream-dark px-2 py-1 text-xs font-bold hover:border-brick hover:text-brick"
                    >
                      ✏️ Sửa
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ===== Modal duyệt nhanh 4N ===== */}
      {approving && (
        <Modal title="Duyệt hiển thị — checklist 4N" onClose={() => setApproving(null)}>
          <p className="text-lg font-bold leading-snug">“{approving.content}”</p>
          <p className="mt-1 text-xs text-ink-soft">
            — {approving.author_name} · {categoryIcon(approving.category)} {categoryLabel(approving.category)} ·{" "}
            {approving.neighborhood_name}
          </p>
          <FourNChecklist checks={checks} setChecks={setChecks} />
          <div className="mt-4 flex gap-2">
            <Btn onClick={approve} disabled={busy || !FOUR_N.every((f) => checks[f.key])}>
              {FOUR_N.every((f) => checks[f.key]) ? "Duyệt hiển thị" : "Duyệt hiển thị (cần đủ 4 ô)"}
            </Btn>
            <Btn variant="ghost" onClick={() => setApproving(null)}>Huỷ</Btn>
          </div>
        </Modal>
      )}

      {/* ===== Modal từ chối nhanh ===== */}
      {rejecting && (
        <Modal title="Từ chối câu" onClose={() => setRejecting(null)}>
          <p className="font-bold leading-snug">“{rejecting.content}”</p>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Lý do (nội bộ)"
            className="mt-3 w-full rounded-xl border border-cream-dark bg-cream px-3 py-2 text-sm"
          />
          <div className="mt-4 flex gap-2">
            <Btn variant="danger" onClick={reject} disabled={busy}>Xác nhận từ chối</Btn>
            <Btn variant="ghost" onClick={() => setRejecting(null)}>Huỷ</Btn>
          </div>
        </Modal>
      )}

      {/* ===== Modal import câu từ file ===== */}
      {importing && (
        <ImportModal
          title="Import câu từ file"
          endpoint="/api/admin/suggestions/import"
          onClose={() => setImporting(false)}
          onDone={(m) => { setImporting(false); notify(m); load(); }}
        >
          <p className="text-sm text-ink-soft">
            File gồm 5 cột: <strong>Câu</strong> (≤120 ký tự) · <strong>Tên khu phố</strong> (phải
            có sẵn trong hệ thống) · <strong>Vị trí treo biển</strong> · <strong>Chủ đề</strong>{" "}
            (tên hoặc mã, VD: {CATEGORIES[CATEGORY_CODES[0]].label}) · <strong>Người đăng</strong>.
            Câu import do admin nhập nên vào thẳng trạng thái <strong>Đã duyệt</strong> (4N tick
            đủ) và <strong>không cộng điểm</strong>.
          </p>
        </ImportModal>
      )}

      {/* ===== Drawer sửa toàn bộ nội dung ===== */}
      {editing && (
        <EditDrawer
          key={editing.id}
          s={editing}
          nbs={nbs}
          cities={cities}
          onClose={() => setEditing(null)}
          onSaved={(m) => { setEditing(null); notify(m); load(); }}
          onFail={fail}
          onUploadImage={(f) => uploadImage(editing.id, f)}
        />
      )}
    </div>
  );
}

function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  // Header đông cứng khi cuộn (như trang Khu phố): sticky + kẻ dưới bằng shadow
  return (
    <th className={`sticky top-0 z-10 whitespace-nowrap bg-white px-3 py-2.5 font-bold shadow-[0_1px_0_0_var(--color-cream-dark)] ${className}`}>
      {children}
    </th>
  );
}

function FourNChecklist({ checks, setChecks }: {
  checks: Checks; setChecks: React.Dispatch<React.SetStateAction<Checks>>;
}) {
  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      {FOUR_N.map((f) => (
        <label
          key={f.key}
          className={`flex cursor-pointer items-start gap-2 rounded-xl border p-2.5 text-sm ${
            checks[f.key] ? "border-status-signed bg-status-signed/5" : "border-cream-dark"
          }`}
        >
          <input
            type="checkbox"
            checked={checks[f.key]}
            onChange={() => setChecks((c) => ({ ...c, [f.key]: !c[f.key] }))}
            className="mt-0.5 h-4 w-4 accent-brick"
          />
          <span>
            <strong>{f.label}</strong>
            <span className="block text-xs text-ink-soft">{f.hint}</span>
          </span>
        </label>
      ))}
    </div>
  );
}

/* ===== Ô hình ảnh trong bảng: 1 hình duy nhất — bấm để tải/thay ===== */
function ImageCell({ s, onUpload }: { s: Sugg; onUpload: (f: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="inline-block">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(f);
          e.target.value = "";
        }}
      />
      {s.image_url ? (
        <button
          onClick={() => inputRef.current?.click()}
          title="Bấm để thay hình (mỗi câu chỉ có 1 hình)"
          className="group relative block h-11 w-16 overflow-hidden rounded-lg border border-cream-dark"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={s.image_url} alt="Hình của câu" className="h-full w-full object-cover" />
          <span className="absolute inset-0 hidden items-center justify-center bg-black/45 text-[10px] font-bold text-white group-hover:flex">
            🔁
          </span>
        </button>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          title="Tải hình cho câu (jpg/png/webp ≤ 10MB)"
          className="flex h-11 w-16 items-center justify-center rounded-lg border border-dashed border-cream-dark bg-cream text-lg text-ink-soft hover:text-brick"
        >
          ＋
        </button>
      )}
    </div>
  );
}

/* ===== Drawer sửa (trượt từ phải, giống trang Khu phố) ===== */
function EditDrawer({
  s, nbs, cities, onClose, onSaved, onFail, onUploadImage,
}: {
  s: Sugg; nbs: Nb[]; cities: string[];
  onClose: () => void; onSaved: (msg: string) => void; onFail: (e: unknown) => void;
  onUploadImage: (f: File) => void;
}) {
  const [content, setContent] = useState(s.content);
  const [category, setCategory] = useState(s.category);
  const [nbId, setNbId] = useState(s.neighborhood_id);
  const [location, setLocation] = useState(s.location_text);
  const [author, setAuthor] = useState(s.author_name);
  const [status, setStatus] = useState(s.status);
  const [checks, setChecks] = useState<Checks>(EMPTY_4N);
  const [note, setNote] = useState("");
  const [installDate, setInstallDate] = useState("");
  const [busy, setBusy] = useState(false);

  // Trượt vào sau khi mount; đóng thì trượt ra rồi mới unmount
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setOpen(true), 10);
    return () => window.clearTimeout(t);
  }, []);
  const close = () => { setOpen(false); window.setTimeout(onClose, 250); };

  const statusChanged = status !== s.status;
  const needs4N = statusChanged && status === "approved";
  const all4 = FOUR_N.every((f) => checks[f.key]);
  const canSave = !busy && content.trim().length > 0 && (!needs4N || all4);

  const save = async () => {
    if (!canSave) return;
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        action: "update",
        content, category, neighborhood_id: nbId,
        location_text: location, author_name: author,
      };
      if (statusChanged) {
        body.status = status;
        if (status === "approved") body.review_4n = checks;
        if (status === "rejected" || status === "selected") body.note = note;
        if (status === "installed") body.installed_date = installDate || undefined;
      }
      await apiSend("PATCH", `/api/admin/suggestions/${s.id}`, body);
      onSaved(statusChanged
        ? `Đã lưu và chuyển trạng thái sang “${STATUS_LABEL[status]}” ✓`
        : "Đã lưu nội dung câu ✓");
    } catch (e) { onFail(e); setBusy(false); }
  };

  const statusOptions = [s.status, ...(STATUS_FLOW[s.status] || [])];
  const inputCls = "mt-1 w-full rounded-xl border border-cream-dark bg-cream px-3 py-2 text-sm";
  const imgInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="fixed inset-0 z-50">
      <div
        className={`absolute inset-0 bg-black/45 transition-opacity duration-250 ${open ? "opacity-100" : "opacity-0"}`}
        onClick={close}
      />
      <div
        className={`absolute inset-y-0 right-0 flex w-full max-w-xl flex-col bg-white shadow-2xl transition-transform duration-250 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-cream-dark px-5 py-4">
          <h2 className="font-extrabold">✏️ Sửa lời nhắc</h2>
          <button onClick={close} aria-label="Đóng" className="rounded-full px-2 text-lg text-ink-soft hover:text-brick">
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <label className="block">
            <span className="text-xs font-bold">Câu ({content.length}/120 ký tự)</span>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={120}
              rows={3}
              className={inputCls}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-bold">Chủ đề</span>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
                {CATEGORY_CODES.map((c) => (
                  <option key={c} value={c}>{CATEGORIES[c].icon} {CATEGORIES[c].label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-bold">Người đăng</span>
              <input value={author} onChange={(e) => setAuthor(e.target.value)} maxLength={120} className={inputCls} />
              <span className="mt-1 block text-[11px] leading-4 text-ink-soft">
                Đổi tên hiển thị của cư dân — áp dụng mọi nơi hiện tên này.
              </span>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-bold">Khu phố (Tỉnh/TP · Phường/Xã)</span>
              <select value={nbId} onChange={(e) => setNbId(e.target.value)} className={inputCls}>
                {cities.map((c) => (
                  <optgroup key={c} label={c}>
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
            </label>
            <label className="block">
              <span className="text-xs font-bold">Vị trí (địa chỉ treo biển)</span>
              <input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={300} className={inputCls} />
              <span className="mt-1 block text-[11px] leading-4 text-ink-soft">
                Vị trí thuộc điểm treo — các câu khác cùng điểm cũng cập nhật theo.
              </span>
            </label>
          </div>

          {/* Hình ảnh: 1 hình duy nhất */}
          <div>
            <span className="text-xs font-bold">Hình ảnh (duy nhất 1 hình)</span>
            <div className="mt-1.5 flex items-center gap-3">
              <input
                ref={imgInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUploadImage(f);
                  e.target.value = "";
                }}
              />
              {s.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.image_url} alt="Hình của câu" className="h-24 rounded-xl border border-cream-dark object-cover" />
              ) : (
                <span className="flex h-24 w-36 items-center justify-center rounded-xl border border-dashed border-cream-dark bg-cream text-xs text-ink-soft">
                  Chưa có hình
                </span>
              )}
              <button
                onClick={() => imgInputRef.current?.click()}
                className="rounded-full border border-brick px-3.5 py-1.5 text-xs font-bold text-brick"
              >
                {s.image_url ? "🔁 Thay hình" : "＋ Tải hình"}
              </button>
            </div>
            <span className="mt-1 block text-[11px] text-ink-soft">jpg/png/webp ≤ 10MB — hình lưu ngay khi chọn.</span>
          </div>

          {/* Trạng thái */}
          <div className="rounded-xl border border-cream-dark p-3">
            <label className="block">
              <span className="text-xs font-bold">Trạng thái</span>
              <select value={status} onChange={(e) => { setStatus(e.target.value); setChecks(EMPTY_4N); setNote(""); }} className={inputCls}>
                {statusOptions.map((k) => (
                  <option key={k} value={k}>
                    {STATUS_LABEL[k]}{k === s.status ? " (hiện tại)" : ""}
                  </option>
                ))}
              </select>
            </label>
            {(STATUS_FLOW[s.status] || []).length === 0 && (
              <p className="mt-1 text-[11px] text-ink-soft">Trạng thái cuối vòng đời — không chuyển tiếp được nữa.</p>
            )}
            {needs4N && (
              <>
                <p className="mt-2 text-xs font-semibold">Duyệt hiển thị cần tick đủ checklist 4N:</p>
                <FourNChecklist checks={checks} setChecks={setChecks} />
              </>
            )}
            {statusChanged && status === "rejected" && (
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Lý do từ chối (nội bộ)"
                className={inputCls}
              />
            )}
            {statusChanged && status === "selected" && (
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Lý do chọn câu này lên biển (tuỳ chọn)"
                className={inputCls}
              />
            )}
            {statusChanged && status === "installed" && (
              <label className="mt-2 block">
                <span className="text-xs font-bold">Ngày treo biển</span>
                <input type="date" value={installDate} onChange={(e) => setInstallDate(e.target.value)} className={inputCls} />
              </label>
            )}
          </div>
        </div>

        <div className="flex gap-2 border-t border-cream-dark px-5 py-4">
          <Btn onClick={save} disabled={!canSave}>
            {busy ? "Đang lưu…" : needs4N && !all4 ? "💾 Lưu (cần đủ 4 ô 4N)" : "💾 Lưu"}
          </Btn>
          <Btn variant="ghost" onClick={close}>Đóng</Btn>
        </div>
      </div>
    </div>
  );
}

/* ===== Modal chung (z-50 — trên drawer z-40) ===== */
function Modal({ title, onClose, children }: {
  title: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/45" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-extrabold">{title}</h2>
          <button onClick={onClose} aria-label="Đóng" className="rounded-full px-2 text-lg text-ink-soft hover:text-brick">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
