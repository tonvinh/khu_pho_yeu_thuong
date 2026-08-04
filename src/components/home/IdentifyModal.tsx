"use client";
// Modal "Cho xóm biết bạn là ai" (02 §8.1) — KHÔNG OTP; SĐT gửi server 1 lần qua HTTPS,
// không bao giờ lưu ở client. Style field theo prototype.
import { useState } from "react";
import type { MapNeighborhood, Me } from "./types";
import { apiSend } from "../client-api";
import NeighborhoodPicker from "./NeighborhoodPicker";
import { Field } from "./ui";

export default function IdentifyModal({
  neighborhoods,
  onClose,
  onDone,
}: {
  neighborhoods: MapNeighborhood[];
  onClose: () => void;
  onDone: (me: Me) => void;
}) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [nbId, setNbId] = useState<string | null>(null);
  const [nbText, setNbText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiSend<{ me: Me }>("POST", "/api/v1/auth/identify", {
        phone,
        display_name: name,
        neighborhood_id: nbId,
        neighborhood_text: nbId ? null : nbText || null,
      });
      onDone(res.me);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <h3 className="m-0 font-display text-xl font-extrabold">Để FPT gửi ưu đãi đến bạn 💛</h3>
      <p className="m-0 mt-1 text-sm text-ink-soft">
        Chỉ cần để lại một vài thông tin. FPT sẽ liên hệ khi bạn đồng ý; số điện thoại được bảo mật
        và không hiển thị công khai.
      </p>
      <Field label="Số điện thoại" className="mt-4">
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="VD: 090xxxxxxx"
          className="kp-input tap"
        />
      </Field>
      <Field label="Tên hiển thị (tên cả xóm hay gọi)" className="mt-3.5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="VD: Cô Tám tạp hoá, anh Dũng, nhà số 7…"
          className="kp-input tap"
        />
      </Field>
      <Field label="Khu phố của bạn" className="mt-3.5">
        {/* #11: search + thanh trượt + cho phép tự nhập tên phường */}
        <NeighborhoodPicker
          neighborhoods={neighborhoods}
          valueId={nbId}
          valueText={nbText}
          onChange={(id, text) => { setNbId(id); setNbText(text); }}
        />
      </Field>
      {error && <p className="m-0 mt-2 text-sm font-medium text-status-waiting">{error}</p>}
      <button
        onClick={submit}
        disabled={busy}
        className="kp-btn kp-btn-primary tap mt-4 w-full px-5 py-3 disabled:opacity-60"
      >
        {busy ? "Đang xử lý…" : "Bắt đầu thôi"}
      </button>
    </Modal>
  );
}

export function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    // z-50: PHẢI cao hơn Drawer (z-40) — modal định danh mở từ nút "thương" trong drawer
    // từng bị drawer che mất trên mobile (dieuchinh.1.8 #16)
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-[2px] sm:items-center" onClick={onClose}>
      <div
        className="kp-safe-b slide-up max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-cream px-5 pt-5 shadow-kp sm:rounded-3xl sm:px-6 sm:pt-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tay nắm kéo — gợi ý đây là bottom sheet trên mobile */}
        <span aria-hidden className="mx-auto mb-3 block h-1 w-10 rounded-full bg-cream-dark sm:hidden" />
        {children}
      </div>
    </div>
  );
}
