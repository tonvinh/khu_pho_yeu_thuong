"use client";
// Thay bản đồ khu phố bằng slide ảnh khu phố tiêu biểu (dieuchinh.1.8 #1, ORDER #2):
// chọn phường → pack [ảnh + tag trạng thái + tên + địa chỉ]. Chỉ hiện khu phố admin
// bật "tiêu biểu", xếp theo featured_position (server ORDER BY, NULL đứng cuối);
// ảnh tổng quan tối đa 4 (neighborhood_photos, kích thước đồng nhất, admin upload);
// chưa có ảnh → bản đồ cách điệu / nền placeholder. Mũi tên & auto-slide 4s chạy hết
// ảnh khu đang xem rồi mới lăn sang khu kế — chip khu phố phía trên nhảy theo.
import { useEffect, useMemo, useRef, useState } from "react";
import type { MapData, MapNeighborhood } from "./types";
import { formatAddress } from "@/lib/address";

// 3 trạng thái khu phố theo ORDER #2 (màu xanh lá / xanh dương / cam)
const NB_STATUS = {
  certified: {
    label: "🥳 Đạt chuẩn Khu phố biết thương 4N",
    cls: "bg-status-signed-bg text-status-signed",
  },
  has_suggestions: {
    label: "🤩 Đang có rất nhiều câu nhắc 4N chờ được treo",
    cls: "bg-[#E3EDF7] text-accent-blue",
  },
  empty: {
    label: "🤗 Ở đây chưa có câu nhắc 4N. Cùng đề xuất nhé",
    cls: "bg-status-voting-bg text-status-voting",
  },
} as const;

