// Trang share chứng nhận "Khu phố biết thương" (02 §6, §11).
//
// 18/8: trong app, hồ sơ khu phố mở bằng POPUP ngay trên trang chủ (NeighborhoodModal) —
// trang này CHỈ còn phục vụ link chia sẻ ra ngoài (Zalo/Facebook cần OG tags nên bắt
// buộc là URL thật). Nội dung dùng chung component `NeighborhoodView` với popup, đặt
// trên nền cam + pill logo của skin mới để không lệch thiết kế chung.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { absoluteUrl, withBase } from "@/lib/url";
import { loadNeighborhoodDetail } from "@/lib/neighborhood";
import { getAdminUser } from "@/lib/admin-session";
import { getSiteContent } from "@/lib/site-content";
import { COPY } from "@/lib/copy";
import NeighborhoodView from "@/components/home/NeighborhoodView";

export const dynamic = "force-dynamic";

/** Khu đang ẩn → 404 với mọi người (pentest 10/2026, lỗi 5.2.3). Riêng admin đã đăng
 *  nhập được xem trước (nút "xem" ở /admin/khu-pho). Khách thường chỉ tốn đúng 1 query:
 *  chỉ khi KHÔNG thấy khu công khai mới tra tới session admin. */
async function loadForViewer(slug: string) {
  const nb = await loadNeighborhoodDetail(slug);
  if (nb) return nb;
  const admin = await getAdminUser().catch(() => null);
  if (!admin) return null;
  return loadNeighborhoodDetail(slug, null, { includeHidden: true });
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const nb = await loadForViewer(slug);
  if (!nb) return {};
  // Bản xem trước của admin: không cho máy tìm kiếm lập chỉ mục
  if (nb.hidden) return { title: `${nb.name} (đang ẩn) — xem trước`, robots: { index: false, follow: false } };
  const title = nb.certified_4n
    ? `${nb.name} — Khu phố biết thương chuẩn 4N 💛`
    : `${nb.name} — Khu Phố Của Tôi`;
  const description = nb.certified_4n
    ? COPY.shareCertified(nb.name)
    : `Cùng ${nb.name} viết những câu nhắc dễ thương cho xóm mình.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/khu-pho/${slug}`),
      images: [{ url: absoluteUrl(`/khu-pho/${slug}/opengraph-image`), width: 1200, height: 630 }],
    },
  };
}

export default async function NeighborhoodPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [nb, content] = await Promise.all([loadForViewer(slug), getSiteContent()]);
  if (!nb) notFound();

  return (
    <main className="relative min-h-screen pb-12">
      {/* Nền hero cam của skin mới, thu gọn cho trang share */}
      <div
        aria-hidden
        /* Kết thúc bằng đúng màu nền trang (cream) để không thấy vệt cắt ngang */
        className="absolute inset-x-0 top-0 h-[260px] bg-gradient-to-b from-[var(--kp-hero-from)] to-cream sm:h-[320px]"
      />

      <div className="relative mx-auto max-w-[720px] px-4 pt-6 sm:pt-10">
        {nb.hidden && (
          <p
            role="status"
            data-testid="hidden-preview"
            className="mb-4 rounded-xl border border-brick bg-white px-4 py-2 text-center text-[14px] text-ink"
          >
            Bản xem trước dành cho admin — khu phố đang ẩn, khách truy cập sẽ thấy trang 404.
          </p>
        )}
        {/* Pill logo — dựng như top bar trang chủ, bấm về trang chủ */}
        <a href={withBase("/")} className="mx-auto block w-fit" aria-label="Về trang chủ">
          <span className="grid h-[76px] w-[168px] place-items-center rounded-full bg-white sm:h-[96px] sm:w-[192px]">
            <span className="grid h-[68px] w-[160px] place-items-center rounded-full border-[1.4px] border-[#FF7B00] bg-white sm:h-[87px] sm:w-[183px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/logo-khu-pho.svg"
                alt="Khu phố biết thương"
                width={133}
                height={71}
                className="h-auto w-[116px] sm:w-[133px]"
              />
            </span>
          </span>
        </a>

        <h1 className="kp-h2 kp-sec-title mt-5 text-center text-[clamp(21px,5.2vw,34px)] tracking-[-0.02em] text-white text-balance">
          {nb.certified_4n ? "Khu phố biết thương chuẩn 4N" : "Hành trình của xóm mình"}
        </h1>

        {/* Card trắng + sọc cam ló đáy — đúng vỏ của popup ở trang chủ */}
        <div className="relative mt-5">
          <div aria-hidden className="kp-stripe absolute inset-x-6 -bottom-2 hidden rounded-b-xl sm:block" />
          <div className="relative rounded-3xl border border-brick/40 bg-white px-4 py-5 shadow-kp sm:px-8 sm:py-7">
            {/* hero: trang share GIỮ khối ảnh + badge 4N (quyết định Q5) — popup ở
                trang chủ thì không, đúng frame 7756:2954. */}
            <NeighborhoodView
              hero
              nb={nb}
              footer={
                /* Cùng luồng với popup ở trang chủ (NeighborhoodModal): về trang chủ
                   và mở thẳng popup "Chọn góc phố" ĐÚNG khu phố này, thay vì thả người
                   dùng ở đầu trang chủ mất ngữ cảnh. */
                <a
                  href={withBase(`/?viet-loi-nhac=${encodeURIComponent(nb.name)}`)}
                  className="kp-btn kp-btn-solid tap px-5 py-2.5"
                >
                  Viết lời nhắc cho xóm mình
                </a>
              }
            />
          </div>
        </div>
      </div>
    </main>
  );
}
