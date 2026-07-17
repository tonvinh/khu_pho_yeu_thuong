"use client";
// Lead tầng 2 — khối "Ưu đãi cư dân" (02 §7.2), copy nguyên văn 06 §2.
// Prototype .lead-wrap: card gradient lớn, pitch bên trái + form trắng bên phải,
// pillbox chọn quan tâm (ô liu khi chọn), checkbox mặc định KHÔNG tick.
import { useState } from "react";
import type { Me } from "./types";
import { apiSend } from "../client-api";
import { COPY } from "@/lib/copy";
import { INTERESTS } from "@/lib/taxonomy";
import { Eyebrow, Field } from "./ui";

export default function LeadSection({
  me,
  requireIdentity,
  showToast,
}: {
  me: Me | null;
  requireIdentity: (fn: () => void) => void;
  showToast: (msg: string) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [nbText, setNbText] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [optIn, setOptIn] = useState(false); // mặc định KHÔNG tick
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needSwitch, setNeedSwitch] = useState(false);
  const [done, setDone] = useState(false);

  const toggleInterest = (k: string) =>
    setInterests((xs) => (xs.includes(k) ? xs.filter((x) => x !== k) : [...xs, k]));

  const submit = (confirmSwitch = false) =>
    requireIdentity(async () => {
      if (!optIn) { setError("Cần tick đồng ý nhận ưu đãi thì tụi mình mới lưu số nhé"); return; }
      setBusy(true);
      setError(null);
      try {
        await apiSend("POST", "/api/v1/leads", {
          name, phone, neighborhood_text: nbText, interests,
          opted_in: optIn, confirm_switch: confirmSwitch,
        });
        setDone(true);
        setNeedSwitch(false);
        showToast("Đã nhận thông tin — tụi mình sẽ liên hệ đúng lời hứa 💛");
      } catch (e) {
        const err = e as Error & { body?: { need_confirm_switch?: boolean } };
        if (err.body?.need_confirm_switch) setNeedSwitch(true);
        else setError(err.message);
      } finally {
        setBusy(false);
      }
    });

  return (
    <div className="grid items-start gap-7 rounded-[22px] border border-cream-dark bg-gradient-to-br from-[#FFF9F0] to-[#F7EFE1] p-6 shadow-kp lg:grid-cols-[1fr_1.15fr]">
      {/* Pitch */}
      <div className="flex flex-col gap-3">
        <Eyebrow>{COPY.leadBadge}</Eyebrow>
        <h2 className="m-0 font-display text-2xl font-extrabold leading-tight">{COPY.leadTitle}</h2>
        <p className="m-0 text-[14.5px] text-ink-soft">{COPY.leadBody}</p>
        <p className="m-0 rounded-xl border border-dashed border-cream-dark bg-white px-[13px] py-2.5 text-[12.5px] leading-relaxed text-ink-soft">
          {COPY.leadPrivacy}
        </p>
      </div>

      {/* Form */}
      <div className="kp-card p-[18px]">
        {done ? (
          <div className="flex flex-col items-center gap-2 px-2 py-4 text-center">
            <div className="text-3xl">🧧</div>
            <div className="font-display text-[1.3rem] font-extrabold text-teal">Đã nhận thông tin của bạn!</div>
            <p className="m-0 text-sm text-ink-soft">
              Tụi mình chỉ liên hệ để gửi ưu đãi bạn đã chọn — đúng như cam kết.
            </p>
          </div>
        ) : (
          <>
            <Field label="Tên bạn (hoặc tên cả nhà hay gọi)">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Cô Tám, anh Dũng, nhà số 7…"
                className="kp-input tap"
              />
            </Field>
            <Field label="Số điện thoại" className="mt-3.5">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="VD: 090xxxxxxx"
                className="kp-input tap"
              />
            </Field>
            <Field label="Khu phố của bạn (để ưu đãi đúng khu vực)" className="mt-3.5">
              <input
                value={nbText}
                onChange={(e) => setNbText(e.target.value)}
                placeholder="VD: Hẻm 42 Lê Lợi, P. Bàn Cờ"
                className="kp-input tap"
              />
            </Field>
            <div className="mt-3.5">
              <div className="mb-1.5 text-[12.5px] font-semibold text-ink-soft">
                Bạn đang quan tâm điều gì cho nhà mình?
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(INTERESTS).map(([k, label]) => (
                  <button
                    key={k}
                    onClick={() => toggleInterest(k)}
                    className={`cursor-pointer rounded-[10px] border px-3 py-2 text-[13px] transition ${
                      interests.includes(k)
                        ? "border-olive bg-olive text-white"
                        : "border-cream-dark bg-white text-ink hover:border-olive"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <label className="mt-3.5 flex cursor-pointer items-start gap-2.5 text-[13px] leading-[1.45]">
              <input
                type="checkbox"
                checked={optIn}
                onChange={(e) => setOptIn(e.target.checked)}
                className="mt-[3px] h-4 w-4 flex-none cursor-pointer accent-brick"
              />
              <span>
                {COPY.optInCheckbox}
                <span className="mt-0.5 block text-[11.5px] text-ink-soft">{COPY.optInNoteTier2}</span>
              </span>
            </label>

            {needSwitch && (
              <div className="mt-3 rounded-xl border border-status-voting bg-status-voting-bg p-3 text-sm">
                Số này khác với số bạn đã dùng để định danh. Bạn muốn tiếp tục với số mới?
                <div className="mt-2 flex gap-2">
                  <button onClick={() => submit(true)} className="kp-btn kp-btn-primary tap px-4 py-1.5 text-xs">
                    Tiếp tục với số mới
                  </button>
                  <button
                    onClick={() => setNeedSwitch(false)}
                    className="tap cursor-pointer rounded-[10px] border border-cream-dark bg-white px-4 py-1.5 text-xs font-semibold"
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
              className="kp-btn kp-btn-primary tap mt-3.5 w-full px-5 py-3 disabled:opacity-60"
            >
              {busy ? "Đang gửi…" : COPY.leadButton}
            </button>
            {!me && (
              <p className="m-0 mt-2 text-center text-xs text-ink-soft">
                Bạn sẽ được hỏi định danh một lần trước khi gửi — để bảo vệ chính số của bạn.
              </p>
            )}
            <p className="m-0 mt-3 text-center text-xs text-ink-soft">{COPY.footerSupport}</p>
          </>
        )}
      </div>
    </div>
  );
}
