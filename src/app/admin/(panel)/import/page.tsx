"use client";
// Bulk import 20 khu phố pilot (Q6, 04 §11): Upload → Validate & Preview → Commit
import { useState } from "react";
import { apiUpload } from "@/components/client-api";
import { Btn, Card } from "@/components/admin/AdminShell";

interface RowResult { row: number; errors: string[] }
interface Preview {
  khupho: Array<RowResult & { ten: string; phuong: string; quan: string }>;
  vande: Array<RowResult & { ten_khu_pho: string; loai: string; vi_tri: string }>;
  summary: { neighborhoods: number; issues: number; errors: number; images: number };
  error?: string;
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [zip, setZip] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (mode: "validate" | "commit") => {
    if (!file) { setError("Chọn file Excel trước nhé"); return; }
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    if (zip) form.append("images_zip", zip);
    form.append("mode", mode);
    try {
      const res = await apiUpload<Preview & { ok?: boolean; created?: { neighborhoods: number; issues: number }; upload_errors?: string[] }>(
        "/api/admin/import", form
      );
      if (mode === "commit" && res.ok) {
        setDone(
          `✔ Đã import ${res.created!.neighborhoods} khu phố + ${res.created!.issues} vấn đề` +
          (res.upload_errors?.length ? ` (⚠ ${res.upload_errors.length} ảnh lỗi upload)` : "")
        );
        setPreview(null);
      } else {
        setPreview(res);
        if (res.error) setError(res.error);
      }
    } catch (e) {
      const err = e as Error & { body?: Preview };
      if (err.body?.summary) { setPreview(err.body); setError(err.body.error || err.message); }
      else setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold">Bulk import khu phố pilot</h1>
      <p className="text-sm text-ink-soft">
        Dùng template <code>import-template.xlsx</code> (2 sheet KhuPho, VanDe). Quy trình 3 bước:
        Upload → Validate &amp; Preview → Commit. <strong>All-or-nothing</strong>: còn 1 dòng lỗi
        thì chưa ghi gì vào hệ thống. Ảnh gửi kèm zip (tên file khớp cột Excel) hoặc bổ sung sau
        qua trình quản lý bản đồ.
      </p>

      {done && <p className="rounded-xl bg-status-signed/10 px-4 py-3 text-sm font-semibold text-status-signed">{done}</p>}

      <Card title="Bước 1 — Chọn file">
        <div className="flex flex-wrap items-center gap-3">
          <label className="cursor-pointer rounded-full bg-brick px-4 py-2 text-sm font-bold text-white">
            {file ? `📄 ${file.name}` : "Chọn file Excel…"}
            <input type="file" accept=".xlsx" className="hidden"
              onChange={(e) => { setFile(e.target.files?.[0] || null); setPreview(null); setDone(null); }} />
          </label>
          <label className="cursor-pointer rounded-full border border-brick px-4 py-2 text-sm font-bold text-brick">
            {zip ? `🗜 ${zip.name}` : "Zip ảnh (tuỳ chọn)…"}
            <input type="file" accept=".zip" className="hidden"
              onChange={(e) => { setZip(e.target.files?.[0] || null); setPreview(null); }} />
          </label>
          <Btn onClick={() => run("validate")} disabled={busy || !file}>
            {busy ? "Đang kiểm tra…" : "Bước 2 — Validate & Preview"}
          </Btn>
        </div>
        {error && <p className="mt-3 text-sm font-medium text-status-waiting">{error}</p>}
      </Card>

      {preview && (
        <Card title={`Preview: ${preview.summary.neighborhoods} khu phố · ${preview.summary.issues} vấn đề · ${preview.summary.errors} dòng lỗi · ${preview.summary.images} ảnh trong zip`}>
          <h3 className="mt-1 text-sm font-bold">Sheet KhuPho</h3>
          <div className="mt-1 space-y-1">
            {preview.khupho.map((r) => (
              <div key={r.row} className={`rounded-lg px-3 py-1.5 text-xs ${r.errors.length ? "bg-status-waiting/10" : "bg-cream"}`}>
                Dòng {r.row}: <strong>{r.ten}</strong> — {r.phuong}, {r.quan}
                {r.errors.length > 0 && (
                  <span className="ml-2 font-semibold text-status-waiting">⚠ {r.errors.join(" · ")}</span>
                )}
              </div>
            ))}
          </div>
          <h3 className="mt-3 text-sm font-bold">Sheet VanDe</h3>
          <div className="mt-1 space-y-1">
            {preview.vande.map((r) => (
              <div key={r.row} className={`rounded-lg px-3 py-1.5 text-xs ${r.errors.length ? "bg-status-waiting/10" : "bg-cream"}`}>
                Dòng {r.row}: {r.ten_khu_pho} · {r.loai} · {r.vi_tri}
                {r.errors.length > 0 && (
                  <span className="ml-2 font-semibold text-status-waiting">⚠ {r.errors.join(" · ")}</span>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Btn onClick={() => run("commit")} disabled={busy || preview.summary.errors > 0}>
              {preview.summary.errors > 0
                ? "Sửa hết lỗi trong file rồi validate lại"
                : busy ? "Đang ghi…" : "Bước 3 — Commit (ghi tất cả)"}
            </Btn>
          </div>
        </Card>
      )}
    </div>
  );
}
