"use client";
// Khu hiển thị TVC + KV chiến dịch (dieuchinh.1.8 #19) — nội dung sửa được ở
// /admin/noi-dung: tiêu đề/mô tả khu, video YouTube và ảnh KV. Chưa upload ảnh KV
// → hiện placeholder "chờ thiết kế final" như demo ban đầu.
import type { SiteContentData } from "./types";
import { SectionHead } from "./ui";

export default function CampaignMedia({ content }: { content: SiteContentData }) {
  return (
    <section className="mx-auto max-w-[1120px] px-5 py-7">
      <SectionHead title={content.campaign_title} hint={content.campaign_hint} />
      <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        {/* KV chiến dịch — ảnh admin upload, chưa có → placeholder chờ team Design */}
        {content.campaign_kv_url ? (
          <div className="kp-card relative min-h-[220px] overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={content.campaign_kv_url}
              alt={content.campaign_title}
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="kp-card relative flex min-h-[220px] flex-col items-center justify-center gap-2 overflow-hidden bg-gradient-to-br from-[#FBEAE3] to-[#F7EFE1] p-6 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-brick text-2xl text-white shadow-kp-s">♥</span>
            <div className="font-display text-xl font-extrabold">Khu phố biết thương</div>
            <div className="text-sm text-ink-soft">Nhắc · Nhở · Nhỏ · Nhẹ</div>
            <span className="mt-2 rounded-full border border-dashed border-cream-dark bg-white px-3 py-1 text-[11.5px] text-ink-soft">
              KV chiến dịch — chờ thiết kế final
            </span>
          </div>
        )}

        {/* TVC — nhúng YouTube */}
        <div className="kp-card overflow-hidden">
          <div className="relative aspect-video">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${content.campaign_youtube_id}`}
              title={content.campaign_title}
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
