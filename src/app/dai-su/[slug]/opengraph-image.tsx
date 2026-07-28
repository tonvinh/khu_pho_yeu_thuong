import { one } from "@/lib/db";
import { ogCard, OG_SIZE } from "@/lib/og";

export const dynamic = "force-dynamic";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await one<{ display_name: string; score: number; signs: number; votes: number }>(
    `SELECT u.display_name,
       COALESCE((SELECT sum(points)::int FROM score_events WHERE user_id=u.id AND is_valid),0) AS score,
       (SELECT count(*)::int FROM suggestions WHERE author_id=u.id AND status='installed') AS signs,
       (SELECT count(*)::int FROM votes v JOIN suggestions s ON s.id=v.suggestion_id
         WHERE s.author_id=u.id AND v.is_valid) AS votes
     FROM users u WHERE u.share_slug = $1 AND NOT u.is_shadow_banned`,
    [slug]
  );
  return ogCard({
    badge: "🏆 Cây bút của khu phố",
    title: p?.display_name || "Đại sứ khu phố",
    subtitle: p
      ? `${p.signs} câu được treo · ${p.votes} lượt thương · ${p.score} điểm`
      : undefined,
    emoji: "🏆",
  });
}
