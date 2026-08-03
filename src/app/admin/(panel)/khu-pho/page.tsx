"use client";
// Quản lý khu phố dạng bảng (3/8): mỗi khu 1 hàng gồm tên, địa chỉ (Tỉnh/Thành –
// Phường/Xã), số bảng biển (đã treo/tổng), số ảnh tổng quan, 3 trạng thái (hiển thị
// website / block "Khu phố tiêu biểu" / đạt chuẩn 4N) và vị trí trong block tiêu biểu.
// Sửa thông tin + ảnh tổng quan + ảnh chứng nhận qua DRAWER trượt từ phải (không popup);
// ảnh chứng nhận upload được bất kỳ lúc nào (không phụ thuộc 4N). KHÔNG còn bản đồ/pin.
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { apiGet, apiSend, apiUpload } from "@/components/client-api";
import { Btn, Card } from "@/components/admin/AdminShell";
import ImportModal from "@/components/admin/ImportModal";
import { PROVINCES } from "@/lib/vn-geo";

interface NbPhoto { position: number; url: string }
interface Nb {
  id: string; name: string; ward: string | null; city: string | null; slug: string;
  visible: boolean; is_featured: boolean; featured_position: number | null;
  certified_4n: boolean; certified_at: string | null; certificate_photo_url: string | null;
  photos: NbPhoto[];
  total_issues: number; signed_issues: number;
}
interface FormState { name: string; city: string; ward: string }

const EMPTY_FORM: FormState = { name: "", city: "", ward: "" };

