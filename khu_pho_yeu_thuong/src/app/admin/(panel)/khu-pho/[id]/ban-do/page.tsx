"use client";
// Trình quản lý bản đồ (Q3, 04 §10): upload ảnh → preview bản cách điệu đúng như
// người dân thấy; đặt pin bằng click (toạ độ %); upload ảnh thật từng địa điểm.
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiGet, apiSend, apiUpload, BASE } from "@/components/client-api";
import { Btn, Card } from "@/components/admin/AdminShell";
import { categoryIcon, categoryLabel, ISSUE_STATUS_LABEL } from "@/lib/taxonomy";

interface AdminIssue {
  id: string; category: string; location_text: string; status: string;
  pin_x: number | null; pin_y: number | null; photo_url: string | null;
  neighborhood_id: string;
}
interface Nb { id: string; name: string; has_map: boolean; map_stylized_url: string | null }

export default function MapManagerPage() {
  const { id } = useParams<{ id: string }>();
  const [nb, setNb] = useState<Nb | null>(null);
  const [issues, setIssues] = useState<AdminIssue[]>([]);
  const [placing, setPlacing] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [cacheBust, setCacheBust] = useState(0);

  const load = useCallback(async () => {
    try {
      const [nbs, ...lists] = await Promise.all([
        apiGet<{ neighborhoods: Nb[] }>("/api/admin/neighborhoods"),
        apiGet<{ issues: AdminIssue[] }>("/api/admin/issues?status=waiting"),
        apiGet<{ issues: AdminIssue[] }>("/api/admin/issues?status=voting"),
        apiGet<{ issues: AdminIssue[] }>("/api/admin/issues?status=signed"),
      ]);
      setNb(nbs.neighborhoods.find((n) => n.id === id) || null);
      setIssues(lists.flatMap((l) => l.issues).filter((i) => i.neighborhood_id === id));
    } catch { /* bỏ qua */ }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const uploadMap = async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    setMsg("Đang xử lý ảnh (cách điệu tự động)…");
    try {
      await apiUpload(`/api/admin/neighborhoods/${id}/map-image`, form);
      setMsg("Đã upload — dưới là bản cách điệu đúng như người dân sẽ thấy. Nếu thay ảnh, kiểm tra lại vị trí pins!");
      setCacheBust(Date.now());
      load();
    } catch (e) { setMsg(e instanceof Error ? e.message : "Lỗi upload"); }
  };

  const clickMap = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!placing) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10;
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10;
    try {
      await apiSend("PATCH", `/api/admin/issues/${placing}/pin`, { pin_x: x, pin_y: y });
      setMsg(`Đã đặt pin tại ${x}%, ${y}%`);
      setPlacing(null);
      load();
    } catch (err) { setMsg(err instanceof Error ? err.message : "Có lỗi"); }
  };

  const uploadIssuePhoto = async (issueId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    try {
      await apiUpload(`/api/admin/issues/${issueId}/pin`, form);
      setMsg("Đã lưu ảnh địa điểm");
      load();
    } catch (e) { setMsg(e instanceof Error ? e.message : "Lỗi upload"); }
  };

  const PIN_COLOR: Record<string, string> = {
    waiting: "bg-status-waiting", voting: "bg-status-voting", signed: "bg-status-signed",
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold">Bản đồ — {nb?.name || "…"}</h1>
      {msg && <p className="rounded-xl bg-white px-3 py-2 text-sm shadow-sm">{msg}</p>}

      <Card title="Ảnh bản đồ (jpg/png ≤10MB) — hệ thống tự cách điệu; dân không thấy ảnh gốc">
        <div className="flex flex-wrap items-center gap-3">
          <label className="cursor-pointer rounded-full bg-brick px-4 py-2 text-sm font-bold text-white">
            {nb?.has_map ? "Thay ảnh bản đồ…" : "Upload ảnh bản đồ…"}
            <input
              type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
              onChange={(e) => e.target.files?.[0] && uploadMap(e.target.files[0])}
            />
          </label>
          {nb?.has_map && (
            <a
              href={`${BASE}/api/admin/neighborhoods/${id}/map-image`} target="_blank"
              className="text-sm text-ink-soft underline"
            >
              Xem ảnh gốc (chỉ admin) ↗
            </a>
          )}
        </div>

        {nb?.map_stylized_url && (
          <div
            onClick={clickMap}
            className={`relative mt-4 aspect-[4/3] w-full overflow-hidden rounded-2xl ${placing ? "cursor-crosshair ring-4 ring-brick/40" : ""}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${nb.map_stylized_url}?v=${cacheBust}`}
              alt="Bản cách điệu"
              className="h-full w-full object-cover"
            />
            {issues.filter((i) => i.pin_x != null).map((i) => (
              <span
                key={i.id}
                title={`${categoryLabel(i.category)} · ${i.location_text}`}
                style={{ left: `${i.pin_x}%`, top: `${i.pin_y}%` }}
                className={`absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow ${PIN_COLOR[i.status]}`}
              />
            ))}
            {placing && (
              <div className="absolute inset-x-0 top-0 bg-brick/90 px-3 py-2 text-center text-xs font-bold text-white">
                Click lên bản đồ để đặt pin
              </div>
            )}
          </div>
        )}
      </Card>

      <Card title="Vấn đề trong khu — đặt pin & ảnh địa điểm">
        {issues.length === 0 && <p className="text-sm text-ink-soft">Khu này chưa có vấn đề đã duyệt.</p>}
        <div className="space-y-2">
          {issues.map((i) => (
            <div key={i.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-cream px-3 py-2 text-sm">
              <span className="font-semibold">
                {categoryIcon(i.category)} {categoryLabel(i.category)} · {i.location_text}
              </span>
              <span className="text-xs text-ink-soft">· {ISSUE_STATUS_LABEL[i.status]}</span>
              <span className="ml-auto flex items-center gap-2">
                <span className="text-xs text-ink-soft">
                  {i.pin_x != null ? `pin ${i.pin_x}%, ${i.pin_y}%` : "chưa có pin"}
                </span>
                <Btn variant={placing === i.id ? "danger" : "outline"}
                     onClick={() => setPlacing(placing === i.id ? null : i.id)}>
                  {placing === i.id ? "Huỷ" : i.pin_x != null ? "Đặt lại pin" : "Đặt pin"}
                </Btn>
                <label className="cursor-pointer rounded-full border border-brick px-3.5 py-1.5 text-xs font-bold text-brick">
                  {i.photo_url ? "Đổi ảnh" : "Ảnh địa điểm…"}
                  <input
                    type="file" accept="image/*" className="hidden"
                    onChange={(e) => e.target.files?.[0] && uploadIssuePhoto(i.id, e.target.files[0])}
                  />
                </label>
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
