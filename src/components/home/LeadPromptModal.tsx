"use client";
// Popup "Tôi muốn nhận ưu đãi" (dieuchinh.1.8 #8) — hiện sau các luồng tương tác:
// (1) đề xuất góc phố mới; (2) viết câu nhắc / vote câu nhắc.
// Chỉ ghi lead khi tick opt-in (quy tắc cứng 5); hiện tối đa 1 lần mỗi thiết bị.
import { useState } from "react";
import type { Me, SiteContentData } from "./types";
import { apiSend } from "../client-api";
import { COPY } from "@/lib/copy";
import { Field, Modal } from "./ui";

export default function LeadPromptModal({
  me,
  content,
  onClose,
  showToast,
}: {
  me: Me | null;
  content: SiteContentData;
  onClose: () => void;
  showToast: (msg: string) => void;
}) {
  const [phone, setPhone] = useState("");
  const [optIn, setOptIn] = useState(false); // mặc định KHÔNG tick
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needSwitch, setNeedSwitch] = useState(false);

  const submit = async (confirmSwitch = false) => {
    if (!optIn) { setError("Cần tick đồng ý nhận ưu đãi thì tụi mình mới lưu số nhé"); return; }
    setBusy(true);
    setError(null);
    try {
      await apiSend("POST", "/api/v1/leads", {
        name: me?.display_name || "",
        phone,
        interests: [],
        opted_in: true,
        confirm_switch: confirmSwitch,
      });
      showToast("Đã nhận thông tin — tụi mình sẽ liên hệ đúng lời hứa 💛");
      onClose();
    } catch (e) {
      const err = e as Error & { body?: { need_confirm_switch?: boolean } };
      if (err.body?.need_confirm_switch) setNeedSwitch(true);
      else setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={COPY.leadPromptTitle} onClose={onClose}>
      {/* Popup không có trong .fig — dùng chung cỡ chữ/ô của 3 popup đã đo (700px,
          ô cao 50, nhãn 16px Bold) để cả bộ popup nhìn thống nhất. */}
      <p className="m-0 mb-6 font-light text-[15px] leading-relaxed text-ink-soft sm:text-[16px]">
        {COPY.leadPromptBody}
      </p>
      <Field label="Số điện thoại" size="lg">
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="VD: 090xxxxxxx"
          className="kp-input kp-input-lg tap"
        />
      </Field>
      <label className="mt-4 flex cursor-pointer items-start gap-2 font-light text-[14px] leading-[1.45]">
        <input
          type="checkbox"
          checked={optIn}
          onChange={(e) => setOptIn(e.target.checked)}
          className="mt-[2px] h-[18px] w-[18px] flex-none cursor-pointer rounded-[6px] accent-brick"
        />
        <span>{COPY.optInCheckbox}</span>
      </label>
      <p className="m-0 mt-3 rounded-2xl border border-dashed border-cream-dark bg-white px-4 py-2.5 font-light text-[13px] leading-relaxed text-ink-soft">
        {content.lead_privacy}
      </p>

      {needSwitch && (
        <div className="mt-3 rounded-xl border border-status-voting bg-status-voting-bg p-3 text-sm">
          Số này khác với số bạn đã dùng để định danh. Bạn muốn tiếp tục với số mới?
          <div className="mt-2 flex gap-2">
            <button onClick={() => submit(true)} className="kp-btn kp-btn-solid tap px-4 py-1.5 text-xs">
              Tiếp tục với số mới
            </button>
            <button
              onClick={() => setNeedSwitch(false)}
              className="kp-btn kp-btn-outline tap px-4 py-1.5 text-xs"
            >
              Để mình kiểm tra lại
            </button>
          </div>
        </div>
      )}
      {error && <p className="m-0 mt-2 text-sm font-medium text-status-waiting">{error}</p>}

      <button
        onClick={() => submit(false)}
        disabled={busy}
        className="kp-btn kp-btn-primary tap mt-6 h-[50px] w-full px-5 text-[16px] disabled:opacity-60"
      >
        {busy ? "Đang gửi…" : COPY.leadButton}
      </button>
      <button
        onClick={onClose}
        className="tap mb-5 mt-1.5 w-full cursor-pointer py-2 text-center text-sm text-ink-soft hover:text-ink"
      >
        Để lần sau
      </button>
    </Modal>
  );
}
