import { one } from "@/lib/db";
import { ogCard, OG_SIZE } from "@/lib/og";

export const dynamic = "force-dynamic";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = /^[0-9a-f-]{36}$/i.test(id)
    ? await one<{ content: string; location_text: string; author_name: string }>(
        `SELECT s.content, i.location_text, u.display_name AS author_name
         FROM suggestions s JOIN issues i ON i.id=s.issue_id JOIN users u ON u.id=s.author_id
         WHERE s.id = $1 AND s.status = 'installed'`,
        [id]
      )
    : null;
  return ogCard({
    badge: "🎉 Biển đã treo tại đây",
    title: s ? `“${s.content}”` : "Một lời thương đã thành biển thật",
    subtitle: s ? `— ${s.author_name} · ${s.location_text}` : undefined,
    footer: "Cảm ơn cả khu phố đã cùng viết nên câu nhắc này 💛",
  });
}
