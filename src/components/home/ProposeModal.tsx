"use client";
// Modal "Đề xuất góc phố mới" — dựng lại theo design docs/lp/lp3.png + lp4.png:
// wizard 2 BƯỚC trong modal giữa màn hình (bản cũ: drawer trượt phải, 5 bước một màn).
//   Bước 1/2 — Lựa chọn chủ đề (6 chủ đề, chọn xong mới đi tiếp)
//   Bước 2/2 — Thông tin khu phố: tên khu phố · tỉnh/thành · phường/xã · tên hẻm
//              · mô tả vấn đề · câu nhắc thương (tuỳ chọn)
// Giữ combobox tìm khu phố có sẵn (design vẽ input thường) để không sinh khu phố trùng —
// resolveNeighborhoodId chỉ tạo bản ghi mới khi thật sự là tên chưa có.
import { useEffect, useState } from "react";
import type { MapNeighborhood } from "./types";
import { apiGet, apiSend } from "../client-api";
import { CATEGORIES, type CategoryCode } from "@/lib/taxonomy";
import { COPY } from "@/lib/copy";
import { EXAMPLE_ISSUE_DESC } from "@/lib/examples";
import { formatAddress } from "@/lib/address";
import NeighborhoodPicker from "./NeighborhoodPicker";
import { Field, IconPin, Modal } from "./ui";

interface GeoUnit { code: string; name: string }

