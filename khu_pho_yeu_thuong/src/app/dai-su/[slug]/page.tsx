// Trang share công khai Đại sứ (02 §11) — chỉ hiển thị tên hiển thị công khai
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { one } from "@/lib/db";
import { absoluteUrl, withBase } from "@/lib/url";
import { COPY } from "@/lib/copy";

export const dynamic = "force-dynamic";

interface AmbassadorProfile {
  display_name: string;
  neighborhood_name: string | null;
  score: number;
  signs_installed: number;
  votes_received: number;
  suggestions_approved: number;
}

async function loadProfile(slug: string): Promise<AmbassadorProfile | null> {
  return one<AmbassadorProfile>(
    `SELECT u.display_name, n.name AS neighborhood_name,
       COALESCE((SELECT sum(points)::int FROM score_events WHERE user_id=u.id AND is_valid),0) AS score,
       (SELECT count(*)::int FROM suggestions WHERE author_id=u.id AND status='installed') AS signs_installed,
       (SELECT count(*)::int FROM votes v JOIN suggestions s ON s.id=v.suggestion_id
         WHERE s.author_id=u.id AND v.is_valid) AS votes_received,
       (SELECT count(*)::int FROM suggestions WHERE author_id=u.id
         AND status IN ('approved','selected','produced','installed')) AS suggestions_approved
     FROM users u LEFT JOIN neighborhoods n ON n.id=u.neighborhood_id
     WHERE u.share_slug = $1 AND NOT u.is_shadow_banned`,
    [slug]
  );
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const p = await loadProfile(slug);
  if (!p) return {};
  const title = `${p.display_name} — Cây bút của khu phố 🏆`;
  return {
    title,
    description: COPY.shareAmbassador,
    openGraph: {
      title,
      description: COPY.shareAmbassador,
      url: absoluteUrl(`/dai-su/${slug}`),
      images: [{ url: absoluteUrl(`/dai-su/${slug}/opengraph-image`), width: 1200, height: 630 }],
    },
  };
}

export default async function AmbassadorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await loadProfile(slug);
  if (!p) notFound();

  return (
    <main className="mx-auto max-w-md px-4 py-10 text-center">
      <div className="rounded-3xl bg-white p-8 shadow-sm">
        <div className="text-5xl">🏆</div>
        <div className="mt-3 inline-block rounded-full bg-brick px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-white">
          Cây bút của khu phố
        </div>
        <h1 className="mt-3 text-2xl font-extrabold">{p.display_name}</h1>
        {p.neighborhood_name && <p className="text-sm text-ink-soft">{p.neighborhood_name}</p>}
        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          <Stat value={p.signs_installed} label="câu được treo" />
          <Stat value={p.votes_received} label="lượt thương" />
          <Stat value={p.score} label="điểm" />
        </div>
        <p className="mt-5 text-sm leading-relaxed text-ink-soft">{COPY.shareAmbassador}</p>
        <a
          href={withBase("/")}
          className="tap mt-5 inline-block rounded-full bg-brick px-6 py-3 font-bold text-white"
        >
          Viết câu nhắc cho xóm mình
        </a>
      </div>
    </main>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl bg-cream p-3">
      <div className="text-2xl font-extrabold text-brick">{value}</div>
      <div className="text-[11px] font-medium text-ink-soft">{label}</div>
    </div>
  );
}
