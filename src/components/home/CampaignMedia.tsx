"use client";
// Khu hiển thị TVC + KV chiến dịch (dieuchinh.1.8 #19) — DEMO chờ thiết kế final:
// trái = KV placeholder, phải = video YouTube demo. Khi có TVC/KV chính thức chỉ cần
// thay YOUTUBE_ID và ảnh KV bên dưới.
import { SectionHead } from "./ui";

// TODO(thay khi final): ID video YouTube của TVC chiến dịch
const YOUTUBE_ID = "M7lc1UVf-VE"; // video demo bất kỳ theo yêu cầu action list #19

export default function CampaignMedia() {
  return (
    <section className="mx-auto max-w-[1120px] px-5 py-7">
      <SectionHead
        title="Câu chuyện “Khu phố biết thương”"
        hint="TVC & hình ảnh chiến dịch — demo, sẽ cập nhật khi có thiết kế final"
      />
      <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        {/* KV chiến dịch — placeholder chờ team Design */}
        <div className="kp-card relative flex min-h-[220px] flex-col items-center justify-center gap-2 overflow-hidden bg-gradient-to-br from-[#FBEAE3] to-[#F7EFE1] p-6 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-brick text-2xl text-white shadow-kp-s">♥</span>
          <div className="font-display text-xl font-extrabold">Khu phố biết thương</div>
          <div className="text-sm text-ink-soft">Nhắc · Nhở · Nhỏ · Nhẹ</div>
          <span className="mt-2 rounded-full border border-dashed border-cream-dark bg-white px-3 py-1 text-[11.5px] text-ink-soft">
            KV chiến dịch — chờ thiết kế final
          </span>
        </div>

        {/* TVC — nhúng YouTube demo */}
        <div className="kp-card overflow-hidden">
          <div className="relative aspect-video">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${YOUTUBE_ID}`}
              title="TVC chiến dịch Khu phố biết thương (demo)"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 h-full w-full border-0"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
