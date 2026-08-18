"use client";
// Khối ưu đãi "FPT muốn gửi lại xóm mình một điều dễ thương" — dựng lại theo
// docs/lp/lp1.png: MỘT card trắng lớn, tiêu đề + mô tả căn giữa, form 2 cột bên dưới.
// 18/8: thay ô free text "Bạn đang ở khu phố nào?" bằng TỈNH THÀNH (chọn từ danh mục
// chính quy) + ĐỊA CHỈ — khớp yêu cầu "bắt buộc phải điền tỉnh thành" của email review.
import { useEffect, useState } from "react";
import type { Me, SiteContentData } from "./types";
import { apiGet, apiSend } from "../client-api";
import { COPY } from "@/lib/copy";
import { INTERESTS } from "@/lib/taxonomy";
import { Field } from "./ui";

interface GeoUnit { code: string; name: string }

export default function LeadSection({
  me,
  content,
  requireIdentity,
  showToast,
}: {
  me: Me | null;
  content: SiteContentData;
  requireIdentity: (fn: () => void) => void;
  showToast: (msg: string) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [provinces, setProvinces] = useState<GeoUnit[]>([]);
  const [province, setProvince] = useState("");
  const [address, setAddress] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [optIn, setOptIn] = useState(false); // mặc định KHÔNG tick (quy tắc cứng 5)
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needSwitch, setNeedSwitch] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    apiGet<{ provinces: GeoUnit[] }>("/api/v1/geo")
      .then((r) => setProvinces(r.provinces))
      .catch(() => {});
  }, []);

  const toggleInterest = (k: string) =>
    setInterests((xs) => (xs.includes(k) ? xs.filter((x) => x !== k) : [...xs, k]));

  const submit = (confirmSwitch = false) =>
    requireIdentity(async () => {
      if (!optIn) { setError("Cần tick đồng ý nhận ưu đãi thì tụi mình mới lưu số nhé"); return; }
      if (!province) { setError("Chọn tỉnh/thành của bạn nhé"); return; }
      setBusy(true);
      setError(null);
      try {
        await apiSend("POST", "/api/v1/leads", {
          name, phone, province, address, interests,
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

  // Rectangle 47: panel trắng full-bleed, CHỈ bo 40px hai góc trên; form rộng 906
  return (
    <div className="w-full rounded-t-[32px] bg-white px-5 py-9 shadow-kp sm:rounded-t-[40px] sm:px-10 sm:py-12">
      <h2 className="kp-h2 kp-lead-title m-0 text-center text-[clamp(22px,4.4vw,40px)] tracking-[-0.02em] text-ink text-balance">
        {content.lead_title}
      </h2>
      <p className="mx-auto mt-4 max-w-[907px] text-center font-light text-[14.5px] leading-relaxed tracking-[-0.02em] text-ink sm:text-[16px]">
        {content.lead_body}
      </p>

      <div className="mx-auto mt-10 max-w-[906px]">
        {done ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <div className="text-3xl">🧧</div>
            <div className="font-display text-[1.3rem] font-bold text-teal">
              Đã nhận thông tin của bạn!
            </div>
            <p className="m-0 text-sm text-ink-soft">
              Tụi mình chỉ liên hệ để gửi ưu đãi bạn đã chọn — đúng như cam kết.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-4">
              <Field label="Họ và tên">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nhập họ tên đầy đủ của bạn"
                  className="kp-input tap"
                />
              </Field>
              <Field label="Số điện thoại">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="VD: 0912 xxx xxx"
                  className="kp-input tap"
                />
              </Field>
              <Field label="Tỉnh thành">
                <select
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="kp-input tap"
                >
                  <option value="">Lựa chọn</option>
                  {provinces.map((p) => (
                    <option key={p.code} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Địa chỉ">
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="VD: 107 Nguyễn Phong Sắc, Cầu Giấy, Hà Nội"
                  className="kp-input tap"
                />
              </Field>
            </div>

            <div className="mt-5">
              <div className="mb-2 text-[14px] font-bold tracking-[-0.02em] sm:text-[16px]">Nhà mình đang muốn tìm hiểu dịch vụ nào?</div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Object.entries(INTERESTS).map(([k, label]) => (
                  <button
                    key={k}
                    onClick={() => toggleInterest(k)}
                    className={`tap tap-sm-auto flex h-[44px] cursor-pointer items-center justify-center rounded-full border-[1.5px] px-3 text-center text-[13px] leading-snug tracking-[-0.02em] transition sm:h-[40px] sm:text-[16px] ${
                      interests.includes(k)
                        ? "border-brick bg-brick text-white"
                        : "border-ink bg-white text-ink hover:border-brick hover:text-brick"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <label className="mt-6 flex cursor-pointer items-start gap-2 text-[13px] leading-[1.45] tracking-[-0.02em] sm:text-[14px]">
              <input
                type="checkbox"
                checked={optIn}
                onChange={(e) => setOptIn(e.target.checked)}
                className="mt-[2px] h-[18px] w-[18px] flex-none cursor-pointer rounded-[6px] accent-brick"
              />
              <span>
                {COPY.optInCheckbox}
                <span
                  title={content.lead_privacy}
                  aria-label={content.lead_privacy}
                  className="ml-1.5 inline-grid h-4 w-4 cursor-help place-items-center rounded-full border border-ink-soft/40 text-[10px] text-ink-soft"
                >
                  i
                </span>
              </span>
            </label>

            {needSwitch && (
              <div className="mt-4 rounded-2xl border border-status-voting bg-status-voting-bg p-4 text-sm">
                Số này khác với số bạn đã dùng để định danh. Bạn muốn tiếp tục với số mới?
                <div className="mt-2 flex flex-wrap gap-2">
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
            {error && <p className="m-0 mt-3 text-sm font-medium text-status-waiting">{error}</p>}

            <button
              onClick={() => submit(false)}
              disabled={busy}
              className="kp-btn kp-btn-primary tap mt-6 h-[50px] w-full px-5 text-[16px] disabled:opacity-60"
            >
              {busy ? "Đang gửi…" : COPY.leadButton}
            </button>
            {!me && (
              <p className="m-0 mt-2.5 text-center text-xs text-ink-soft">
                Bạn sẽ xác thực số điện thoại một lần trước khi gửi để bảo vệ thông tin của mình.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
