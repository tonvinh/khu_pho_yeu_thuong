"use client";
// Modal "Đề xuất góc phố mới" — dựng lại theo design docs/lp/lp3.png + lp4.png:
// wizard 2 BƯỚC trong modal giữa màn hình (bản cũ: drawer trượt phải, 5 bước một màn).
//   Bước 1/2 — Lựa chọn chủ đề (6 chủ đề, chọn xong mới đi tiếp)
//   Bước 2/2 — Thông tin khu phố: tên khu phố · tỉnh/thành · phường/xã · tên hẻm
//              · mô tả vấn đề · câu nhắc thương (tuỳ chọn)
// Quyết định 2/9 (docs/20): DESIGN THẮNG SPEC — bước 2 KHÔNG còn hộp cảnh báo
// (docs/02 §62), chip 4N và bộ đếm ký tự vì .fig 7458:41714 không vẽ.
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
import { Field, IconCheck, IconChevronDown, IconPin, Modal } from "./ui";

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
    >
      {/* Frame 212: hai đầu dòng, chữ 18px Regular #3D3D3D */}
      <div className="mb-4 flex items-baseline justify-between gap-3 text-[15px] tracking-[-0.02em] text-ink sm:text-[18px]">
        <span>{step === 1 ? "Lựa chọn chủ đề" : "Thông tin khu phố của bạn"}</span>
        <span>{step}/2</span>
      </div>

      {step === 1 ? (
        <>
          {/* Frame 240: 6 thẻ 636×54, bo 16, viền 1.5px #3D3D3D, cách nhau 16px;
              thẻ đang chọn tô đặc #3D3D3D, chữ trắng, dấu ✓ bên phải */}
          <div className="flex flex-col gap-4">
            {(Object.entries(CATEGORIES) as [CategoryCode, { label: string; icon: string; desc: string }][]).map(
              ([code, c]) => {
                const on = category === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setCategory(code)}
                    aria-pressed={on}
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border-[1.5px] px-4 py-2.5 text-left transition sm:h-[54px] sm:py-0 ${
                      on
                        ? "border-ink bg-ink text-white"
                        : "border-ink bg-white text-ink hover:border-brick"
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-bold leading-tight sm:text-[16px] sm:leading-[21px]">{c.label}</span>
                      {/* Mobile hẹp hơn 636 của .fig nên mô tả xuống 2 dòng thay vì bị cắt cụt;
                          từ sm mới ép 1 dòng đúng thẻ 54px của design. */}
                      <span className={`block line-clamp-2 text-[13px] font-light leading-snug sm:truncate sm:text-[14px] sm:leading-[18px] ${on ? "text-white/80" : "text-ink-soft"}`}>
                        {c.desc}
                      </span>
                    </span>
                    {on && <IconCheck className="h-[22px] w-[22px] flex-none" />}
                  </button>
                );
              }
            )}
          </div>
          {error && <p className="m-0 mt-3 text-sm font-medium text-status-waiting">{error}</p>}
          {/* Frame 205: nút cách danh sách 32px, cao 50 */}
          <div className="pb-5 pt-8">
            <button onClick={goStep2} className="kp-btn kp-btn-primary tap h-[50px] w-full px-5 text-[16px]">
              Tiếp tục đề xuất
            </button>
          </div>
        </>
      ) : (
        <>
          <Field label="Tên khu phố" size="lg">
            <NeighborhoodPicker
              neighborhoods={neighborhoods}
              valueId={nbId}
              valueText={nbText}
              placeholder="Nhập tên khu phố của bạn"
              size="lg"
              onChange={(id, text) => { setNbId(id); setNbText(text); }}
            />
          </Field>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Tỉnh/thành phố" size="lg">
              {nb ? (
                <input value={nb.city ?? ""} disabled className="kp-input kp-input-lg bg-cream text-ink-soft" />
              ) : (
                <span className="relative block">
                  <select
                    value={cityCode}
                    onChange={(e) => {
                      const code = e.target.value;
                      setCityCode(code);
                      setCity(provinces.find((p) => p.code === code)?.name ?? "");
                      setWard("");
                    }}
                    className="kp-input kp-input-lg tap appearance-none pr-12"
                  >
                    <option value="">Lựa chọn</option>
                    {provinces.map((p) => (
                      <option key={p.code} value={p.code}>{p.name}</option>
                    ))}
                  </select>
                  <IconChevronDown className="pointer-events-none absolute right-4 top-1/2 h-6 w-6 -translate-y-1/2 text-ink" />
                </span>
              )}
            </Field>
            <Field label="Phường /Xã" size="lg">
              {nb ? (
                <input value={nb.ward ?? ""} disabled className="kp-input kp-input-lg bg-cream text-ink-soft" />
              ) : (
                <span className="relative block">
                  <select
                    value={ward}
                    onChange={(e) => setWard(e.target.value)}
                    disabled={!cityCode}
                    className="kp-input kp-input-lg tap appearance-none pr-12 disabled:bg-cream disabled:text-ink-soft"
                  >
                    <option value="">{cityCode ? "Lựa chọn" : "Chọn tỉnh/thành trước"}</option>
                    {wards.map((w) => (
                      <option key={w.code} value={w.name}>{w.name}</option>
                    ))}
                  </select>
                  <IconChevronDown className="pointer-events-none absolute right-4 top-1/2 h-6 w-6 -translate-y-1/2 text-ink" />
                </span>
              )}
            </Field>
          </div>
          {nb && (
            <p className="m-0 mt-1 text-[11.5px] text-ink-soft">
              Tỉnh/thành và phường/xã lấy theo khu phố đã chọn (địa giới mới từ 1/7/2025).
            </p>
          )}

          <Field label="Tên hẻm/ngõ muốn treo" size="lg" className="mt-4">
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Nhập tên hẻm ngõ nơi bạn sinh sống"
              className="kp-input kp-input-lg tap"
            />
            {addressPreview && (
              <p className="m-0 mt-1.5 flex items-center gap-1.5 pl-1 text-[11.5px] text-ink-soft">
                <IconPin className="text-brick" />
                {addressPreview}
              </p>
            )}
          </Field>

          <Field label="Mô tả vấn đề tại khu phố" size="lg" className="mt-4">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={category ? EXAMPLE_ISSUE_DESC[category] : "Nhập đoạn mô tả"}
              rows={3}
              className="kp-input kp-input-lg"
            />
          </Field>

          {/* Design để trống nhãn ô thứ 2 (trùng nhãn ô mô tả) — theo flow hiện có,
              đây là câu nhắc thương gửi kèm, tuỳ chọn. */}
          <Field label="Viết câu nhắc thương của bạn (nếu có)" size="lg" className="mt-4">
            <textarea
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value.slice(0, 120))}
              placeholder={COPY.suggestionPlaceholder}
              rows={3}
              className="kp-input kp-input-lg"
            />
          </Field>

          {error && <p className="m-0 mt-3 text-sm font-medium text-status-waiting">{error}</p>}
          {/* Frame 192: nút cách khối form 32px, cao 50 */}
          <div className="pb-5 pt-8">
            <button
              onClick={submit}
              disabled={busy}
              className="kp-btn kp-btn-primary tap h-[50px] w-full px-5 text-[16px] disabled:opacity-60"
            >
              {busy ? "Đang gửi…" : "Gửi đề xuất"}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
