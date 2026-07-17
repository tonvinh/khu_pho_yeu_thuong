"use client";
// Bản đồ khu phố (Q3): bản cách điệu + pins toạ độ %, đổi màu theo trạng thái.
// Bấm pin → panel ảnh thật địa điểm; pin xanh → khung "Biển đã treo tại đây".
// Bấm tên khu phố → trạng thái chứng nhận "Khu phố biết thương" chuẩn 4N.
import { useMemo, useState } from "react";
import type { MapData, MapPin } from "./types";
import { apiGet, BASE } from "../client-api";
import { categoryIcon, categoryLabel, ISSUE_STATUS_LABEL } from "@/lib/taxonomy";
import { COPY } from "@/lib/copy";

const PIN_COLOR: Record<MapPin["status"], string> = {
  waiting: "bg-status-waiting",
  voting: "bg-status-voting",
  signed: "bg-status-signed",
};

interface PinDetail {
  issue: {
    id: string; category: string; location_text: string; description: string | null;
    status: string; photo_url: string | null;
  };
  suggestions: Array<{ id: string; content: string; status: string; sign_photo_url: string | null }>;
}

export default function MapSection({
  map,
  onOpenIssue,
}: {
  map: MapData;
  onOpenIssue: (id: string) => void;
}) {
  const [nbIndex, setNbIndex] = useState(0);
  const [activePin, setActivePin] = useState<MapPin | null>(null);
  const [pinDetail, setPinDetail] = useState<PinDetail | null>(null);
  const [showCert, setShowCert] = useState(false);

  const nb = map.neighborhoods[nbIndex];
  const pins = useMemo(
    () => map.pins.filter((p) => p.neighborhood_id === nb?.id),
    [map.pins, nb]
  );

  if (!nb) return null;

  const openPin = async (pin: MapPin) => {
    setActivePin(pin);
    setShowCert(false);
    setPinDetail(null);
    try {
      setPinDetail(await apiGet<PinDetail>(`/api/v1/issues/${pin.id}`));
    } catch { /* giữ panel với thông tin cơ bản */ }
  };

  const installedSuggestion = pinDetail?.suggestions.find((s) => s.status === "installed");

  return (
    <section className="mt-6">
      <h2 className="text-lg font-extrabold">🗺️ Bản đồ khu phố</h2>

      {/* Chọn khu phố */}
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {map.neighborhoods.map((n, i) => (
          <button
            key={n.id}
            onClick={() => { setNbIndex(i); setActivePin(null); setShowCert(false); }}
            className={`tap shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${
              i === nbIndex ? "bg-brick text-white" : "bg-white text-ink shadow-sm"
            }`}
          >
            {n.name} {n.certified_4n && "🏅"}
          </button>
        ))}
      </div>

      {/* Khung bản đồ */}
      <div className="mt-3 overflow-hidden rounded-3xl bg-white shadow-sm">
        <div className="relative aspect-[4/3] w-full">
          {nb.map_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={nb.map_url} alt={`Bản đồ ${nb.name}`} className="h-full w-full object-cover" />
          ) : (
            <MapPlaceholder />
          )}
          {pins.map((p) => (
            <button
              key={p.id}
              onClick={() => openPin(p)}
              title={`${categoryLabel(p.category)} · ${p.location_text}`}
              style={{ left: `${p.pin_x}%`, top: `${p.pin_y}%` }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white p-1 shadow-md ${PIN_COLOR[p.status]} ${activePin?.id === p.id ? "ring-4 ring-brick/30" : ""}`}
            >
              <span className="block h-3 w-3 text-center text-[10px] leading-3 text-white">
                {p.status === "signed" ? "✓" : ""}
              </span>
            </button>
          ))}
        </div>

        {/* Legend + link chứng nhận */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-cream-dark px-4 py-3">
          <div className="flex flex-wrap gap-3 text-xs font-medium text-ink-soft">
            <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-status-waiting" />Đang chờ</span>
            <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-status-voting" />Đang bình chọn</span>
            <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-status-signed" />Đã có biển</span>
          </div>
          <button
            onClick={() => { setShowCert((v) => !v); setActivePin(null); }}
            className="tap text-sm font-semibold text-brick underline"
          >
            {nb.name} →
          </button>
        </div>
      </div>

      {/* Panel chứng nhận khu phố (02 §6) */}
      {showCert && (
        <div className="slide-up mt-3 rounded-3xl bg-white p-5 shadow-sm">
          {nb.certified_4n ? (
            <div>
              {nb.photo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={nb.photo_url} alt={nb.name} className="mb-3 h-40 w-full rounded-2xl object-cover" />
              )}
              <div className="inline-block rounded-full bg-brick px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                Chứng nhận đạt chuẩn 4N
              </div>
              <h3 className="mt-2 text-xl font-extrabold">{nb.name}</h3>
              <p className="text-sm text-ink-soft">đạt “Khu phố biết thương” chuẩn 4N</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full bg-status-signed/10 px-3 py-1.5 text-status-signed">100% biển đã treo</span>
                {nb.certified_at && (
                  <span className="rounded-full bg-cream-dark px-3 py-1.5">
                    Hoàn thành {new Date(nb.certified_at).toLocaleDateString("vi-VN", { month: "2-digit", year: "numeric" })}
                  </span>
                )}
              </div>
              <a
                href={`${BASE}/khu-pho/${nb.slug}`}
                className="tap mt-4 inline-block rounded-full bg-brick px-5 py-2.5 text-sm font-bold text-white"
              >
                Chia sẻ 💛
              </a>
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-extrabold">{nb.name}</h3>
              <p className="mt-1 text-sm text-ink-soft">
                Khu phố đang trên hành trình đạt “Khu phố biết thương” chuẩn 4N — khi 100% biển
                của các góc xóm được treo, cả khu sẽ nhận chứng nhận 💛
              </p>
            </div>
          )}
        </div>
      )}

      {/* Panel pin */}
      {activePin && (
        <div className="slide-up mt-3 rounded-3xl bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-bold">
                {categoryIcon(activePin.category)} {categoryLabel(activePin.category)}
                <span className="ml-2 rounded-full bg-cream-dark px-2 py-0.5 text-xs font-semibold text-ink-soft">
                  {ISSUE_STATUS_LABEL[activePin.status]}
                </span>
              </div>
              <div className="text-sm text-ink-soft">{activePin.location_text}</div>
            </div>
            <button onClick={() => setActivePin(null)} className="tap px-2 text-ink-soft">✕</button>
          </div>

          {pinDetail?.issue.photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pinDetail.issue.photo_url}
              alt={activePin.location_text}
              className="mt-3 h-44 w-full rounded-2xl object-cover"
            />
          )}
          {pinDetail?.issue.description && (
            <p className="mt-2 text-sm text-ink-soft">{pinDetail.issue.description}</p>
          )}

          {activePin.status === "signed" && installedSuggestion ? (
            <div className="mt-3 rounded-2xl border-2 border-status-signed/40 bg-status-signed/5 p-4">
              <div className="text-xs font-bold uppercase tracking-wide text-status-signed">
                {COPY.panelSignTitle}
              </div>
              <p className="mt-1 text-lg font-bold leading-snug">“{installedSuggestion.content}”</p>
              {installedSuggestion.sign_photo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={installedSuggestion.sign_photo_url}
                  alt="Biển đã treo"
                  className="mt-2 h-40 w-full rounded-xl object-cover"
                />
              )}
              <p className="mt-2 text-sm text-ink-soft">{COPY.panelSignThanks}</p>
              <a
                href={`${BASE}/bien/${installedSuggestion.id}`}
                className="tap mt-3 inline-block rounded-full bg-brick px-5 py-2.5 text-sm font-bold text-white"
              >
                Chia sẻ
              </a>
            </div>
          ) : (
            <button
              onClick={() => onOpenIssue(activePin.id)}
              className="tap mt-3 w-full rounded-full bg-brick px-5 py-3 font-bold text-white"
            >
              Viết / bình chọn câu nhắc cho điểm này
            </button>
          )}
        </div>
      )}
    </section>
  );
}

/** Nền cách điệu khi khu phố chưa có ảnh bản đồ */
function MapPlaceholder() {
  return (
    <svg viewBox="0 0 400 300" className="h-full w-full" role="img" aria-label="Bản đồ cách điệu">
      <rect width="400" height="300" fill="#fbf5ec" />
      <g stroke="#e8cfc0" strokeWidth="10" strokeLinecap="round">
        <path d="M0 80 H400" /> <path d="M0 190 H400" />
        <path d="M90 0 V300" /> <path d="M230 0 V300" /> <path d="M330 40 V300" />
      </g>
      <g stroke="#f0ddd0" strokeWidth="4">
        <path d="M90 80 L230 190" /> <path d="M230 80 L330 190" />
      </g>
      <text x="200" y="285" textAnchor="middle" fontSize="12" fill="#b8a596">
        Sơ đồ minh hoạ — chờ ảnh bản đồ khu phố
      </text>
    </svg>
  );
}
