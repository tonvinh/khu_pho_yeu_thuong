// Duyệt / từ chối đề xuất (04 §2): duyệt → waiting (pin đỏ) + ghi điểm +2 (trần 3/tuần)
import { NextRequest, NextResponse } from "next/server";
import { tx } from "@/lib/db";
import { jsonError, requireAdmin } from "@/lib/api";
import { recordScoreEvent } from "@/lib/score-service";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const action = body?.action as string;

  if (!["approve", "reject"].includes(action)) return jsonError(400, "Hành động không hợp lệ");

  try {
    await tx(async (c) => {
      const r = await c.query(
        `SELECT id, status, proposed_by FROM issues WHERE id = $1 FOR UPDATE`, [id]
      );
      const issue = r.rows[0];
      if (!issue) throw new Error("NOT_FOUND");
      if (issue.status !== "pending_review") throw new Error("BAD_STATE");

      if (action === "approve") {
        await c.query(
          `UPDATE issues SET status = 'waiting', approved_at = now() WHERE id = $1`, [id]
        );
        if (issue.proposed_by) {
          await recordScoreEvent(c, issue.proposed_by, "issue_approved", id);
        }
      } else {
        await c.query(
          `UPDATE issues SET status = 'rejected', review_note = $2 WHERE id = $1`,
          [id, String(body?.note || "").slice(0, 500) || null]
        );
      }
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NOT_FOUND") return jsonError(404, "Không tìm thấy đề xuất");
    if (msg === "BAD_STATE") return jsonError(409, "Đề xuất không ở trạng thái chờ duyệt");
    throw e;
  }
  return NextResponse.json({ ok: true });
}
