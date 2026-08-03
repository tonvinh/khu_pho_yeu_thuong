"use client";
// Form "Đề xuất góc phố mới" (dieuchinh.1.8 #4–#7): theo đúng thứ tự flow #5
// Chọn chủ đề → chọn/tự nhập phường → nhập địa chỉ hẻm → mô tả vấn đề
// → viết câu nhắc thương (nếu có). Địa chỉ hiển thị 'Tên hẻm – Phường – Tỉnh' (#6).
import { useState } from "react";
import type { MapNeighborhood } from "./types";
import { apiSend } from "../client-api";
import { CATEGORIES, type CategoryCode } from "@/lib/taxonomy";
import { COPY } from "@/lib/copy";
import { EXAMPLE_ISSUE_DESC } from "@/lib/examples";
import { formatAddress } from "@/lib/address";
import NeighborhoodPicker from "./NeighborhoodPicker";
import { Drawer, Field } from "./ui";

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
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nb = neighborhoods.find((n) => n.id === nbId) ?? null;
  // Preview địa chỉ theo cấu trúc 'Tên hẻm – Phường – Tỉnh' (#6)
  const addressPreview = formatAddress(
    location, nb ? nb.ward || nb.name : nbText, nb?.city
  );

  const submit = async () => {
    if (!category) { setError("Chọn chủ đề nhé"); return; }
    if (!nbId && !nbText.trim()) { setError("Chọn hoặc nhập tên phường của bạn nhé"); return; }
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
                className={`cursor-pointer rounded-[10px] border px-3 py-2 text-left text-[13px] transition ${
                  category === code
                    ? "border-brick bg-brick text-white"
                    : "border-cream-dark bg-white text-ink hover:border-brick"
                }`}
              >
                <span className="font-semibold">{c.icon} {c.label}</span>
                <span className={`block text-[11.5px] ${category === code ? "text-white/85" : "text-ink-soft"}`}>
                  {c.desc}
                </span>
              </button>
            )
          )}
        </div>
      </Field>

      {/* Bước 2 — phường: search + tự nhập (#11) */}
      <Field label="2 · Phường / khu phố của bạn" className="mt-3.5">
        <NeighborhoodPicker
          neighborhoods={neighborhoods}
          valueId={nbId}
          valueText={nbText}
          onChange={(id, text) => { setNbId(id); setNbText(text); }}
        />
      </Field>

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
