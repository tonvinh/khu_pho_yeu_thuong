// Toggle "thương" nhanh từ card trang chủ (không mở drawer): chưa thương góc này →
// thương câu đang dẫn đầu; đã thương → bỏ phiếu đó. Cùng quy tắc với vote theo câu
// (1 tài khoản 1 phiếu/câu, cấm tự thương, shadow-ban → is_valid=false).
import { NextRequest, NextResponse } from "next/server";
import { tx } from "@/lib/db";
import { jsonError, requireUserWrite } from "@/lib/api";
import { recordScoreEvent, invalidateScoreEvent } from "@/lib/score-service";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUserWrite(req);
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const user = auth.user;

  try {
    const result = await tx(async (c) => {
      // Đã có phiếu trên câu nào của góc này? → bỏ thương (toggle off)
      const existing = await c.query(
        `SELECT v.id, v.suggestion_id, s.author_id FROM votes v
         JOIN suggestions s ON s.id = v.suggestion_id
         WHERE s.issue_id = $1 AND v.user_id = $2
         ORDER BY v.created_at DESC LIMIT 1`,
        [id, user.id]
      );
      if (existing.rowCount && existing.rowCount > 0) {
        const vote = existing.rows[0];
        await c.query(`DELETE FROM votes WHERE id = $1`, [vote.id]);
        await invalidateScoreEvent(c, vote.author_id, "vote_received", vote.suggestion_id);
        return { voted: false };
      }

      // Chưa thương → chọn câu dẫn đầu KHÔNG PHẢI của mình (đông phiếu nhất, cũ trước)
      const top = await c.query(
        `SELECT s.id, s.author_id,
           (SELECT count(*)::int FROM votes v WHERE v.suggestion_id = s.id AND v.is_valid) AS votes
         FROM suggestions s
         WHERE s.issue_id = $1 AND s.status IN ('approved','selected','produced','installed')
           AND s.author_id <> $2
         ORDER BY votes DESC, s.created_at ASC
         LIMIT 1 FOR UPDATE OF s`,
        [id, user.id]
      );
      const sugg = top.rows[0];
      if (!sugg) {
        const any = await c.query(
          `SELECT 1 FROM suggestions s WHERE s.issue_id = $1
             AND s.status IN ('approved','selected','produced','installed') LIMIT 1`,
          [id]
        );
        throw new Error(any.rowCount ? "SELF_VOTE" : "NO_SUGGESTION");
      }

      await c.query(
        `INSERT INTO votes (suggestion_id, user_id, is_valid) VALUES ($1,$2,$3)`,
        [sugg.id, user.id, !user.is_shadow_banned]
      );
      if (!user.is_shadow_banned) {
        await recordScoreEvent(c, sugg.author_id, "vote_received", sugg.id);
      }
      return { voted: true };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NO_SUGGESTION") return jsonError(404, "Góc này chưa có câu nhắc — bạn mở hàng nhé!");
    if (msg === "SELF_VOTE") return jsonError(409, "Câu của mình thì để cả xóm thương nhé 💛");
    throw e;
  }
}
