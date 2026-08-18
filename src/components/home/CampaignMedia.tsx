"use client";
// Khối TVC + KV chiến dịch — TẠM ẨN khỏi trang chủ theo email review 18/8
// ("Bỏ khúc này. Maybe khi em làm w des bố trí đc vị trí phù hợp cho TVC em sẽ cho thêm
//  nên anh back up ngầm cho em tool up link video nhé. Có thể hiển thị được nhiều vid,
//  play lần lượt ạ.").
// Component GIỮ NGUYÊN để bật lại chỉ bằng một dòng trong HomeShell khi design chốt
// vị trí; danh sách video quản lý ở /admin/noi-dung (site_content.campaign_youtube_ids).
import type { SiteContentData } from "./types";
import { SectionHead } from "./ui";

export default function CampaignMedia({ content }: { content: SiteContentData }) {
  const ids = content.campaign_youtube_ids;
  if (ids.length === 0) return null;
  // Phát lần lượt: video đầu là src, các video sau đưa vào tham số playlist —
  // YouTube tự chạy tiếp hết danh sách rồi quay vòng (loop=1).
  const [first, ...rest] = ids;
  const playlist = [...rest, first].join(",");

  return (
    <section className="mx-auto max-w-[1120px] px-4 py-8 sm:px-5 sm:py-12">
      <SectionHead title={content.campaign_title} hint={content.campaign_hint} />
      <div className="grid items-stretch gap-5 [&>*]:min-w-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        {content.campaign_kv_url ? (
          <div className="relative min-h-[180px] overflow-hidden rounded-3xl sm:min-h-[220px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={content.campaign_kv_url}
              alt={content.campaign_title}
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-3xl bg-brick-light p-6 text-center sm:min-h-[220px]">
            <div className="font-display text-xl font-bold text-brick">Khu phố biết thương</div>
            <div className="text-sm text-ink-soft">Nhắc · Nhở · Nhỏ · Nhẹ</div>
          </div>
        )}

        {/* CSP của proxy phải mở frame-src cho youtube-nocookie (deploy/Caddyfile) và
            iframe cần referrerPolicy riêng vì cả site đặt Referrer-Policy: no-referrer
            (không có thì YouTube báo "Error 153"). */}
        <div className="overflow-hidden rounded-3xl border border-cream-dark bg-white">
          <div className="relative aspect-video">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${first}?loop=1&playlist=${playlist}`}
              title={content.campaign_title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              className="absolute inset-0 h-full w-full border-0"
            />
          </div>
          <div className="border-t border-cream-dark px-4 py-2.5 text-center">
            <a
              href={`https://www.youtube.com/watch?v=${first}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12.5px] font-semibold text-ink-soft hover:text-brick-dark"
            >
              Không xem được video? Mở trên YouTube ↗
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
