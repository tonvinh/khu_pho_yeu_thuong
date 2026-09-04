"use client";
// Popup dùng chung cho khu admin (z-50 — trên drawer z-40).
//
// QC 4/9: trước đây mỗi màn tự dựng một cái. Bản trong /admin/loi-nhac thiếu
// `role="dialog"`/`aria-modal` (trình đọc màn hình đọc như div thường) và không đóng
// được bằng Esc; màn Khu phố thì không có popup nào — lý do từ chối đề xuất phải gõ
// vào ô 11px nhét trong cột "Thao tác" rộng 76px. Gom về một chỗ cho đồng nhất.
import { useEffect } from "react";

export function AdminModal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/45" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-extrabold">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-full px-2 text-lg text-ink-soft hover:text-brick"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
