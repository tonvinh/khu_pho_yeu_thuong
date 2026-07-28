// Trang share "biển đã treo" (02 §11) — id là UUID câu nhắc (không đoán được)
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { one } from "@/lib/db";
import { absoluteUrl, withBase } from "@/lib/url";
import { imgUrl } from "@/lib/storage";
import { COPY } from "@/lib/copy";

export const dynamic = "force-dynamic";

interface SignData {
  id: string;
  content: string;
  author_name: string;
  location_text: string;
  neighborhood_name: string;
  sign_photo_key: string | null;
  installed_date: string | null;
}

async function loadSign(id: string): Promise<SignData | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return one<SignData>(
    `SELECT s.id, s.content, u.display_name AS author_name, i.location_text,
       n.name AS neighborhood_name, s.sign_photo_key, s.installed_date
     FROM suggestions s
     JOIN issues i ON i.id = s.issue_id
     JOIN neighborhoods n ON n.id = i.neighborhood_id
     JOIN users u ON u.id = s.author_id
     WHERE s.id = $1 AND s.status = 'installed'`,
    [id]
  );
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const s = await loadSign(id);
  if (!s) return {};
  const title = `Biển đã treo tại ${s.location_text} 🎉`;
  const description = COPY.shareSign(s.content, s.location_text);
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/bien/${id}`),
      images: [{ url: absoluteUrl(`/bien/${id}/opengraph-image`), width: 1200, height: 630 }],
    },
  };
}

export default async function SignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await loadSign(id);
  if (!s) notFound();
  const photo = imgUrl(s.sign_photo_key);

  return (
    <main className="mx-auto max-w-md px-4 py-10 text-center">
      <div className="rounded-3xl bg-white p-8 shadow-sm">
        <div className="inline-block rounded-full bg-status-signed px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-white">
          {COPY.panelSignTitle}
        </div>
        <h1 className="mt-4 text-2xl font-extrabold leading-snug">“{s.content}”</h1>
        <p className="mt-2 text-sm text-ink-soft">
          — {s.author_name} · {s.location_text}, {s.neighborhood_name}
        </p>
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="Biển đã treo" className="mt-4 w-full rounded-2xl object-cover" />
        )}
        <p className="mt-4 text-sm text-ink-soft">{COPY.panelSignThanks}</p>
        <a
          href={withBase("/")}
          className="tap mt-5 inline-block rounded-full bg-brick px-6 py-3 font-bold text-white"
        >
          Viết câu thương cho xóm bạn
        </a>
      </div>
    </main>
  );
}
