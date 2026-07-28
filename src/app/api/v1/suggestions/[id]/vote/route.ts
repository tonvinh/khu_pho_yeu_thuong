// Toggle "thương" — 1 tài khoản 1 phiếu/câu, cấm tự thương (server-side, quy tắc cứng 3)
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
      const s = await c.query(
        `SELECT s.id, s.author_id, s.status FROM suggestions s
         WHERE s.id = $1 AND s.status IN ('approved','selected','produced','installed')
         FOR UPDATE`,
        [id]
      );
      const sugg = s.rows[0];
      if (!sugg) throw new Error("NOT_FOUND");
      if (sugg.author_id === user.id) throw new Error("SELF_VOTE"); // 409 — không tự thương

      const existing = await c.query(
        `SELECT id, is_valid FROM votes WHERE suggestion_id = $1 AND user_id = $2`,
        [id, user.id]
      );

      if (existing.rowCount && existing.rowCount > 0) {
        // Bỏ thương: xoá phiếu + vô hiệu event điểm tương ứng (05 §5)
        await c.query(`DELETE FROM votes WHERE id = $1`, [existing.rows[0].id]);
        await invalidateScoreEvent(c, sugg.author_id, "vote_received", id);
        return { voted: false };
      }

      // Thương: shadow-ban → phiếu is_valid=false (lọc lặng lẽ, UI người bấm vẫn thấy bình thường)
      await c.query(
        `INSERT INTO votes (suggestion_id, user_id, is_valid) VALUES ($1,$2,$3)`,
        [id, user.id, !user.is_shadow_banned]
      );
      if (!user.is_shadow_banned) {
        await recordScoreEvent(c, sugg.author_id, "vote_received", id);
      }
      return { voted: true };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NOT_FOUND") return jsonError(404, "Không tìm thấy câu nhắc");
    if (msg === "SELF_VOTE") return jsonError(409, "Câu của mình thì để cả xóm thương nhé 💛");
    throw e;
  }
}
