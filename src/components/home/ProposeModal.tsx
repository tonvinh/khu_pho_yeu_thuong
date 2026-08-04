"use client";
// Form "Đề xuất góc phố mới" (dieuchinh.1.8 #4–#7): theo đúng thứ tự flow #5
// Chọn chủ đề → chọn/tự nhập phường → nhập địa chỉ hẻm → mô tả vấn đề
// → viết câu nhắc thương (nếu có). Địa chỉ hiển thị 'Tên hẻm – Phường – Tỉnh' (#6).
import { useEffect, useState } from "react";
import type { MapNeighborhood } from "./types";
import { apiGet, apiSend } from "../client-api";
import { CATEGORIES, type CategoryCode } from "@/lib/taxonomy";
import { COPY } from "@/lib/copy";
import { EXAMPLE_ISSUE_DESC } from "@/lib/examples";
import { formatAddress } from "@/lib/address";
import NeighborhoodPicker from "./NeighborhoodPicker";
import { Drawer, Field } from "./ui";

interface GeoUnit { code: string; name: string }

export default function ProposeModal({
  neighborhoods,
  defaultNeighborhoodId,
  onClose,
  onDone,
}: {
  neighborhoods: MapNeighborhood[];
  defaultNeighborhoodId: string | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const defaultNb = neighborhoods.find((n) => n.id === defaultNeighborhoodId) ?? null;
  const [category, setCategory] = useState<CategoryCode | null>(null);
  const [nbId, setNbId] = useState<string | null>(defaultNb?.id ?? null);
  const [nbText, setNbText] = useState(defaultNb?.name ?? "");
  // Địa lý hành chính MỚI (từ 1/7/2025): Tỉnh/Thành → thẳng Phường/Xã, bỏ quận/huyện.
  // Danh mục chính thức (34 tỉnh, 3.321 phường/xã) load từ /api/v1/geo — CHỌN, không nhập.
  // Chỉ chọn khi tự thêm khu phố mới — chọn từ danh sách thì lấy theo bản ghi.
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
  // Preview địa chỉ theo cấu trúc 'Tên hẻm – Phường/Xã – Tỉnh/Thành' (#6)
  const addressPreview = formatAddress(
    location,
    nb ? nb.ward || nb.name : ward || nbText,
    nb ? nb.city : city
  );

  const submit = async () => {
    if (!category) { setError("Chọn chủ đề nhé"); return; }
    if (!nbId && !nbText.trim()) { setError("Chọn hoặc nhập tên khu phố của bạn nhé"); return; }
    if (!location.trim()) { setError("Nhập tên hẻm/ngõ muốn treo nhé"); return; }
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
  };

  return (
    <Drawer
      title="Đề xuất góc phố mới"
      sub="Chọn chủ đề, cho xóm biết góc phố của bạn ở đâu"
      onClose={onClose}
      wide
    >
      {/* Bước 1 — chọn 1 trong ĐÚNG 6 chủ đề (#2) */}
      <Field label="1 · Chọn chủ đề">
        <div className="flex flex-col gap-2">
          {(Object.entries(CATEGORIES) as [CategoryCode, { label: string; icon: string; desc: string }][]).map(
            ([code, c]) => (
              <button
                key={code}
                type="button"
                onClick={() => setCategory(code)}
                className={`cursor-pointer rounded-[10px] border px-3 py-2.5 text-left text-[14px] transition sm:py-2 sm:text-[13px] ${
                  category === code
                    ? "border-brick bg-brick text-white"
                    : "border-cream-dark bg-white text-ink hover:border-brick"
                }`}
              >
                <span className="font-semibold">{c.icon} {c.label}</span>
                <span className={`mt-0.5 block text-[12px] leading-snug sm:mt-0 sm:text-[11.5px] ${category === code ? "text-white/85" : "text-ink-soft"}`}>
                  {c.desc}
                </span>
              </button>
            )
          )}
        </div>
      </Field>

      {/* Bước 2 — địa chỉ khu phố theo địa lý hành chính MỚI (1/7/2025):
          Tên khu phố + Tỉnh/Thành (34 đơn vị) + Phường/Xã, không còn quận/huyện */}
      <Field label="2 · Tên khu phố của bạn" className="mt-3.5">
        <NeighborhoodPicker
          neighborhoods={neighborhoods}
          valueId={nbId}
          valueText={nbText}
          placeholder="Gõ để tìm hoặc tự nhập tên khu phố…"
          onChange={(id, text) => { setNbId(id); setNbText(text); }}
        />
      </Field>
      <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <Field label="Tỉnh / Thành phố">
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
              <option value="">— Chọn tỉnh / thành —</option>
              {provinces.map((p) => (
                <option key={p.code} value={p.code}>{p.name}</option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Phường / Xã">
          {nb ? (
            <input value={nb.ward ?? ""} disabled className="kp-input bg-cream text-ink-soft" />
          ) : (
            <select
              value={ward}
              onChange={(e) => setWard(e.target.value)}
              disabled={!cityCode}
              className="kp-input tap disabled:bg-cream disabled:text-ink-soft"
            >
              <option value="">
                {cityCode ? "— Chọn phường / xã —" : "Chọn tỉnh / thành trước"}
              </option>
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

      {/* Bước 3 — địa chỉ hẻm */}
      <Field label="3 · Tên hẻm/ngõ muốn treo" className="mt-3.5">
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="VD: Hẻm 25 Nguyễn Trãi"
          className="kp-input tap"
        />
        {addressPreview && (
          <p className="m-0 mt-1 text-[11.5px] text-ink-soft">📍 {addressPreview}</p>
        )}
      </Field>

      {/* Bước 4 — mô tả vấn đề (#7) */}
      <Field label="4 · Mô tả vấn đề tại khu phố này" className="mt-3.5">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={category ? EXAMPLE_ISSUE_DESC[category] : "VD: Xe hay phóng nhanh đoạn cua, gần chỗ trẻ con chơi."}
          rows={3}
          className="kp-input"
        />
      </Field>

      {/* Bước 5 — câu nhắc thương gửi kèm, tuỳ chọn (#5) */}
      <Field label="5 · Viết câu nhắc thương của bạn (nếu có)" className="mt-3.5">
        <textarea
          value={suggestion}
          onChange={(e) => setSuggestion(e.target.value.slice(0, 120))}
          placeholder={COPY.suggestionPlaceholder}
          rows={2}
          className="kp-input"
        />
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="flex gap-1.5">
            {["Nhắc", "Nhở", "Nhỏ", "Nhẹ"].map((n) => (
              <span key={n} className="kp-n4chip">{n}</span>
            ))}
          </span>
          <span className="text-xs text-ink-soft">{suggestion.length}/120</span>
        </div>
      </Field>

      <p className="m-0 mt-3 flex gap-1.5 rounded-xl border border-cream-dark bg-white px-[13px] py-2.5 text-xs leading-relaxed text-ink-soft">
        {COPY.proposeWarning}
      </p>
      {error && <p className="m-0 mt-2 text-sm font-medium text-status-waiting">{error}</p>}
      <button
        onClick={submit}
        disabled={busy}
        className="kp-btn kp-btn-primary tap mt-3 w-full px-5 py-3 disabled:opacity-60"
      >
        {busy ? "Đang gửi…" : "Gửi đề xuất cho xóm mình"}
      </button>
    </Drawer>
  );
}
