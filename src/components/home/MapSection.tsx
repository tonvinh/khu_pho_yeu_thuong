"use client";
// Bản đồ khu phố trong hero (prototype .map-card): nền gradient giấy, chú giải 3 màu,
// pin là biển treo đung đưa theo trạng thái. Q3: public luôn là bản cách điệu,
// pin dùng toạ độ % — bấm pin mở drawer chi tiết.
import { useMemo, useState } from "react";
import type { MapData, MapPin } from "./types";
import { categoryIcon, categoryLabel } from "@/lib/taxonomy";

const SIGN_COLOR: Record<MapPin["status"], string> = {
  waiting: "bg-brick",
  voting: "bg-fpt",
  signed: "bg-teal",
};

const LEGEND: Array<[MapPin["status"], string]> = [
  ["waiting", "Đang chờ"],
  ["voting", "Đang bình chọn"],
  ["signed", "Đã có biển"],
];

export default function MapSection({
  map,
  onOpenIssue,
}: {
  map: MapData;
  onOpenIssue: (id: string) => void;
}) {
  const [nbIndex, setNbIndex] = useState(0);
  const nb = map.neighborhoods[nbIndex];
  const pins = useMemo(
    () => map.pins.filter((p) => p.neighborhood_id === nb?.id),
    [map.pins, nb]
  );

  if (!nb) return null;

  return (
    <div className="kp-card kp-card-3 relative overflow-hidden border border-cream-dark bg-gradient-to-br from-[#FBF7EF] to-[#EFE6D6] p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-2 pb-2 pt-1.5">
        <span className="font-display text-[15px] font-bold">Bản đồ khu phố</span>
        <span className="flex flex-wrap gap-3 text-[11.5px] text-ink-soft">
          {LEGEND.map(([st, label]) => (
            <span key={st} className="inline-flex items-center gap-1.5">
              <i className={`inline-block h-2.5 w-2.5 rounded-full ${SIGN_COLOR[st]}`} />
              {label}
            </span>
          ))}
        </span>
      </div>

      {/* Chọn khu phố đang xem */}
      {map.neighborhoods.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto px-2 pb-2.5">
          {map.neighborhoods.map((n, i) => (
            <button
              key={n.id}
              onClick={() => setNbIndex(i)}
              className={`shrink-0 cursor-pointer rounded-full border px-3 py-1 text-[12.5px] font-semibold transition ${
                i === nbIndex
                  ? "border-brick bg-brick text-white"
                  : "border-cream-dark bg-white text-ink-soft hover:border-brick hover:text-brick-dark"
              }`}
            >
              {n.name}
              {n.certified_4n && " 🏅"}
            </button>
          ))}
        </div>
      )}

      <div className="relative aspect-[4/3] overflow-hidden rounded-[14px]">
        {nb.map_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={nb.map_url}
            alt={`Bản đồ ${nb.name}`}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <MapPlaceholder />
        )}
        {pins.map((p) => (
          <button
            key={p.id}
            onClick={() => onOpenIssue(p.id)}
            title={`${categoryLabel(p.category)} · ${p.location_text}`}
            style={{ left: `${p.pin_x}%`, top: `${p.pin_y}%` }}
            className="kp-pin-sign absolute -translate-x-1/2 -translate-y-full cursor-pointer"
          >
            <span aria-hidden className="mx-auto block h-1.5 w-1.5 rounded-full bg-[#b9a888]" />
            <span aria-hidden className="mx-auto block h-3 w-[2px] bg-[#b9a888]" />
            <span
              className={`kp-sway grid h-7 w-9 place-items-center rounded-[8px] text-[15px] text-white shadow-kp-s ${SIGN_COLOR[p.status]}`}
            >
              {categoryIcon(p.category)}
            </span>
          </button>
        ))}
        {pins.length === 0 && (
          <p className="absolute inset-x-4 top-1/2 m-0 -translate-y-1/2 text-center text-sm text-ink-soft">
            Khu phố này chưa có góc xóm nào trên bản đồ — bạn đề xuất điểm đầu tiên nhé!
          </p>
        )}
      </div>
      <p className="m-0 px-2 pb-1 pt-2.5 text-center text-[11.5px] text-ink-soft">
        Bấm vào một biển treo để xem và viết câu nhắc cho góc xóm đó
      </p>
    </div>
  );
}

/** Nền cách điệu khi chưa có ảnh bản đồ — cụm nhà + ngõ hẻm theo prototype */
function MapPlaceholder() {
  return (
    <svg
      viewBox="0 0 560 420"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden
    >
      <rect width="560" height="420" fill="#F1E9DA" />
      <g opacity="0.85">
        <rect x="40" y="40" width="150" height="100" rx="12" fill="#EADFCB" />
        <rect x="210" y="30" width="170" height="80" rx="12" fill="#E5DAC4" />
        <rect x="400" y="45" width="120" height="110" rx="12" fill="#EADFCB" />
        <rect x="60" y="250" width="150" height="120" rx="12" fill="#E5DAC4" />
        <rect x="300" y="270" width="200" height="110" rx="12" fill="#EADFCB" />
        <rect x="235" y="150" width="120" height="120" rx="12" fill="#EFE6D6" />
      </g>
      <g stroke="#D8C9AE" strokeWidth="14" strokeLinecap="round" opacity="0.7" fill="none">
        <path d="M20,200 H540" />
        <path d="M280,20 V400" />
        <path d="M120,120 L120,200" />
        <path d="M430,200 L430,300" />
      </g>
    </svg>
  );
}
