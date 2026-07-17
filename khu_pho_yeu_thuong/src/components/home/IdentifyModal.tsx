"use client";
// Modal "Cho xóm biết bạn là ai" (02 §8.1) — KHÔNG OTP; SĐT gửi server 1 lần qua HTTPS,
// không bao giờ lưu ở client. Style field theo prototype.
import { useState } from "react";
import type { MapNeighborhood, Me } from "./types";
import { apiSend } from "../client-api";
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
  const [nbId, setNbId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiSend<{ me: Me }>("POST", "/api/v1/auth/identify", {
        phone,
        display_name: name,
        neighborhood_id: nbId || null,
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
      <h3 className="m-0 font-display text-xl font-extrabold">Cho xóm biết bạn là ai 💛</h3>
      <p className="m-0 mt-1 text-sm text-ink-soft">
        Chỉ cần số điện thoại một lần — không cần mật khẩu, không gửi tin nhắn xác thực.
        Số của bạn được bảo mật, không hiển thị cho ai.
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
        <select
          value={nbId}
          onChange={(e) => setNbId(e.target.value)}
          className="kp-input tap cursor-pointer"
        >
          <option value="">— Chọn khu phố —</option>
          {neighborhoods.map((n) => (
            <option key={n.id} value={n.id}>{n.name}</option>
          ))}
        </select>
      </Field>
      {error && <p className="m-0 mt-2 text-sm font-medium text-status-waiting">{error}</p>}
      <button
        onClick={submit}
        disabled={busy}
        className="kp-btn kp-btn-primary tap mt-4 w-full px-5 py-3 disabled:opacity-60"
      >
        {busy ? "Đang xử lý…" : "Vào xóm thôi"}
      </button>
    </Modal>
  );
}

export function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 backdrop-blur-[2px] sm:items-center" onClick={onClose}>
      <div
        className="slide-up max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-cream p-6 shadow-kp sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
