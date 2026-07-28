// Trang share chứng nhận "Khu phố biết thương" (02 §6, §11)
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { one } from "@/lib/db";
import { absoluteUrl, withBase } from "@/lib/url";
import { imgUrl } from "@/lib/storage";
import { COPY } from "@/lib/copy";

export const dynamic = "force-dynamic";

interface NbData {
  name: string;
  certified_4n: boolean;
  certified_at: string | null;
  photo_key: string | null;
  total: number;
  signed: number;
}

async function loadNb(slug: string): Promise<NbData | null> {
  return one<NbData>(
    `SELECT n.name, n.certified_4n, n.certified_at, n.photo_key,
       (SELECT count(*)::int FROM issues WHERE neighborhood_id=n.id
          AND status IN ('waiting','voting','signed')) AS total,
       (SELECT count(*)::int FROM issues WHERE neighborhood_id=n.id AND status='signed') AS signed
     FROM neighborhoods n WHERE n.slug = $1`,
    [slug]
  );
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const nb = await loadNb(slug);
  if (!nb) return {};
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
  const nb = await loadNb(slug);
  if (!nb) notFound();
  const photo = imgUrl(nb.photo_key);
  const pct = nb.total === 0 ? 0 : Math.round((nb.signed / nb.total) * 100);

  return (
    <main className="mx-auto max-w-md px-4 py-10 text-center">
      <div className="rounded-3xl bg-white p-8 shadow-sm">
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={nb.name} className="mb-4 h-44 w-full rounded-2xl object-cover" />
        )}
        {nb.certified_4n ? (
          <>
            <div className="inline-block rounded-full bg-brick px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-white">
              Chứng nhận đạt chuẩn 4N
            </div>
            <h1 className="mt-3 text-2xl font-extrabold">{nb.name}</h1>
            <p className="mt-1 text-sm text-ink-soft">đạt “Khu phố biết thương” chuẩn 4N</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs font-semibold">
              <span className="rounded-full bg-status-signed/10 px-3 py-1.5 text-status-signed">
                100% biển đã treo
              </span>
              {nb.certified_at && (
                <span className="rounded-full bg-cream-dark px-3 py-1.5">
                  Hoàn thành{" "}
                  {new Date(nb.certified_at).toLocaleDateString("vi-VN", {
                    month: "2-digit",
                    year: "numeric",
                  })}
                </span>
              )}
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-extrabold">{nb.name}</h1>
            <p className="mt-2 text-sm text-ink-soft">
              Hành trình “Khu phố biết thương”: {nb.signed}/{nb.total} biển đã treo ({pct}%)
            </p>
            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-cream-dark">
              <div className="h-full rounded-full bg-status-signed" style={{ width: `${pct}%` }} />
            </div>
          </>
        )}
        <a
          href={withBase("/")}
          className="tap mt-6 inline-block rounded-full bg-brick px-6 py-3 font-bold text-white"
        >
          Viết câu nhắc cho xóm mình
        </a>
      </div>
    </main>
  );
}
