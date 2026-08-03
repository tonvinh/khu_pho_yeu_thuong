// Vòng đời câu nhắc (04 §3, §4): approve (checklist 4N đủ 4 ô) / reject / select /
// produced / installed (side-effects: issue signed, +30đ, notification in-web).
// update (3/8): admin sửa MỌI nội dung từ bảng quản lý — câu, chủ đề, khu phố, vị trí,
// tên người đăng, trạng thái (đi đúng vòng đời, duyệt vẫn phải đủ 4N).
import { NextRequest, NextResponse } from "next/server";
import { tx } from "@/lib/db";
import type { PoolClient } from "pg";
import { jsonError, requireAdmin } from "@/lib/api";
import { recordScoreEvent, applyInstalledSideEffects } from "@/lib/score-service";
import { passes4N, type Review4N } from "@/lib/scoring";
import { CATEGORY_CODES, type CategoryCode } from "@/lib/taxonomy";

const TRANSITIONS: Record<string, string[]> = {
  approve: ["submitted"],
  reject: ["submitted", "approved"],
  select: ["approved"],
  produced: ["selected"],
  installed: ["produced"],
};

// Trạng thái đích hợp lệ khi đổi qua action "update" (drawer Sửa):
// đi tới theo vòng đời + khôi phục câu bị từ chối về hàng chờ.
const STATUS_FLOW: Record<string, string[]> = {
  submitted: ["approved", "rejected"],
  approved: ["selected", "rejected"],
  selected: ["produced"],
  produced: ["installed"],
  installed: [],
  rejected: ["submitted"],
};

interface SuggRow { id: string; status: string; author_id: string; issue_id: string; content: string }

async function applyApprove(c: PoolClient, s: SuggRow, review: Review4N | undefined) {
  // Q2: duyệt hiển thị CHỈ khi admin tick đủ 4 ô Nhắc·Nhở·Nhỏ·Nhẹ
  if (!passes4N(review)) throw new Error("NEED_4N");
  await c.query(
    `UPDATE suggestions SET status='approved', review_4n=$2, approved_at=now() WHERE id=$1`,
    [s.id, JSON.stringify(review)]
  );
  await recordScoreEvent(c, s.author_id, "suggestion_approved", s.id);
  // Issue waiting → voting khi có câu đầu tiên được duyệt (03 §3)
  await c.query(`UPDATE issues SET status='voting' WHERE id=$1 AND status='waiting'`, [s.issue_id]);
  // Báo tin duyệt in-web cho tác giả (dieuchinh.1.8 #15)
  await c.query(
    `INSERT INTO notifications (user_id, type, ref_id, payload)
     VALUES ($1, 'suggestion_approved', $2, $3)`,
    [s.author_id, s.id, JSON.stringify({ content: s.content })]
  );
}

async function applyReject(c: PoolClient, s: SuggRow, note: string) {
  await c.query(
    `UPDATE suggestions SET status='rejected', review_note=$2 WHERE id=$1`,
    [s.id, note.slice(0, 500) || null]
  );
  await c.query(
    `INSERT INTO notifications (user_id, type, ref_id, payload)
     VALUES ($1, 'suggestion_rejected', $2, $3)`,
    [s.author_id, s.id, JSON.stringify({ content: s.content })]
  );
}

