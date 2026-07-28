import { one } from "@/lib/db";
import { ogCard, OG_SIZE } from "@/lib/og";

export const dynamic = "force-dynamic";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const nb = await one<{ name: string; certified_4n: boolean; signed: number; total: number }>(
    `SELECT n.name, n.certified_4n,
       (SELECT count(*)::int FROM issues WHERE neighborhood_id=n.id AND status='signed') AS signed,
       (SELECT count(*)::int FROM issues WHERE neighborhood_id=n.id
          AND status IN ('waiting','voting','signed')) AS total
     FROM neighborhoods n WHERE n.slug = $1`,
    [slug]
  );
  return ogCard({
    badge: nb?.certified_4n ? "🏅 Chứng nhận đạt chuẩn 4N" : "💛 Khu phố biết thương",
    title: nb?.name || "Khu Phố Của Tôi",
    subtitle: nb?.certified_4n
      ? "đạt “Khu phố biết thương” chuẩn 4N — 100% biển đã treo!"
      : nb
        ? `${nb.signed}/${nb.total} biển đã treo trên hành trình chuẩn 4N`
        : undefined,
    emoji: "🏅",
  });
}
