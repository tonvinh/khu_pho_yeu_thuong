// Gửi câu nhắc (Bước 2) → submitted, chờ admin duyệt 4N thủ công (Q2).
// Client chỉ giới hạn 120 ký tự — không có chấm 4N tự động.
import { NextRequest, NextResponse } from "next/server";
import { one, q } from "@/lib/db";
import { jsonError, requireUserWrite } from "@/lib/api";
import { encryptPhone } from "@/lib/crypto";
import { maskPhone } from "@/lib/phone";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUserWrite(req);
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;

  const body = await req.json().catch(() => null);
  if (!body) return jsonError(400, "Dữ liệu không hợp lệ");
  const content = String(body.content || "").trim();
  if (!content) return jsonError(400, "Bạn chưa viết câu nhắc");
  if (content.length > 120) return jsonError(400, "Câu nhắc tối đa 120 ký tự (tiêu chí Nhỏ)");

  const issue = await one<{ id: string; status: string }>(
    `SELECT id, status FROM issues WHERE id = $1 AND status IN ('waiting','voting')`,
    [id]
  );
  if (!issue) return jsonError(404, "Vấn đề này chưa mở nhận câu nhắc");

  const created = await one<{ id: string }>(
    `INSERT INTO suggestions (issue_id, author_id, content) VALUES ($1,$2,$3) RETURNING id`,
    [id, auth.user.id, content]
  );

  // Lead tầng 1 (02 §7.1): CHỈ khi tick opt-in — SĐT lấy từ định danh phiên, KHÔNG hỏi lại.
  // SĐT mã hoá nằm ở bản ghi session (server-side); không tick → không lưu gì cho liên hệ.
  if (body.lead_opt_in === true) {
    const sess = await one<{ phone_encrypted: Buffer | null }>(
      `SELECT phone_encrypted FROM sessions WHERE id = $1`,
      [auth.user.session_id]
    );
    if (sess?.phone_encrypted) {
      const { decryptPhone } = await import("@/lib/crypto");
      const normalized = decryptPhone(sess.phone_encrypted);
      await q(
        `INSERT INTO leads (name, phone_encrypted, phone_masked, phone_hash, source, opted_in, user_id)
         VALUES ($1,$2,$3,$4,'soft_drawer', true, $5)`,
        [auth.user.display_name, encryptPhone(normalized), maskPhone(normalized),
         auth.user.phone_hash, auth.user.id]
      );
      await q(
        `UPDATE users SET phone_encrypted = $2, phone_purpose = array_append(
           array_remove(phone_purpose, 'lead'), 'lead')
         WHERE id = $1`,
        [auth.user.id, encryptPhone(normalized)]
      );
    }
  }

  return NextResponse.json({ ok: true, suggestion: created }, { status: 201 });
}
