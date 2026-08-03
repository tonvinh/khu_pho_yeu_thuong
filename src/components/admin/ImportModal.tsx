"use client";
// Modal import file dùng chung (trang Khu phố + Câu duyệt): chọn file → kiểm tra
// (preview lỗi theo dòng) → import all-or-nothing. Endpoint GET trả template mẫu.
import { useState } from "react";
import { apiUpload, BASE } from "../client-api";
import { Btn } from "./AdminShell";

interface PreviewRow { row: number; label: string; errors: string[] }
interface Preview {
  rows: PreviewRow[];
  summary: { total: number; errors: number };
  error?: string;
  ok?: boolean;
  message?: string;
}

export default function ImportModal({
  title, endpoint, children, onClose, onDone,
}: {
  title: string;
  endpoint: string;            // VD: /api/admin/neighborhoods/import — GET template, POST import
  children?: React.ReactNode;  // mô tả cột / lưu ý riêng từng trang
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (mode: "validate" | "commit") => {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    form.append("mode", mode);
    try {
      const res = await apiUpload<Preview>(endpoint, form);
      if (mode === "commit" && res.ok) {
        onDone(res.message || "Đã import ✓");
        return;
      }
      setPreview(res);
      if (res.error) setError(res.error);
    } catch (e) {
      const err = e as Error & { body?: Preview };
      if (err.body?.summary) { setPreview(err.body); setError(err.body.error || err.message); }
      else setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/45" onClick={onClose} />
      <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-2 border-b border-cream-dark px-5 py-4">
          <h2 className="font-extrabold">📥 {title}</h2>
          <button onClick={onClose} aria-label="Đóng" className="rounded-full px-2 text-lg text-ink-soft hover:text-brick">
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {children}
          <p className="text-xs text-ink-soft">
            <a href={`${BASE}${endpoint}`} className="font-bold text-brick underline" download>
              ⬇ Tải file mẫu (.xlsx)
            </a>{" "}
            · Nhận .xlsx / .csv · <strong>All-or-nothing</strong>: còn 1 dòng lỗi thì chưa ghi gì
            vào hệ thống.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <label className="cursor-pointer rounded-full bg-brick px-4 py-2 text-sm font-bold text-white">
              {file ? `📄 ${file.name}` : "Chọn file…"}
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  setFile(e.target.files?.[0] || null);
                  setPreview(null);
                  setError(null);
                  e.target.value = "";
                }}
              />
            </label>
            <Btn variant="outline" onClick={() => run("validate")} disabled={busy || !file}>
              {busy && !preview ? "Đang kiểm tra…" : "Kiểm tra file"}
            </Btn>
          </div>

          {error && <p className="text-sm font-medium text-status-waiting">{error}</p>}

          {preview && (
            <div>
              <p className="text-sm font-bold">
                {preview.summary.total} dòng ·{" "}
                {preview.summary.errors > 0 ? (
                  <span className="text-status-waiting">{preview.summary.errors} dòng lỗi</span>
                ) : (
                  <span className="text-status-signed">không có lỗi ✓</span>
                )}
              </p>
              <div className="mt-2 space-y-1">
                {preview.rows.map((r) => (
                  <div
                    key={r.row}
                    className={`rounded-lg px-3 py-1.5 text-xs ${r.errors.length ? "bg-status-waiting/10" : "bg-cream"}`}
                  >
                    Dòng {r.row}: {r.label}
                    {r.errors.length > 0 && (
                      <span className="ml-2 font-semibold text-status-waiting">⚠ {r.errors.join(" · ")}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t border-cream-dark px-5 py-4">
          <Btn onClick={() => run("commit")} disabled={busy || !preview || preview.summary.errors > 0}>
            {!preview
              ? "Import (kiểm tra file trước)"
              : preview.summary.errors > 0
                ? "Sửa hết lỗi trong file rồi kiểm tra lại"
                : busy ? "Đang ghi…" : "Import (ghi tất cả)"}
          </Btn>
          <Btn variant="ghost" onClick={onClose}>Đóng</Btn>
        </div>
      </div>
    </div>
  );
}
