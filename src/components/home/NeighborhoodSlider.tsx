"use client";
// Khối "Khu phố tiêu biểu" trong hero — skin mới (docs/lp/lp1.png) + email review 18/8:
//  · CHỈ hiện khu phố đã đạt chuẩn 4N ("đây chỉ là chỗ vinh danh")
//  · BỎ hàng chip chọn phường, BỎ bộ đếm ảnh "2/5", BỎ nút đề xuất góc phố
//  · Địa chỉ dồn 1 dòng, đưa lên thành pill nổi góc phải trên ảnh
// Mỗi khu phố hiển thị ĐÚNG MỘT ảnh — ảnh vị trí #1 trong neighborhood_photos (quyết định
// F14: vẫn giữ nguyên dữ liệu 4 ảnh/khu ở admin, trang chủ chỉ lấy ảnh đầu). Mũi tên &
// auto-slide 4s do đó chuyển thẳng sang KHU KẾ, không lật ảnh trong cùng một khu.
import { useCallback, useEffect, useMemo, useState } from "react";
import type { MapData, MapNeighborhood } from "./types";
import { shortAddress } from "@/lib/address";
import { IconPin } from "./ui";

export default function NeighborhoodSlider({ map }: { map: MapData }) {
  const [index, setIndex] = useState(0);

  // Chỉ khu ĐÃ ĐẠT CHUẨN 4N; is_featured chỉ còn dùng để ưu tiên thứ tự
  // (server đã ORDER BY featured_position, name).
  const list = useMemo(
    () => map.neighborhoods.filter((n) => n.certified_4n),
    [map.neighborhoods]
  );
  const nb: MapNeighborhood | undefined = list[Math.min(index, list.length - 1)];

  /** Ảnh chính của khu = ảnh #1; chưa upload ảnh nào thì dùng bản đồ cách điệu */
  const mainPhoto = (n: MapNeighborhood) => n.photo_urls[0] ?? n.map_url ?? null;
  const photo = nb ? mainPhoto(nb) : null;

  const prev = useCallback(
    () => setIndex((i) => (i - 1 + list.length) % list.length),
    [list.length]
  );
  const next = useCallback(() => setIndex((i) => (i + 1) % list.length), [list.length]);

  // Tự trượt 4s; người dùng bấm tay thì index đổi → hẹn giờ tính lại từ đầu
  useEffect(() => {
    if (list.length <= 1) return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") next();
    }, 4000);
    return () => clearInterval(t);
  }, [next, index, list.length]);

  const multiple = list.length > 1;

  return (
    <div className="relative mx-auto mt-8 w-full max-w-[920px] px-10 sm:mt-8 sm:px-10">
      {/* Badge xanh dương nhô ra góc trái trên — Frame 142: 213×55, r hết cỡ, #2323FF,
          viền #DBE9FF 3.3px, chữ Bold 18px, NGHIÊNG -2° (đo trên lp1.png: mép trên đi
          từ y=289 ở x=300 xuống y=281 ở x=470). Hộp chưa xoay đặt ở (284.7, 281.7)
          khổ 1440 → cách mép trái khối slider 24px, cách mép trên khung ảnh 11px. */}
      <span className="absolute -top-[10px] left-2 z-10 grid h-[44px] -rotate-2 place-items-center rounded-full border-[3.3px] border-accent-blue-light bg-accent-blue px-5 font-display text-[13px] font-bold uppercase tracking-[-0.02em] text-white shadow-kp sm:-top-[11px] sm:left-[24.7px] sm:h-[55px] sm:w-[213px] sm:px-0 sm:text-[18px] sm:shadow-none">
        Khu phố tiêu biểu
      </span>

      {/* Frame 136 (khung r=40, nền TRẮNG 50% + viền trắng 1.5px — không phải trắng đặc,
          đo trên lp1.png: #FFDCBD trên nền #FFB97C) bọc Frame 137 (ảnh r=28), chèn 14px */}
      <div className="relative aspect-[840/430] overflow-hidden rounded-[28px] border-[1.5px] border-white bg-white/50 p-2 sm:rounded-[40px] sm:p-[12.5px]">
        <div className="relative h-full w-full overflow-hidden rounded-[20px] sm:rounded-[28px]">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt={nb ? `Khu phố ${nb.name}` : "Khu phố tiêu biểu"}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <PhotoPlaceholder />
          )}

          {/* Địa chỉ dồn 1 dòng — pill nổi góc phải trên (thay dòng địa chỉ dưới ảnh) */}
          {nb && (
            <span className="absolute right-2.5 top-2.5 flex max-w-[75%] items-center gap-2 rounded-full border-[2.7px] border-white bg-brick px-3 py-1.5 text-white shadow-kp-s sm:right-3 sm:top-2.5 sm:h-[45px] sm:px-4 sm:py-0">
              <span aria-hidden className="grid h-6 w-6 flex-none place-items-center rounded-full bg-white/25">
                <IconPin />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-bold leading-tight sm:text-[14.4px]">
                  {nb.name}
                </span>
                {shortAddress(nb.ward, nb.city, nb.name) && (
                  <span className="block truncate text-[10.5px] leading-tight opacity-90 sm:text-[12px]">
                    {shortAddress(nb.ward, nb.city, nb.name)}
                  </span>
                )}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Mũi tên nằm NGOÀI ảnh: Button 40×40 ở (280…320, 502…542) và (1160…1200, …)
          khổ 1440 → tâm đúng mép khối slider, nền trắng 50%, chevron cam #FF8206 */}
      {multiple && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Khu phố trước"
            className="absolute left-0 top-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-white/50 text-brick transition hover:bg-white/70 sm:top-[53.2%]"
          >
            <IconChevron className="rotate-180" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Khu phố sau"
            className="absolute right-0 top-1/2 grid h-10 w-10 translate-x-1/2 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-white/50 text-brick transition hover:bg-white/70 sm:top-[53.2%]"
          >
            <IconChevron />
          </button>
        </>
      )}
    </div>
  );
}

/** Chưa có khu phố nào đạt chuẩn 4N (đầu chiến dịch) → giữ khung, báo "sắp có" */
function PhotoPlaceholder() {
  return (
    <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-[#FFE9D2] to-[#FFD3A6] px-6 text-center">
      <div>
        <div className="font-display text-[19px] font-bold text-brick-dark sm:text-[23px]">
          Khu phố đạt chuẩn 4N đầu tiên sắp lộ diện
        </div>
        <p className="m-0 mt-1.5 text-[13px] text-ink-soft sm:text-[14px]">
          Cùng góp lời nhắc để xóm mình được vinh danh ở đây nhé!
        </p>
      </div>
    </div>
  );
}

/** Chevron cam của nút chuyển khu (vuesax/linear/arrow-right trong .fig) */
function IconChevron({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 14 22"
      aria-hidden
      className={`h-[21px] w-[13px] ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 1.5 11.5 11l-9 9.5" />
    </svg>
  );
}
