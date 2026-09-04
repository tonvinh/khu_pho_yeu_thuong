"use client";
// Menu avatar cư dân trên top bar (QC 2/9 · B4).
//
// `POST /api/v1/auth/logout` đã chạy đúng từ lâu (thu hồi phiên + xoá cookie) nhưng
// KHÔNG giao diện nào gọi: avatar chỉ là một <span>. Phiên `kp_session` sống 180 ngày
// nên máy dùng chung không đổi được tài khoản, muốn thoát phải xoá cookie tay.
//
// Câu hỏi F5 (docs/21 — "menu avatar có gì?") PM vẫn chưa chốt, nên đây là bản TỐI
// GIẢN theo đề xuất QC: tên hiển thị · điểm hiện có · Đăng xuất. Thêm mục mới sau này
// chỉ việc chèn vào <ul>.
import { useEffect, useRef, useState } from "react";
import type { Me } from "./types";
import { apiSend } from "../client-api";

export default function UserMenu({ me, onLoggedOut }: { me: Me; onLoggedOut: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // Bấm ra ngoài / bấm Esc → đóng menu
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const logout = async () => {
    setBusy(true);
    try {
      await apiSend("POST", "/api/v1/auth/logout");
    } catch {
      /* phiên hỏng/đã hết hạn thì vẫn coi như đã thoát ở phía giao diện */
    }
    setBusy(false);
    setOpen(false);
    onLoggedOut();
  };

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Tài khoản của ${me.display_name}`}
        title={`Chào ${me.display_name}`}
        className="grid h-[44px] w-[44px] flex-none cursor-pointer place-items-center rounded-full sm:h-[35px] sm:w-[35px] border-[1.5px] border-white bg-white/20 font-display text-[14px] font-bold text-white transition hover:bg-white/35"
      >
        {me.display_name.trim().charAt(0).toUpperCase()}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[44px] z-30 w-[224px] rounded-2xl border border-cream-dark bg-white p-3 text-left shadow-kp-s"
        >
          <p className="m-0 truncate text-[15px] font-bold text-ink">{me.display_name}</p>
          <p className="m-0 mt-0.5 font-light text-[13px] text-ink-soft">
            {(me.score ?? 0).toLocaleString("vi-VN")} điểm
            {me.neighborhood_name ? ` · ${me.neighborhood_name}` : ""}
          </p>
          <button
            type="button"
            role="menuitem"
            onClick={logout}
            disabled={busy}
            className="tap mt-2 w-full cursor-pointer rounded-xl border border-cream-dark px-3 py-2 text-left text-[14px] text-ink transition hover:bg-cream disabled:opacity-50"
          >
            {busy ? "Đang đăng xuất…" : "Đăng xuất"}
          </button>
        </div>
      )}
    </div>
  );
}
