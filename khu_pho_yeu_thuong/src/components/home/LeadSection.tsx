"use client";
// Lead tầng 2 — section "Ưu đãi cư dân" (02 §7.2). Copy nguyên văn 06 §2.
import { useState } from "react";
import type { Me } from "./types";
import { apiSend } from "../client-api";
import { COPY } from "@/lib/copy";
import { INTERESTS } from "@/lib/taxonomy";

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

  if (done) {
    return (
      <section className="mt-8 rounded-3xl bg-white p-6 text-center shadow-sm">
        <div className="text-3xl">🧧</div>
        <h2 className="mt-2 text-lg font-extrabold">Đã nhận thông tin của bạn!</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Tụi mình chỉ liên hệ để gửi ưu đãi bạn đã chọn — đúng như cam kết.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-3xl bg-white p-5 shadow-sm sm:p-6">
      <span className="inline-block rounded-full bg-brick-light px-3 py-1 text-xs font-bold text-brick">
        {COPY.leadBadge}
      </span>
      <h2 className="mt-2 text-xl font-extrabold">{COPY.leadTitle}</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{COPY.leadBody}</p>
      <p className="mt-2 rounded-xl bg-cream px-3 py-2.5 text-xs leading-relaxed text-ink-soft">
        {COPY.leadPrivacy}
      </p>

      <div className="mt-4 space-y-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="VD: Cô Tám, anh Dũng, nhà số 7..."
          className="tap w-full rounded-xl border border-cream-dark bg-cream px-4 py-3"
        />
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="VD: 090xxxxxxx"
          className="tap w-full rounded-xl border border-cream-dark bg-cream px-4 py-3"
        />
        <input
          value={nbText}
          onChange={(e) => setNbText(e.target.value)}
          placeholder="VD: Hẻm 42 Lê Lợi, P. Bàn Cờ"
          className="tap w-full rounded-xl border border-cream-dark bg-cream px-4 py-3"
        />
        <div>
          <div className="text-sm font-semibold">Bạn đang quan tâm điều gì cho nhà mình?</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {Object.entries(INTERESTS).map(([k, label]) => (
              <button
                key={k}
                onClick={() => toggleInterest(k)}
                className={`tap rounded-full px-3.5 py-2 text-sm font-semibold ${
                  interests.includes(k) ? "bg-brick text-white" : "bg-cream text-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <label className="flex cursor-pointer items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={optIn}
            onChange={(e) => setOptIn(e.target.checked)}
            className="mt-1 h-4 w-4 accent-brick"
          />
          <span>
            {COPY.optInCheckbox}
            <span className="block text-xs text-ink-soft">{COPY.optInNoteTier2}</span>
          </span>
        </label>
      </div>

      {needSwitch && (
        <div className="mt-3 rounded-xl border border-status-voting bg-status-voting/10 p-3 text-sm">
          Số này khác với số bạn đã dùng để định danh. Bạn muốn tiếp tục với số mới?
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => submit(true)}
              className="tap rounded-full bg-brick px-4 py-2 text-xs font-bold text-white"
            >
              Tiếp tục với số mới
            </button>
            <button
              onClick={() => setNeedSwitch(false)}
              className="tap rounded-full border border-ink-soft px-4 py-2 text-xs font-semibold"
            >
              Để mình kiểm tra lại
            </button>
          </div>
        </div>
      )}
      {error && <p className="mt-2 text-sm font-medium text-status-waiting">{error}</p>}

      <button
        onClick={() => submit(false)}
        disabled={busy}
        className="tap mt-4 w-full rounded-full bg-brick px-5 py-3 font-bold text-white disabled:opacity-60"
      >
        {busy ? "Đang gửi…" : COPY.leadButton}
      </button>
      {!me && (
        <p className="mt-2 text-center text-xs text-ink-soft">
          Bạn sẽ được hỏi định danh một lần trước khi gửi — để bảo vệ chính số của bạn.
        </p>
      )}
    </section>
  );
}