export default function NeighborhoodsPage() {
  const [rows, setRows] = useState<Nb[]>([]);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [editing, setEditing] = useState<Nb | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    apiGet<{ neighborhoods: Nb[] }>("/api/admin/neighborhoods")
      .then((r) => setRows(r.neighborhoods)).catch(() => {});
  }, []);
  useEffect(load, [load]);

  // Modal đang mở: đồng bộ lại dữ liệu khu phố sau mỗi lần load (upload/xoá ảnh...)
  useEffect(() => {
    setEditing((cur) => (cur ? rows.find((n) => n.id === cur.id) || null : cur));
  }, [rows]);

  const notify = (text: string, ok = true) => {
    setMsg({ text, ok });
    window.setTimeout(() => setMsg(null), 6000);
  };
  const fail = (e: unknown) => notify(e instanceof Error ? e.message : "Có lỗi xảy ra", false);

  // ===== Tạo / sửa thông tin =====
  const openCreate = () => { setCreating(true); setEditing(null); setForm(EMPTY_FORM); };
  const openEdit = (n: Nb) => {
    setEditing(n); setCreating(false);
    setForm({ name: n.name, city: n.city || "", ward: n.ward || "" });
  };
  const closeForm = () => { setCreating(false); setEditing(null); setForm(EMPTY_FORM); };

  const submitForm = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (editing) {
        await apiSend("PATCH", `/api/admin/neighborhoods/${editing.id}`, form);
        notify("Đã lưu thông tin khu phố ✓");
      } else {
        await apiSend("POST", "/api/admin/neighborhoods", form);
        notify("Đã tạo khu phố mới ✓ Tiếp theo: tải ảnh tổng quan rồi bật hiển thị.");
        closeForm();
      }
      load();
    } catch (e) { fail(e); } finally { setBusy(false); }
  };

  // ===== Trạng thái =====
  const patch = async (id: string, body: Record<string, unknown>, okText: string) => {
    try {
      await apiSend("PATCH", `/api/admin/neighborhoods/${id}`, body);
      notify(okText); load();
    } catch (e) { fail(e); }
  };

  const toggleCertify = (n: Nb) =>
    apiSend("PATCH", `/api/admin/neighborhoods/${n.id}/certify`, n.certified_4n ? { revoke: true } : {})
      .then(() => {
        notify(n.certified_4n
          ? "Đã thu hồi chứng nhận 4N (ảnh chứng nhận vẫn giữ nguyên)."
          : "Đã cấp chứng nhận 'Khu phố biết thương' chuẩn 4N 🏅");
        load();
      })
      .catch(fail);

  // ===== Ảnh (trong modal Sửa) =====
  const uploadPhoto = async (id: string, position: number, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("position", String(position));
    try {
      await apiUpload(`/api/admin/neighborhoods/${id}/photos`, fd);
      notify(`Đã lưu ảnh tổng quan vị trí ${position} (đã chuẩn hoá 1280×720) ✓`); load();
    } catch (e) { fail(e); }
  };
  const deletePhoto = async (id: string, position: number) => {
    try {
      await apiSend("DELETE", `/api/admin/neighborhoods/${id}/photos?position=${position}`);
      notify(`Đã xoá ảnh vị trí ${position}`); load();
    } catch (e) { fail(e); }
  };
  const uploadCertPhoto = async (id: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    try {
      await apiUpload(`/api/admin/neighborhoods/${id}/certificate`, fd);
      notify("Đã lưu ảnh chứng nhận ✓"); load();
    } catch (e) { fail(e); }
  };
  const deleteCertPhoto = async (id: string) => {
    try {
      await apiSend("DELETE", `/api/admin/neighborhoods/${id}/certificate`);
      notify("Đã xoá ảnh chứng nhận"); load();
    } catch (e) { fail(e); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-extrabold">🏘️ Khu phố</h1>
        <div className="flex gap-2">
          <Btn variant="outline" onClick={() => setImporting(true)}>📥 Import file</Btn>
          <Btn onClick={openCreate}>➕ Thêm khu phố</Btn>
        </div>
      </div>

      {msg && (
        <p className={`rounded-xl px-3 py-2 text-sm font-semibold shadow-sm ${
          msg.ok ? "bg-white text-status-signed" : "bg-status-waiting/10 text-status-waiting"
        }`}>
          {msg.text}
        </p>
      )}

      {creating && (
        <NbFormFields
          title="Thêm khu phố mới"
          form={form} setForm={setForm} busy={busy}
          onSubmit={submitForm} onCancel={closeForm}
        />
      )}

      {rows.length === 0 ? (
        <Card>
          <p className="text-sm text-ink-soft">
            Chưa có khu phố nào. Bấm <strong>➕ Thêm khu phố</strong> để tạo khu phố đầu tiên,
            hoặc dùng <Link href="/admin/import" className="underline">Bulk import</Link>.
          </p>
        </Card>
      ) : (
        <div className="max-h-[70vh] overflow-auto rounded-2xl bg-white shadow-sm">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-soft">
                <Th>Tên khu phố</Th>
                <Th>Địa chỉ (Tỉnh/TP – Phường/Xã)</Th>
                <Th className="text-center" title="Số biển đã treo / tổng số bảng biển">Bảng biển</Th>
                <Th className="text-center">Ảnh tổng quan</Th>
                <Th>Trạng thái</Th>
                <Th className="text-center" title="Vị trí trong block Khu phố tiêu biểu — số nhỏ đứng trước">
                  Vị trí tiêu biểu
                </Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {rows.map((n) => (
                <tr key={n.id} className="border-b border-cream-dark/60 align-top last:border-0 hover:bg-cream/40">
                  <td className="px-3 py-3">
                    <div className="font-bold">{n.name}</div>
                    <a
                      href={`/khu-pho/${n.slug}`} target="_blank"
                      className="text-[11px] text-ink-soft underline"
                    >
                      Trang công khai ↗
                    </a>
                  </td>
                  <td className="px-3 py-3">
                    {n.city || n.ward ? (
                      <>
                        <div>{n.city || <span className="text-ink-soft">Chưa có tỉnh/thành</span>}</div>
                        <div className="text-xs text-ink-soft">{n.ward || "Chưa có phường/xã"}</div>
                      </>
                    ) : (
                      <span className="text-xs text-ink-soft">Chưa có địa chỉ — bấm Sửa để bổ sung</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="font-bold">{n.signed_issues}</span>
                    <span className="text-ink-soft">/{n.total_issues}</span>
                    <div className="text-[11px] text-ink-soft">đã treo</div>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="font-bold">{n.photos.length}</span>
                    <span className="text-ink-soft">/4</span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-1.5">
                      <Toggle
                        checked={n.visible}
                        onChange={() =>
                          patch(n.id, { visible: !n.visible },
                            n.visible
                              ? "Đã ẩn khu phố khỏi website (tiêu biểu cũng tắt theo)."
                              : "Khu phố đã hiển thị trên website ✓")}
                        label="Hiển thị website"
                      />
                      <Toggle
                        checked={n.is_featured}
                        disabled={!n.visible}
                        title={n.visible ? undefined : "Bật 'Hiển thị website' trước"}
                        onChange={() =>
                          patch(n.id, { is_featured: !n.is_featured },
                            n.is_featured
                              ? "Đã bỏ khỏi block Khu phố tiêu biểu."
                              : "Đã đưa vào block Khu phố tiêu biểu đầu trang chủ ✓")}
                        label="Khu phố tiêu biểu"
                      />
                      <Toggle
                        checked={n.certified_4n}
                        disabled={!n.certified_4n && (n.total_issues === 0 || n.signed_issues < n.total_issues)}
                        title={
                          n.certified_4n
                            ? `Đã đạt chuẩn${n.certified_at ? ` từ ${new Date(n.certified_at).toLocaleDateString("vi-VN")}` : ""} — tắt để thu hồi`
                            : n.total_issues === 0 || n.signed_issues < n.total_issues
                              ? `Chưa đủ điều kiện — cần 100% biển đã treo (${n.signed_issues}/${n.total_issues})`
                              : "Đủ điều kiện — bật để cấp chứng nhận"
                        }
                        onChange={() => toggleCertify(n)}
                        label={`Đạt chuẩn 4N${n.certified_4n ? " 🏅" : ""}`}
                      />
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center">
                    {n.is_featured ? (
                      <PositionInput
                        value={n.featured_position}
                        onSave={(pos) =>
                          patch(n.id, { featured_position: pos },
                            pos === null
                              ? "Đã bỏ vị trí — khu phố xếp cuối block theo tên."
                              : `Đã xếp vị trí ${pos} trong block Khu phố tiêu biểu ✓`)}
                      />
                    ) : (
                      <span className="text-xs text-ink-soft">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <button
                      onClick={() => openEdit(n)}
                      className="rounded-full border border-cream-dark px-3 py-1 text-xs font-bold hover:border-brick hover:text-brick"
                    >
                      ✏️ Sửa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {importing && (
        <ImportModal
          title="Import khu phố từ file"
          endpoint="/api/admin/neighborhoods/import"
          onClose={() => setImporting(false)}
          onDone={(m) => { setImporting(false); notify(m); load(); }}
        >
          <p className="text-sm text-ink-soft">
            File gồm 3 cột: <strong>Tên khu phố</strong> · <strong>Tỉnh/Thành phố</strong> (theo
            34 tỉnh/thành mới) · <strong>Phường/Xã</strong>. Khu phố import xong sẽ hiển thị
            website ngay (như thêm tay) — nhớ vào Sửa để tải ảnh tổng quan.
          </p>
        </ImportModal>
      )}

      {editing && (
        <EditDrawer
          nb={editing}
          form={form} setForm={setForm} busy={busy}
          onSubmit={submitForm} onClose={closeForm}
          onUploadPhoto={uploadPhoto}
          onDeletePhoto={deletePhoto}
          onUploadCert={uploadCertPhoto}
          onDeleteCert={deleteCertPhoto}
        />
      )}
    </div>
  );
}

function Th({ children, className = "", title }: {
  children?: React.ReactNode; className?: string; title?: string;
}) {
  return (
    <th
      title={title}
      // Header đông cứng khi cuộn: dính đỉnh vùng cuộn; kẻ dưới bằng shadow vì
      // border của ô sticky không trôi theo (border-collapse)
      className={`sticky top-0 z-10 whitespace-nowrap bg-white px-3 py-2.5 font-bold shadow-[0_1px_0_0_var(--color-cream-dark)] ${className}`}
    >
      {children}
    </th>
  );
}

/* ===== Ô nhập vị trí tiêu biểu — lưu khi blur hoặc Enter ===== */
function PositionInput({
  value, onSave,
}: {
  value: number | null; onSave: (pos: number | null) => void;
}) {
  const [text, setText] = useState(value === null ? "" : String(value));
  useEffect(() => { setText(value === null ? "" : String(value)); }, [value]);

  const commit = () => {
    const trimmed = text.trim();
    const next = trimmed === "" ? null : Number(trimmed);
    if (next === value) return;
    if (next !== null && (!Number.isInteger(next) || next < 1 || next > 999)) {
      setText(value === null ? "" : String(value));
      return;
    }
    onSave(next);
  };

  return (
    <input
      type="number"
      min={1}
      max={999}
      value={text}
      placeholder="—"
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
      className="w-16 rounded-lg border border-cream-dark bg-cream px-2 py-1 text-center text-sm font-bold"
    />
  );
}

/* ===== Các ô nhập thông tin (dùng cho tạo mới + modal sửa) ===== */
function NbFormFields({
  title, form, setForm, busy, onSubmit, onCancel,
}: {
  title: string; form: FormState; setForm: (f: FormState) => void;
  busy: boolean; onSubmit: () => void; onCancel: () => void;
}) {
  return (
    <Card title={title}>
      <FormGrid form={form} setForm={setForm} />
      <div className="mt-4 flex gap-2">
        <Btn onClick={onSubmit} disabled={busy}>{busy ? "Đang lưu…" : "💾 Lưu"}</Btn>
        <Btn variant="ghost" onClick={onCancel}>Huỷ</Btn>
      </div>
    </Card>
  );
}

function FormGrid({ form, setForm }: { form: FormState; setForm: (f: FormState) => void }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <label className="block">
        <span className="text-xs font-bold">Tên khu phố *</span>
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="VD: Xóm Đình An Nhơn"
          maxLength={200}
          className="mt-1 w-full rounded-xl border border-cream-dark bg-cream px-3 py-2 text-sm"
        />
        <span className="mt-1 block text-[11px] leading-4 text-ink-soft">
          Tên tự đặt, hiển thị công khai trên website — nên là tên thân thuộc của xóm/hẻm/khu
          (không cần trùng tên phường).
        </span>
      </label>

      <label className="block">
        <span className="text-xs font-bold">Tỉnh / Thành phố *</span>
        <select
          value={form.city}
          onChange={(e) => setForm({ ...form, city: e.target.value })}
          className="mt-1 w-full rounded-xl border border-cream-dark bg-cream px-3 py-2 text-sm"
        >
          <option value="">— Chọn tỉnh/thành phố —</option>
          {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <span className="mt-1 block text-[11px] leading-4 text-ink-soft">
          Danh sách 34 tỉnh/thành theo địa giới hành chính mới (hiệu lực 1/7/2025).
        </span>
      </label>

      <label className="block">
        <span className="text-xs font-bold">Phường / Xã *</span>
        <input
          value={form.ward}
          onChange={(e) => setForm({ ...form, ward: e.target.value })}
          placeholder="VD: Phường Bàn Cờ"
          maxLength={120}
          className="mt-1 w-full rounded-xl border border-cream-dark bg-cream px-3 py-2 text-sm"
        />
        <span className="mt-1 block text-[11px] leading-4 text-ink-soft">
          Ghi đầy đủ “Phường …” hoặc “Xã …” theo địa giới mới — <strong>không còn cấp
          quận/huyện</strong>, phường/xã trực thuộc thẳng tỉnh/thành.
        </span>
      </label>
    </div>
  );
}

/* ===== Drawer sửa (trượt từ phải): thông tin + ảnh tổng quan + ảnh chứng nhận ===== */
function EditDrawer({
  nb, form, setForm, busy, onSubmit, onClose,
  onUploadPhoto, onDeletePhoto, onUploadCert, onDeleteCert,
}: {
  nb: Nb;
  form: FormState; setForm: (f: FormState) => void;
  busy: boolean; onSubmit: () => void; onClose: () => void;
  onUploadPhoto: (id: string, position: number, file: File) => void;
  onDeletePhoto: (id: string, position: number) => void;
  onUploadCert: (id: string, file: File) => void;
  onDeleteCert: (id: string) => void;
}) {
  // Trượt vào sau khi mount (translate-x-full → 0); đóng thì trượt ra rồi mới unmount
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setOpen(true), 10);
    return () => window.clearTimeout(t);
  }, []);
  const close = () => {
    setOpen(false);
    window.setTimeout(onClose, 250);
  };

  return (
    <div className="fixed inset-0 z-50">
      <div
        className={`absolute inset-0 bg-black/45 transition-opacity duration-250 ${open ? "opacity-100" : "opacity-0"}`}
        onClick={close}
      />
      <div
        className={`absolute inset-y-0 right-0 flex w-full max-w-3xl flex-col bg-white shadow-2xl transition-transform duration-250 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-cream-dark px-5 py-4">
          <h2 className="font-extrabold">✏️ Sửa khu phố — {nb.name}</h2>
          <button onClick={close} aria-label="Đóng" className="rounded-full px-2 text-lg text-ink-soft hover:text-brick">
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <FormGrid form={form} setForm={setForm} />

          {/* Ảnh tổng quan: 4 slot */}
          <div className="mt-5">
            <div className="mb-1.5 flex flex-wrap items-baseline gap-2">
              <span className="text-xs font-bold">Ảnh tổng quan khu phố ({nb.photos.length}/4)</span>
              <span className="text-[11px] text-ink-soft">
                Tối đa 4 ảnh · jpg/png/webp ≤ 10MB · hệ thống tự chuẩn hoá về cùng kích thước
                1280×720 (ngang 16:9) để slide trang chủ đều nhau.
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4].map((pos) => (
                <PhotoSlot
                  key={pos}
                  photo={nb.photos.find((p) => p.position === pos) || null}
                  position={pos}
                  onUpload={(f) => onUploadPhoto(nb.id, pos, f)}
                  onDelete={() => onDeletePhoto(nb.id, pos)}
                />
              ))}
            </div>
          </div>

          {/* Ảnh chứng nhận 4N — upload bất kỳ lúc nào, không phụ thuộc trạng thái đạt chuẩn */}
          <div className="mt-4 rounded-xl border border-cream-dark p-3">
            <span className="text-xs font-bold">Ảnh chứng nhận “Khu phố biết thương” chuẩn 4N</span>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {nb.certificate_photo_url ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={nb.certificate_photo_url}
                    alt={`Chứng nhận ${nb.name}`}
                    className="h-20 rounded-lg border border-cream-dark object-cover"
                  />
                  <UploadBtn label="🔁 Thay ảnh chứng nhận" onFile={(f) => onUploadCert(nb.id, f)} />
                  <Btn variant="ghost" onClick={() => onDeleteCert(nb.id)}>Xoá ảnh</Btn>
                </>
              ) : (
                <>
                  <UploadBtn label="📄 Tải ảnh chứng nhận…" onFile={(f) => onUploadCert(nb.id, f)} />
                  <span className="text-[11px] text-ink-soft">
                    Tối đa 1 ảnh (bảng chứng nhận chính thức) · jpg/png/webp ≤ 10MB.
                    Ảnh hiện ở trang công khai của khu phố.
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2 border-t border-cream-dark px-5 py-4">
          <Btn onClick={onSubmit} disabled={busy}>{busy ? "Đang lưu…" : "💾 Lưu thông tin"}</Btn>
          <Btn variant="ghost" onClick={close}>Đóng</Btn>
        </div>
      </div>
    </div>
  );
}

/* ===== 1 slot ảnh tổng quan (tỷ lệ 16:9 cố định như ảnh sau chuẩn hoá) ===== */
function PhotoSlot({
  photo, position, onUpload, onDelete,
}: {
  photo: NbPhoto | null; position: number;
  onUpload: (f: File) => void; onDelete: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="group relative aspect-video overflow-hidden rounded-xl border border-dashed border-cream-dark bg-cream">
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
      {photo ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.url} alt={`Ảnh ${position}`} className="h-full w-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/45 opacity-0 transition group-hover:opacity-100">
            <button
              onClick={() => inputRef.current?.click()}
              className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold"
            >
              🔁 Thay
            </button>
            <button
              onClick={onDelete}
              className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-status-waiting"
            >
              🗑 Xoá
            </button>
          </div>
          <span className="absolute left-1.5 top-1.5 rounded-full bg-white/90 px-1.5 text-[10px] font-bold">
            {position}
          </span>
        </>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="flex h-full w-full flex-col items-center justify-center gap-0.5 text-ink-soft hover:text-brick"
        >
          <span className="text-lg leading-none">＋</span>
          <span className="text-[11px] font-semibold">Ảnh {position}</span>
        </button>
      )}
    </div>
  );
}

/* ===== Nút upload file dạng pill ===== */
function UploadBtn({ label, onFile }: { label: string; onFile: (f: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        className="rounded-full border border-brick px-3.5 py-1.5 text-xs font-bold text-brick"
      >
        {label}
      </button>
    </>
  );
}

/* ===== Công tắc trạng thái ===== */
function Toggle({
  checked, onChange, label, disabled, title,
}: {
  checked: boolean; onChange: () => void; label: string; disabled?: boolean; title?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      title={title}
      onClick={onChange}
      className="flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span
        className={`relative inline-block h-5 w-9 shrink-0 rounded-full transition ${
          checked ? "bg-status-signed" : "bg-cream-dark"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
            checked ? "left-[18px]" : "left-0.5"
          }`}
        />
      </span>
      <span className="whitespace-nowrap text-xs font-bold">{label}</span>
    </button>
  );
}
