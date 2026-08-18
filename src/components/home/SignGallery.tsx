"use client";
// Khối "Biển mới của khu phố" (tên cũ: "Lời nhắc khi lên biển trông như thế nào?").
// Theo email review 18/8 + design docs/lp:
//  · BỎ 3 tab, BỎ nút bình chọn trên từng biển, BỎ "Xem thêm", BỎ card ghim "được thương nhất"
//  · Cố định lưới 3 × 2 = 6 biển MỚI NHẤT theo ngày duyệt (server đã LIMIT 6)
//  · Mỗi biển render bằng template thương hiệu (SignCard) thay cho ảnh upload;
//    dưới biển là dòng meta: chủ đề · phường · người viết.
// Chưa đủ 6 biển thật thì bù ví dụ minh hoạ để khối không trống trải.
import type { ApprovedSign, SiteContentData } from "./types";
import { EXAMPLE_SIGNS } from "@/lib/examples";
import { categoryLabel } from "@/lib/taxonomy";
import SignCard from "./SignCard";
import { IconPin, IconUser, SectionHead } from "./ui";

const SLOTS = 6;

export default function SignGallery({
  signs,
  content,
}: {
  signs: ApprovedSign[];
  content: SiteContentData;
}) {
  const promo = {
    line1: content.sign_promo_line1,
    line2: content.sign_promo_line2,
    sale_phone: content.sign_sale_phone,
    hotline: content.sign_hotline,
  };

  const real = signs.slice(0, SLOTS);
  const fillers = EXAMPLE_SIGNS.filter(
    (e) => !real.some((s) => s.content === e.quote)
  ).slice(0, SLOTS - real.length);

  return (
    <section className="mx-auto max-w-[1312px] px-4 py-8 sm:px-5 sm:pb-12 sm:pt-[40px]">
      <SectionHead title={content.signs_title} />

      {/* .fig Frame 232 gap=40 giữa tiêu đề và lưới; lưới cách nhau 32px */}
      <div className="grid grid-cols-1 gap-8 sm:mt-10 sm:grid-cols-2 lg:grid-cols-3">
        {real.map((s) => (
          <figure key={s.id} className="kp-sign m-0">
            <SignCard content={s.content} promo={promo} />
            {/* .fig Frame 225: dòng chủ đề 16px cao 21px, cách 8px tới hàng meta 14px cao 17px */}
            <figcaption className="mt-4 font-light text-[13px] leading-relaxed text-ink sm:text-[14px] sm:leading-[17px]">
              <span className="block text-ink sm:text-[16px] sm:leading-[21px]">
                Chủ đề: <b>{categoryLabel(s.category)}</b>
              </span>
              <span className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
                <span className="inline-flex items-center gap-1.5">
                  <IconPin className="text-brick" />
                  {s.neighborhood_name || s.location_text}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <IconUser className="text-brick" />
                  {s.author_name}
                </span>
              </span>
            </figcaption>
          </figure>
        ))}

        {fillers.map((e) => (
          <figure key={e.quote} className="kp-sign m-0 opacity-90">
            <SignCard content={e.quote} promo={promo} />
            {/* .fig Frame 225: dòng chủ đề 16px cao 21px, cách 8px tới hàng meta 14px cao 17px */}
            <figcaption className="mt-4 font-light text-[13px] leading-relaxed text-ink sm:text-[14px] sm:leading-[17px]">
              <span className="block text-ink sm:text-[16px] sm:leading-[21px]">Biển minh hoạ</span>
              <span className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
                <span className="inline-flex items-center gap-1.5">
                  <IconPin className="text-brick" />
                  {e.spot}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <IconUser className="text-brick" />
                  {e.by}
                </span>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