async function applyInstalled(c: PoolClient, s: SuggRow, installedDate: unknown) {
  await c.query(
    `UPDATE suggestions SET status='installed', installed_at=now(),
       installed_date=COALESCE($2::date, CURRENT_DATE)
     WHERE id=$1`,
    [s.id, installedDate || null]
  );
  await applyInstalledSideEffects(c, s.id);
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const action = body?.action as string;
  if (action !== "update" && !(action in TRANSITIONS)) {
    return jsonError(400, "Hành động không hợp lệ");
  }

  try {
    await tx(async (c) => {
      const r = await c.query(
        `SELECT s.id, s.status, s.author_id, s.issue_id, s.content FROM suggestions s
         WHERE s.id = $1 FOR UPDATE`,
        [id]
      );
      const s = r.rows[0] as SuggRow | undefined;
      if (!s) throw new Error("NOT_FOUND");
      if (action !== "update" && !TRANSITIONS[action].includes(s.status)) throw new Error("BAD_STATE");

      switch (action) {
        case "update": {
          // ----- Nội dung: sửa được ở mọi trạng thái -----
          if (body?.content !== undefined) {
            const content = String(body.content).trim();
            if (!content) throw new Error("EMPTY_CONTENT");
            if (content.length > 120) throw new Error("TOO_LONG");
            await c.query(`UPDATE suggestions SET content=$2 WHERE id=$1`, [id, content]);
            s.content = content; // notification (nếu đổi trạng thái cùng lượt) dùng câu mới
          }
          if (body?.category !== undefined) {
            if (!CATEGORY_CODES.includes(body.category as CategoryCode)) throw new Error("BAD_CATEGORY");
            await c.query(`UPDATE suggestions SET category=$2 WHERE id=$1`, [id, body.category]);
          }
          if (body?.neighborhood_id !== undefined) {
            const nbId = String(body.neighborhood_id);
            if (!/^[0-9a-f-]{36}$/i.test(nbId)) throw new Error("NB_NOT_FOUND");
            const nb = await c.query(`SELECT id FROM neighborhoods WHERE id=$1`, [nbId]);
            if (!nb.rows[0]) throw new Error("NB_NOT_FOUND");
            await c.query(`UPDATE suggestions SET neighborhood_id=$2 WHERE id=$1`, [id, nbId]);
          }
          if (body?.location_text !== undefined) {
            const loc = String(body.location_text).trim().slice(0, 300);
            if (!loc) throw new Error("EMPTY_LOCATION");
            // Vị trí nằm ở issue (điểm treo biển) — đổi ở đây áp dụng cho cả điểm đó
            await c.query(`UPDATE issues SET location_text=$2 WHERE id=$1`, [s.issue_id, loc]);
          }
          if (body?.author_name !== undefined) {
            const name = String(body.author_name).trim().slice(0, 120);
            if (!name) throw new Error("EMPTY_AUTHOR");
            // display_name là thuộc tính user — đổi tên áp dụng mọi nơi hiển thị
            await c.query(`UPDATE users SET display_name=$2 WHERE id=$1`, [s.author_id, name]);
          }

          // ----- Trạng thái: đi đúng vòng đời, side-effects như action tương ứng -----
          const target = body?.status as string | undefined;
          if (target && target !== s.status) {
            if (!(STATUS_FLOW[s.status] || []).includes(target)) throw new Error("BAD_TRANSITION");
            if (target === "approved") {
              await applyApprove(c, s, body?.review_4n as Review4N | undefined);
            } else if (target === "rejected") {
              await applyReject(c, s, String(body?.note || ""));
            } else if (target === "selected") {
              // Admin đổi trực tiếp từ drawer — chọn có chủ đích, lý do tuỳ chọn
              await c.query(
                `UPDATE suggestions SET status='selected', select_note=$2 WHERE id=$1`,
                [id, String(body?.note || "").trim() || null]
              );
            } else if (target === "produced") {
              await c.query(`UPDATE suggestions SET status='produced' WHERE id=$1`, [id]);
            } else if (target === "installed") {
              await applyInstalled(c, s, body?.installed_date);
            } else if (target === "submitted") {
              // Khôi phục câu bị từ chối về hàng chờ duyệt
              await c.query(
                `UPDATE suggestions SET status='submitted', review_note=NULL WHERE id=$1`,
                [id]
              );
            }
          }
          break;
        }
        case "approve":
          await applyApprove(c, s, body?.review_4n as Review4N | undefined);
          break;
        case "reject":
          await applyReject(c, s, String(body?.note || ""));
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
        case "installed":
          await applyInstalled(c, s, body?.installed_date);
          break;
      }
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NOT_FOUND") return jsonError(404, "Không tìm thấy câu nhắc");
    if (msg === "BAD_STATE") return jsonError(409, "Trạng thái hiện tại không cho phép hành động này");
    if (msg === "BAD_TRANSITION")
      return jsonError(409, "Không thể chuyển sang trạng thái này — phải đi theo vòng đời của biển");
    if (msg === "EMPTY_CONTENT") return jsonError(400, "Nội dung câu không được để trống");
    if (msg === "TOO_LONG") return jsonError(400, "Câu nhắc tối đa 120 ký tự (tiêu chí Nhỏ)");
    if (msg === "BAD_CATEGORY") return jsonError(400, "Chủ đề không hợp lệ");
    if (msg === "NB_NOT_FOUND") return jsonError(400, "Khu phố không tồn tại");
    if (msg === "EMPTY_LOCATION") return jsonError(400, "Vị trí không được để trống");
    if (msg === "EMPTY_AUTHOR") return jsonError(400, "Tên người đăng không được để trống");
    if (msg === "NEED_4N") return jsonError(400, "Cần tick đủ 4 ô Nhắc · Nhở · Nhỏ · Nhẹ mới duyệt được");
    if (msg === "NEED_SELECT_NOTE")
      return jsonError(400, "Chọn câu không cao phiếu nhất — cần nhập lý do");
    throw e;
  }
  return NextResponse.json({ ok: true });
}
