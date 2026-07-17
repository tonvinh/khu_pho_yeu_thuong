"use client";
// Form "Đề xuất vấn đề khu mình" (02 §4) — drawer theo prototype openNew():
// chọn danh mục kiểu .seg, vị trí + mô tả có ví dụ theo danh mục, sau gửi vào pending_review
import { useState } from "react";
import type { MapNeighborhood } from "./types";
import { apiSend } from "../client-api";
import { CATEGORIES, type CategoryCode } from "@/lib/taxonomy";
import { COPY } from "@/lib/copy";
import { EXAMPLE_ISSUE_DESC } from "@/lib/examples";
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
  const [category, setCategory] = useState<CategoryCode | null>(null);
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [nbId, setNbId] = useState(defaultNeighborhoodId || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!category) { setError("Chọn loại vấn đề nhé"); return; }
    setBusy(true);
    setError(null);
    try {
      await apiSend("POST", "/api/v1/issues", {
        category,
        location_text: location,
        description,
        neighborhood_id: nbId || null,
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
      title="Đề xuất vấn đề khu mình"
      sub="Chọn loại vấn đề an toàn đời thường"
      onClose={onClose}
    >
      <Field label="Loại vấn đề">
        <div className="flex flex-wrap gap-2">
          {(Object.entries(CATEGORIES) as [CategoryCode, { label: string; icon: string }][]).map(
            ([code, c]) => (
              <button
                key={code}
                onClick={() => setCategory(code)}
                className={`cursor-pointer rounded-[10px] border px-3 py-2 text-[13px] transition ${
                  category === code
                    ? "border-brick bg-brick text-white"
                    : "border-cream-dark bg-white text-ink hover:border-brick"
                }`}
              >
                {c.icon} {c.label}
              </button>
            )
          )}
        </div>
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

      <Field label="Góc xóm muốn treo (ngõ/hẻm/ngách)" className="mt-3.5">
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="VD: Sân chung Hẻm 25 Nguyễn Trãi"
          className="kp-input tap"
        />
      </Field>

      <Field label="Điều bạn muốn cả xóm cùng để ý ở góc này" className="mt-3.5">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={category ? EXAMPLE_ISSUE_DESC[category] : "VD: Xe hay phóng nhanh đoạn cua, gần chỗ trẻ con chơi."}
          rows={3}
          className="kp-input"
        />
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
        {busy ? "Đang gửi…" : "Gửi đề xuất → vào danh sách chờ"}
      </button>
    </Drawer>
  );
}
