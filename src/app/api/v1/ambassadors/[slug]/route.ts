import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { loadAmbassadorDetail } from "@/lib/ambassador";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

// Hồ sơ cây bút + câu đã duyệt của người đó — popup "Cây bút khu phố" ở tab 3
// của IssueBoard gọi route này bằng share_slug (Figma bản 2/9 · B10).
// Cần người xem để đánh dấu câu đã bình chọn / câu của chính mình.
export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const viewer = await getSessionUser(req);
  const a = await loadAmbassadorDetail(slug, viewer?.id ?? null);
  if (!a) return jsonError(404, "Không tìm thấy cây bút này");
  return NextResponse.json({ ambassador: a });
}
