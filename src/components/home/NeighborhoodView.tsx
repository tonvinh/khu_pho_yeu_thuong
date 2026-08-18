"use client";
// Hồ sơ khu phố dựng theo SKIN MỚI 18/8 — dùng CHUNG hai nơi:
//   · popup `NeighborhoodModal` mở từ ô tra cứu 4N / slider khu phố tiêu biểu (mặc định)
//   · trang share `/khu-pho/[slug]` (link chia sẻ ra ngoài, cần OG nên vẫn là trang thật)
// Bố cục lấy lại các mảnh đã có của design: khung ảnh bo 28 + pill địa chỉ như slider,
// badge nghiêng -2°, dải 3 con số kiểu Counters, biển render bằng SignCard.
import { useState } from "react";
import type { NeighborhoodDetail } from "./types";
import type { SignPromo } from "./SignCard";
import SignCard from "./SignCard";
import { shortAddress } from "@/lib/address";
import { categoryLabel } from "@/lib/taxonomy";
import { IconHeartSolid, IconPin, IconUser, Stripe } from "./ui";
import { BASE } from "../client-api";

export default function NeighborhoodView({
  nb,
  promo,
  footer,
}: {
  nb: NeighborhoodDetail;
  promo: SignPromo;
  /** Hàng nút ở đáy — popup và trang share có CTA khác nhau */
  footer?: React.ReactNode;
}) {
  // Đạt chuẩn 4N thì bảng chứng nhận là ảnh ĐẦU TIÊN (bản cũ ưu tiên khoe bảng này)
  const photos = [
    ...(nb.certified_4n && nb.certificate_url ? [nb.certificate_url] : []),
    ...nb.photo_urls,
    ...(nb.photo_urls.length === 0 && nb.map_url ? [nb.map_url] : []),
  ];
  const [shot, setShot] = useState(0);
  const photo = photos[Math.min(shot, photos.length - 1)] ?? null;
  const addr = shortAddress(nb.ward, nb.city, nb.name);
  const remain = Math.max(0, nb.total_issues - nb.signed_issues);

  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = `${window.location.origin}${BASE}/khu-pho/${nb.slug}`;
    const text = nb.certified_4n
      ? `${nb.name} đã đạt “Khu phố biết thương” chuẩn 4N 💛`
      : `Cùng ${nb.name} viết những câu nhắc dễ thương cho xóm mình 💛`;
    if (navigator.share) {
      try {
        await navigator.share({ title: nb.name, text, url });
        return;
      } catch {
        /* người dùng huỷ → rơi xuống copy link */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      /* trình duyệt chặn clipboard → bỏ qua, người dùng copy tay từ thanh địa chỉ */
    }
  };

  return (
    <div>
      {/* ===== Khung ảnh: viền kem bọc ảnh bo 28 (cùng cách dựng với slider hero) ===== */}
      <div className="relative">
        <div className="relative aspect-[840/430] overflow-hidden rounded-[24px] border-[1.5px] border-cream-dark bg-cream p-2">
          <div className="relative h-full w-full overflow-hidden rounded-[18px]">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo}
                alt={`Khu phố ${nb.name}`}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-[#FFE9D2] to-[#FFD3A6] px-6 text-center">
                <p className="m-0 font-display text-[15px] font-bold text-brick-dark sm:text-[18px]">
                  Khu phố chưa có ảnh — hình xóm mình sắp lên đây thôi!
                </p>
              </div>
            )}

            {/* Pill địa chỉ góc phải trên — y hệt slider hero */}
            <span className="absolute right-2.5 top-2.5 flex max-w-[75%] items-center gap-2 rounded-full border-[2.7px] border-white bg-brick px-3 py-1.5 text-white shadow-kp-s">
              <span aria-hidden className="grid h-6 w-6 flex-none place-items-center rounded-full bg-white/25">
                <IconPin />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-bold leading-tight">{nb.name}</span>
                {addr && (
                  <span className="block truncate text-[10.5px] leading-tight opacity-90">{addr}</span>
                )}
              </span>
            </span>
          </div>
        </div>

        {/* Badge nghiêng -2° nhô ra góc trái trên (Frame 142 của design) */}
        {nb.certified_4n && (
          <span className="absolute -top-3 left-3 z-10 inline-flex h-[38px] -rotate-2 items-center gap-1.5 rounded-full border-[3px] border-accent-blue-light bg-accent-blue px-4 font-display text-[12px] font-bold uppercase tracking-[-0.02em] text-white shadow-kp-s sm:text-[13px]">
            <IconHeartSolid className="h-[13px] w-[13px]" />
            Đạt chuẩn 4N
          </span>
        )}

        {/* Chấm chuyển ảnh — chỉ khi khu có nhiều hơn một ảnh */}
        {photos.length > 1 && (
          <div className="mt-3 flex justify-center gap-2">
            {photos.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setShot(i)}
                aria-label={`Ảnh ${i + 1}`}
                aria-current={i === shot}
                className={`h-2.5 cursor-pointer rounded-full transition-all ${
                  i === shot ? "w-6 bg-brick" : "w-2.5 bg-cream-dark hover:bg-brick/40"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* ===== Trạng thái 4N ===== */}
      {nb.certified_4n ? (
        <p className="mt-4 flex items-start gap-2 rounded-2xl bg-status-signed-bg px-4 py-3 text-[14px] font-semibold leading-snug text-status-signed">
          <IconHeartSolid className="mt-0.5 h-4 w-4" />
          <span>
            {nb.name} đã chính thức là “Khu phố biết thương” chuẩn 4N
            {nb.certified_at
              ? ` từ ngày ${new Date(nb.certified_at).toLocaleDateString("vi-VN")}`
              : ""}
            {" — 100% biển đã treo 💛"}
          </span>
        </p>
      ) : (
        <div className="mt-4 rounded-2xl border border-cream-dark bg-cream px-4 py-3.5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <span className="text-[14px] font-bold text-ink">Hành trình đạt chuẩn 4N</span>
            <span className="font-display text-[14px] font-bold text-brick">
              {nb.signed_issues}/{nb.total_issues} biển · {nb.progress_pct}%
            </span>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full bg-brick transition-all"
              style={{ width: `${nb.progress_pct}%` }}
            />
          </div>
          <p className="m-0 mt-2 font-light text-[13px] leading-snug text-ink-soft">
            {nb.total_issues === 0
              ? "Xóm mình chưa có góc phố nào được duyệt — đề xuất một góc để bắt đầu nhé!"
              : `Còn ${remain} góc phố nữa là cả xóm được vinh danh “Khu phố biết thương”.`}
          </p>
        </div>
      )}

      {/* ===== 3 con số (kiểu dải Counters, thu nhỏ cho popup) ===== */}
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          { value: nb.signed_issues, label: "biển đã treo" },
          { value: nb.total_issues, label: "góc phố tham gia" },
          { value: nb.suggestions_total, label: "câu đóng góp" },
        ].map((it) => (
          <div key={it.label} className="rounded-2xl border border-cream-dark bg-white px-2 py-3">
            <div className="font-display text-[26px] font-bold leading-none text-brick sm:text-[30px]">
              {it.value < 10 ? `0${it.value}` : it.value.toLocaleString("vi-VN")}
            </div>
            <div className="mt-1.5 font-light text-[12px] leading-snug text-ink sm:text-[13px]">
              {it.label}
            </div>
          </div>
        ))}
      </div>

      {/* ===== Biển của khu phố ===== */}
      <div className="mt-5">
        <Stripe className="rounded-full" />
        <h4 className="kp-h2 mt-3 text-center text-[16px] tracking-[-0.02em] text-ink sm:text-[18px]">
          Biển của khu phố
        </h4>
        {nb.signs.length === 0 ? (
          <p className="m-0 mt-2 text-center font-light text-[13px] leading-snug text-ink-soft">
            Chưa có câu nhắc nào được duyệt ở đây — lời nhắc đầu tiên có thể là của bạn 💛
          </p>
        ) : (
          <div
            className={`mt-3 grid grid-cols-1 gap-4 ${
              /* 1 biển thì để nguyên 1 cột cho khỏi trống nửa hàng */
              nb.signs.length > 1 ? "sm:grid-cols-2" : "mx-auto sm:max-w-[60%]"
            }`}
          >
            {nb.signs.map((s) => (
              <figure key={s.id} className="kp-sign m-0">
                <SignCard content={s.content} promo={promo} />
                <figcaption className="mt-2 font-light text-[12px] leading-snug text-ink sm:text-[13px]">
                  <span className="block">
                    Chủ đề: <b>{categoryLabel(s.category)}</b>
                  </span>
                  <span className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
                    <span className="inline-flex items-center gap-1.5">
                      <IconPin className="text-brick" />
                      {s.location_text}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <IconUser className="text-brick" />
                      {s.author_name}
                    </span>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>

      {/* ===== CTA ===== */}
      <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
        {footer}
        <button onClick={share} className="kp-btn kp-btn-primary tap px-5 py-2.5">
          {copied ? "Đã chép link 💛" : "Chia sẻ khu phố"}
        </button>
      </div>
    </div>
  );
}
