"use client";
// Form "Đề xuất vấn đề khu mình" (02 §4) — danh mục đóng, sau gửi vào pending_review
import { useState } from "react";
import type { MapNeighborhood } from "./types";
import { apiSend } from "../client-api";
import { CATEGORIES, type CategoryCode } from "@/lib/taxonomy";
import { COPY } from "@/lib/copy";
import { Modal } from "./IdentifyModal";

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
    <Modal onClose={onClose}>
      <h3 className="text-xl font-extrabold">Đề xuất vấn đề khu mình</h3>
      <p className="mt-1 text-sm text-ink-soft">Chọn loại vấn đề an toàn đời thường</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {(Object.entries(CATEGORIES) as [CategoryCode, { label: string; icon: string }][]).map(
          ([code, c]) => (
            <button
              key={code}
              onClick={() => setCategory(code)}
              className={`tap rounded-full px-3.5 py-2 text-sm font-semibold ${
                category === code ? "bg-brick text-white" : "bg-cream text-ink"
              }`}
            >
              {c.icon} {c.label}
            </button>
          )
        )}
      </div>

      <div className="mt-4 space-y-3">
        <select
          value={nbId}
          onChange={(e) => setNbId(e.target.value)}
          className="tap w-full rounded-xl border border-cream-dark bg-cream px-4 py-3"
        >
          <option value="">Khu phố…</option>
          {neighborhoods.map((n) => (
            <option key={n.id} value={n.id}>{n.name}</option>
          ))}
        </select>
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="VD: Hẻm 25 Nguyễn Trãi"
          className="tap w-full rounded-xl border border-cream-dark bg-cream px-4 py-3"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="VD: Xe hay phóng nhanh đoạn cua, gần chỗ trẻ con chơi."
          rows={3}
          className="w-full rounded-xl border border-cream-dark bg-cream px-4 py-3"
        />
      </div>

      <p className="mt-3 rounded-xl bg-cream px-3 py-2.5 text-xs leading-relaxed text-ink-soft">
        {COPY.proposeWarning}
      </p>
      {error && <p className="mt-2 text-sm font-medium text-status-waiting">{error}</p>}
      <button
        onClick={submit}
        disabled={busy}
        className="tap mt-4 w-full rounded-full bg-brick px-5 py-3 font-bold text-white disabled:opacity-60"
      >
        {busy ? "Đang gửi…" : "Gửi đề xuất → vào danh sách chờ"}
      </button>
    </Modal>
  );
}
