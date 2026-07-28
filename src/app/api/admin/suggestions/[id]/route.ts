// Vòng đời câu nhắc (04 §3, §4): approve (checklist 4N đủ 4 ô) / reject / select /
// produced / installed (side-effects: issue signed, +30đ, notification in-web).
import { NextRequest, NextResponse } from "next/server";
import { tx } from "@/lib/db";
import { jsonError, requireAdmin } from "@/lib/api";
import { recordScoreEvent, applyInstalledSideEffects } from "@/lib/score-service";
import { passes4N, type Review4N } from "@/lib/scoring";

const TRANSITIONS: Record<string, string[]> = {
  approve: ["submitted"],
  reject: ["submitted", "approved"],
  select: ["approved"],
  produced: ["selected"],
  installed: ["produced"],
};

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const action = body?.action as string;
  if (!(action in TRANSITIONS)) return jsonError(400, "Hành động không hợp lệ");

  try {
    await tx(async (c) => {
      const r = await c.query(
        `SELECT s.id, s.status, s.author_id, s.issue_id FROM suggestions s
         WHERE s.id = $1 FOR UPDATE`,
        [id]
      );
      const s = r.rows[0];
      if (!s) throw new Error("NOT_FOUND");
      if (!TRANSITIONS[action].includes(s.status)) throw new Error("BAD_STATE");

      switch (action) {
        case "approve": {
          // Q2: duyệt hiển thị CHỈ khi admin tick đủ 4 ô Nhắc·Nhở·Nhỏ·Nhẹ
          const review = body?.review_4n as Review4N | undefined;
          if (!passes4N(review)) throw new Error("NEED_4N");
          await c.query(
            `UPDATE suggestions SET status='approved', review_4n=$2, approved_at=now()
             WHERE id=$1`,
            [id, JSON.stringify(review)]
          );
          await recordScoreEvent(c, s.author_id, "suggestion_approved", id);
          // Issue waiting → voting khi có câu đầu tiên được duyệt (03 §3)
          await c.query(
            `UPDATE issues SET status='voting' WHERE id=$1 AND status='waiting'`,
            [s.issue_id]
          );
          break;
        }
        case "reject":
          await c.query(
            `UPDATE suggestions SET status='rejected', review_note=$2 WHERE id=$1`,
            [id, String(body?.note || "").slice(0, 500) || null]
          );
          break;
        case "select": {
          // Nếu chọn câu KHÔNG cao phiếu nhất → bắt buộc nhập lý do (04 §4)
          const top = await c.query(
            `SELECT s2.id FROM suggestions s2
             LEFT JOIN votes v ON v.suggestion_id = s2.id AND v.is_valid
             WHERE s2.issue_id = $1 AND s2.status = 'approved'
             GROUP BY s2.id ORDER BY count(v.id) DESC, s2.created_at ASC LIMIT 1`,
            [s.issue_id]
          );
          const isTop = top.rows[0]?.id === id;
          const note = String(body?.note || "").trim();
          if (!isTop && !note) throw new Error("NEED_SELECT_NOTE");
          await c.query(
            `UPDATE suggestions SET status='selected', select_note=$2 WHERE id=$1`,
            [id, note || null]
          );
          break;
        }
        case "produced":
          await c.query(`UPDATE suggestions SET status='produced' WHERE id=$1`, [id]);
          break;
        case "installed": {
          await c.query(
            `UPDATE suggestions SET status='installed', installed_at=now(),
               installed_date=COALESCE($2::date, CURRENT_DATE)
             WHERE id=$1`,
            [id, body?.installed_date || null]
          );
          await applyInstalledSideEffects(c, id);
          break;
        }
      }
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NOT_FOUND") return jsonError(404, "Không tìm thấy câu nhắc");
    if (msg === "BAD_STATE") return jsonError(409, "Trạng thái hiện tại không cho phép hành động này");
    if (msg === "NEED_4N") return jsonError(400, "Cần tick đủ 4 ô Nhắc · Nhở · Nhỏ · Nhẹ mới duyệt được");
    if (msg === "NEED_SELECT_NOTE")
      return jsonError(400, "Chọn câu không cao phiếu nhất — cần nhập lý do");
    throw e;
  }
  return NextResponse.json({ ok: true });
}