export default function ProposeModal({
  neighborhoods,
  defaultNeighborhoodId,
  requireIdentity,
  onClose,
  onDone,
}: {
  neighborhoods: MapNeighborhood[];
  defaultNeighborhoodId: string | null;
  /** Modal mở THẲNG (không chặn định danh trước) — chỉ hỏi ở bước bấm Gửi */
  requireIdentity: (fn: () => void) => void;
  onClose: () => void;
  onDone: () => void;
}) {
  const defaultNb = neighborhoods.find((n) => n.id === defaultNeighborhoodId) ?? null;
  const [step, setStep] = useState<1 | 2>(1);
  const [category, setCategory] = useState<CategoryCode | null>(null);
  const [nbId, setNbId] = useState<string | null>(defaultNb?.id ?? null);
  const [nbText, setNbText] = useState(defaultNb?.name ?? "");
  // Địa lý hành chính MỚI (1/7/2025): Tỉnh/Thành → thẳng Phường/Xã, bỏ quận/huyện.
  // Danh mục chính thức (34 tỉnh, 3.321 phường/xã) load từ /api/v1/geo — CHỌN, không nhập.
  const [provinces, setProvinces] = useState<GeoUnit[]>([]);
  const [wards, setWards] = useState<GeoUnit[]>([]);
  const [cityCode, setCityCode] = useState("");
  const [city, setCity] = useState("");
  const [ward, setWard] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nb = neighborhoods.find((n) => n.id === nbId) ?? null;

  useEffect(() => {
    apiGet<{ provinces: GeoUnit[] }>("/api/v1/geo")
      .then((r) => setProvinces(r.provinces))
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!cityCode) { setWards([]); return; }
    let stale = false;
    apiGet<{ wards: GeoUnit[] }>(`/api/v1/geo?province=${cityCode}`)
      .then((r) => { if (!stale) setWards(r.wards); })
      .catch(() => {});
    return () => { stale = true; };
  }, [cityCode]);

  // Preview địa chỉ theo cấu trúc 'Tên hẻm – Phường/Xã – Tỉnh/Thành'
  const addressPreview = formatAddress(
    location,
    nb ? nb.ward || nb.name : ward || nbText,
    nb ? nb.city : city
  );

  const goStep2 = () => {
    if (!category) { setError("Chọn chủ đề nhé"); return; }
    setError(null);
    setStep(2);
  };

  const submit = () => {
    if (!nbId && !nbText.trim()) { setError("Chọn hoặc nhập tên khu phố của bạn nhé"); return; }
    if (!nbId && !city) { setError("Chọn tỉnh/thành của khu phố nhé"); return; }
    if (!location.trim()) { setError("Nhập tên hẻm/ngõ muốn treo nhé"); return; }
    // Hỏi định danh ở ĐÂY, không phải lúc mở modal (email 18/8: bấm "Đề xuất góc phố mới"
    // mà bung form ưu đãi là sai luồng)
    requireIdentity(async () => {
      setBusy(true);
      setError(null);
      try {
        await apiSend("POST", "/api/v1/issues", {
          category,
          location_text: location,
          description,
          neighborhood_id: nbId,
          neighborhood_text: nbId ? null : nbText,
          neighborhood_city: nbId ? null : city || null,
          neighborhood_ward: nbId ? null : ward || null,
          suggested_content: suggestion,
        });
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
      } finally {
        setBusy(false);
      }
    });
  };

  return (
    <Modal
      title="Đề xuất góc phố mới"
      onClose={onClose}
      onBack={step === 2 ? () => { setStep(1); setError(null); } : undefined}
      wide
    >
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <span className="text-[14.5px] font-bold">
          {step === 1 ? "Lựa chọn chủ đề" : "Thông tin khu phố của bạn"}
        </span>
        <span className="text-[13px] text-ink-soft">{step}/2</span>
      </div>

      {step === 1 ? (
        <>
          <div className="flex flex-col gap-2.5">
            {(Object.entries(CATEGORIES) as [CategoryCode, { label: string; icon: string; desc: string }][]).map(
              ([code, c]) => {
                const on = category === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setCategory(code)}
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                      on
                        ? "border-ink bg-ink text-white"
                        : "border-cream-dark bg-white text-ink hover:border-brick"
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14.5px] font-bold">{c.label}</span>
                      <span className={`block text-[12.5px] leading-snug ${on ? "text-white/75" : "text-ink-soft"}`}>
                        {c.desc}
                      </span>
                    </span>
                    {on && <span aria-hidden className="flex-none text-lg">✓</span>}
                  </button>
                );
              }
            )}
          </div>
          {error && <p className="m-0 mt-3 text-sm font-medium text-status-waiting">{error}</p>}
          <div className="py-5">
            <button onClick={goStep2} className="kp-btn kp-btn-primary tap w-full px-5 py-3">
              Tiếp tục đề xuất
            </button>
          </div>
        </>
      ) : (
        <>
          <Field label="Tên khu phố">
            <NeighborhoodPicker
              neighborhoods={neighborhoods}
              valueId={nbId}
              valueText={nbText}
              placeholder="Nhập tên khu phố của bạn"
              onChange={(id, text) => { setNbId(id); setNbText(text); }}
            />
          </Field>

          <div className="mt-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Field label="Tỉnh/thành phố">
              {nb ? (
                <input value={nb.city ?? ""} disabled className="kp-input bg-cream text-ink-soft" />
              ) : (
                <select
                  value={cityCode}
                  onChange={(e) => {
                    const code = e.target.value;
                    setCityCode(code);
                    setCity(provinces.find((p) => p.code === code)?.name ?? "");
                    setWard("");
                  }}
                  className="kp-input tap"
                >
                  <option value="">Lựa chọn</option>
                  {provinces.map((p) => (
                    <option key={p.code} value={p.code}>{p.name}</option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Phường /Xã">
              {nb ? (
                <input value={nb.ward ?? ""} disabled className="kp-input bg-cream text-ink-soft" />
              ) : (
                <select
                  value={ward}
                  onChange={(e) => setWard(e.target.value)}
                  disabled={!cityCode}
                  className="kp-input tap disabled:bg-cream disabled:text-ink-soft"
                >
                  <option value="">{cityCode ? "Lựa chọn" : "Chọn tỉnh/thành trước"}</option>
                  {wards.map((w) => (
                    <option key={w.code} value={w.name}>{w.name}</option>
                  ))}
                </select>
              )}
            </Field>
          </div>
          {nb && (
            <p className="m-0 mt-1 text-[11.5px] text-ink-soft">
              Tỉnh/thành và phường/xã lấy theo khu phố đã chọn (địa giới mới từ 1/7/2025).
            </p>
          )}

          <Field label="Tên hẻm/ngõ muốn treo" className="mt-3.5">
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Nhập tên hẻm ngõ nơi bạn sinh sống"
              className="kp-input tap"
            />
            {addressPreview && (
              <p className="m-0 mt-1.5 flex items-center gap-1.5 pl-1 text-[11.5px] text-ink-soft">
                <IconPin className="text-brick" />
                {addressPreview}
              </p>
            )}
          </Field>

          <Field label="Mô tả vấn đề tại khu phố" className="mt-3.5">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={category ? EXAMPLE_ISSUE_DESC[category] : "Nhập đoạn mô tả"}
              rows={3}
              className="kp-input"
            />
          </Field>

          {/* Design để trống nhãn ô thứ 2 (trùng nhãn ô mô tả) — theo flow hiện có,
              đây là câu nhắc thương gửi kèm, tuỳ chọn. */}
          <Field label="Viết câu nhắc thương của bạn (nếu có)" className="mt-3.5">
            <textarea
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value.slice(0, 120))}
              placeholder={COPY.suggestionPlaceholder}
              rows={2}
              className="kp-input"
            />
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <span className="flex gap-1.5">
                {["Nhắc", "Nhở", "Nhỏ", "Nhẹ"].map((n) => (
                  <span key={n} className="kp-n4chip">{n}</span>
                ))}
              </span>
              <span className="text-xs text-ink-soft">{suggestion.length}/120</span>
            </div>
          </Field>

          <p className="m-0 mt-3.5 rounded-2xl border border-cream-dark bg-cream px-4 py-2.5 text-[12px] leading-relaxed text-ink-soft">
            {COPY.proposeWarning}
          </p>
          {error && <p className="m-0 mt-2 text-sm font-medium text-status-waiting">{error}</p>}
          <div className="py-5">
            <button
              onClick={submit}
              disabled={busy}
              className="kp-btn kp-btn-primary tap w-full px-5 py-3 disabled:opacity-60"
            >
              {busy ? "Đang gửi…" : "Gửi đề xuất"}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