export default function NeighborhoodSlider({
  map,
  onPropose,
}: {
  map: MapData;
  onPropose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [photoIdx, setPhotoIdx] = useState(0);
  // Block "Khu phố tiêu biểu": chỉ khu admin bật tiêu biểu (đã kèm điều kiện đang
  // hiển thị — server tự tắt tiêu biểu khi ẩn). Chưa chọn khu nào → hiện tất cả
  // để trang chủ không trống.
  const list = useMemo(() => {
    const featured = map.neighborhoods.filter((n) => n.is_featured);
    return featured.length > 0 ? featured : map.neighborhoods;
  }, [map.neighborhoods]);
  const nb = list[Math.min(index, list.length - 1)];
  const chipRowRef = useRef<HTMLDivElement>(null);

  // 20 khu phố tiêu chuẩn → hàng chip dài quá khung: giữ chip đang xem trong tầm nhìn
  // khi chuyển slide bằng mũi tên (không dùng scrollIntoView để khỏi cuộn cả trang)
  useEffect(() => {
    const row = chipRowRef.current;
    const chip = row?.children[index] as HTMLElement | undefined;
    if (!row || !chip) return;
    const left = chip.offsetLeft - (row.clientWidth - chip.offsetWidth) / 2;
    row.scrollTo({ left, behavior: "smooth" });
  }, [index]);

  const status = useMemo(() => {
    if (!nb) return NB_STATUS.empty;
    if (nb.certified_4n) return NB_STATUS.certified;
    const active = map.pins.some(
      (p) => p.neighborhood_id === nb.id && p.status !== "signed"
    );
    return active ? NB_STATUS.has_suggestions : NB_STATUS.empty;
  }, [map.pins, nb]);

  // Tối đa 4 ảnh tổng quan (kích thước đồng nhất) — chưa có thì dùng bản đồ cách điệu
  const photosOf = (n: MapNeighborhood) =>
    n.photo_urls.length > 0 ? n.photo_urls : n.map_url ? [n.map_url] : [];
  const photos = nb ? photosOf(nb) : [];
  const photo = photos[Math.min(photoIdx, photos.length - 1)] ?? null;
  const goto = (i: number) => { setIndex(i); setPhotoIdx(0); };
  // Mũi tên trượt TRONG ảnh của khu đang xem trước; hết ảnh mới lăn sang khu kế
  // (chip phía trên tự nhảy theo vì index đổi). Lùi từ ảnh đầu → ảnh CUỐI khu trước.
  const prev = () => {
    if (photoIdx > 0) return setPhotoIdx(photoIdx - 1);
    const i = (index - 1 + list.length) % list.length;
    setIndex(i);
    setPhotoIdx(Math.max(0, photosOf(list[i]).length - 1));
  };
  const next = () => {
    if (photoIdx < photos.length - 1) return setPhotoIdx(photoIdx + 1);
    goto((index + 1) % list.length);
  };

  // Tự động trượt: mỗi 4s sang ảnh kế (hết ảnh → khu kế). Người dùng bấm tay thì
  // photoIdx/index đổi → effect chạy lại, hẹn giờ tính lại từ đầu.
  useEffect(() => {
    if (list.length <= 1 && photos.length <= 1) return;
    const t = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      next();
    }, 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, photoIdx, list]);

  if (!nb) return null;

  return (
    <div className="kp-card kp-card-3 relative overflow-hidden border border-cream-dark bg-gradient-to-br from-[#FBF7EF] to-[#EFE6D6] p-2.5 sm:p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-1.5 pb-2 pt-1 sm:px-2 sm:pt-1.5">
        <span className="font-display text-[15px] font-bold">Khu phố tiêu biểu</span>
        <span className="text-[11.5px] text-ink-soft">{index + 1}/{list.length}</span>
      </div>

      {/* Chọn phường đang xem (ORDER #2: "Ấn chọn Phường sẽ xuất hiện pack") */}
      {list.length > 1 && (
        <div ref={chipRowRef} className="kp-scroll-x flex gap-1.5 px-1.5 pb-2.5 sm:px-2">
          {list.map((n, i) => (
            <button
              key={n.id}
              type="button"
              onClick={() => goto(i)}
              className={`flex-none cursor-pointer whitespace-nowrap rounded-full border px-3 py-2 text-[12.5px] font-semibold transition sm:py-1 ${
                i === index
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

      <div className="relative aspect-video overflow-hidden rounded-[14px]">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt={`Khu phố ${nb.name}`}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <PhotoPlaceholder />
        )}
        {/* Tag trạng thái nổi trên ảnh — mobile chừa chỗ cho mũi tên hai bên */}
        <span
          className={`absolute left-2.5 right-12 top-2.5 inline-block rounded-2xl px-2.5 py-1.5 text-[11px] font-semibold leading-snug shadow-kp-s sm:left-3 sm:right-auto sm:top-3 sm:max-w-[85%] sm:rounded-full sm:px-3 sm:text-[12px] ${status.cls}`}
        >
          {status.label}
        </span>

        {/* Chấm chuyển giữa tối đa 4 ảnh tổng quan của khu phố đang xem */}
        {photos.length > 1 && (
          <div className="absolute bottom-2.5 left-1/2 flex -translate-x-1/2 gap-1.5">
            {photos.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Ảnh ${i + 1}/${photos.length}`}
                onClick={() => setPhotoIdx(i)}
                className={`h-2 w-2 cursor-pointer rounded-full shadow-kp-s transition ${
                  i === Math.min(photoIdx, photos.length - 1) ? "bg-white" : "bg-white/50"
                }`}
              />
            ))}
          </div>
        )}

        {/* Điều hướng slide */}
        {list.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Khu phố trước"
              className="absolute left-2 top-1/2 grid h-9 w-9 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-cream-dark bg-white/90 text-ink shadow-kp-s hover:text-brick"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Khu phố sau"
              className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-cream-dark bg-white/90 text-ink shadow-kp-s hover:text-brick"
            >
              ›
            </button>
          </>
        )}
      </div>

      {/* Dòng thông tin: tên + địa chỉ [Phường – Tỉnh] */}
      <div className="flex flex-col gap-2 px-1.5 pb-1 pt-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-2">
        <div className="min-w-0">
          <div className="font-display text-[15px] font-bold">{nb.name}</div>
          {(nb.ward || nb.city) && (
            <div className="text-[12px] text-ink-soft">📍 {formatAddress(nb.ward, nb.city)}</div>
          )}
        </div>
        {!nb.certified_4n && (
          <button
            type="button"
            onClick={onPropose}
            className="kp-btn kp-btn-outline tap w-full px-3.5 py-1.5 text-[13px] sm:w-auto"
          >
            + Đề xuất góc phố mới
          </button>
        )}
      </div>
    </div>
  );
}

/** Nền cách điệu khi khu phố chưa có ảnh (chờ trade cung cấp — ORDER #2) */
function PhotoPlaceholder() {
  return (
    <svg
      viewBox="0 0 560 315"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden
    >
      <rect width="560" height="315" fill="#F1E9DA" />
      <g opacity="0.85">
        <rect x="40" y="90" width="110" height="140" rx="10" fill="#EADFCB" />
        <rect x="170" y="60" width="130" height="170" rx="10" fill="#E5DAC4" />
        <rect x="320" y="100" width="100" height="130" rx="10" fill="#EADFCB" />
        <rect x="440" y="75" width="90" height="155" rx="10" fill="#E5DAC4" />
      </g>
      <path d="M0,250 H560" stroke="#D8C9AE" strokeWidth="18" opacity="0.7" />
      <text x="280" y="292" textAnchor="middle" fill="#6e665a" fontSize="15" fontFamily="sans-serif">
        Ảnh khu phố đang được cập nhật…
      </text>
    </svg>
  );
}
