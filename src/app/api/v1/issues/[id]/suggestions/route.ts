// Gửi câu nhắc (Bước 2) → submitted, chờ admin duyệt 4N thủ công (Q2).
// Client chỉ giới hạn 120 ký tự — không có chấm 4N tự động.
import { NextRequest, NextResponse } from "next/server";
import { one, q } from "@/lib/db";
import { jsonError, requireUserWrite } from "@/lib/api";
import { encryptPhone, phoneHash } from "@/lib/crypto";
import { maskPhone, normalizePhone, looksFake } from "@/lib/phone";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUserWrite(req);
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;

  const body = await req.json().catch(() => null);
  if (!body) return jsonError(400, "Dữ liệu không hợp lệ");
  const content = String(body.content || "").trim();
  if (!content) return jsonError(400, "Bạn chưa viết câu nhắc");
  if (content.length > 120) return jsonError(400, "Câu nhắc tối đa 120 ký tự (tiêu chí Nhỏ)");

  // 18/8: form viết câu có thêm ô SĐT (email review) — chỉ dùng khi tick nhận ưu đãi.
  // Validate TRƯỚC khi ghi câu nhắc để không tạo bản ghi rồi mới báo lỗi số.
  const optIn = body.lead_opt_in === true;
  const rawPhone = String(body.phone || "").trim();
  let typedPhone: string | null = null;
  if (optIn && rawPhone) {
    typedPhone = normalizePhone(rawPhone);
    if (!typedPhone || looksFake(typedPhone)) {
      return jsonError(400, "Số điện thoại chưa đúng — kiểm tra lại giúp mình nhé");
    }
  }

  const issue = await one<{ id: string; status: string }>(
    `SELECT id, status FROM issues WHERE id = $1 AND status IN ('waiting','voting')`,
    [id]
  );
  if (!issue) return jsonError(404, "Vấn đề này chưa mở nhận câu nhắc");

  const created = await one<{ id: string }>(
    `INSERT INTO suggestions (issue_id, author_id, content) VALUES ($1,$2,$3) RETURNING id`,
    [id, auth.user.id, content]
  );

  // Lead tầng 1 (02 §7.1): CHỈ khi tick opt-in (quy tắc cứng 5).
  // Nguồn SĐT: ô người dùng vừa nhập, không nhập thì lấy SĐT mã hoá gắn ở phiên
  // (server-side, không hỏi lại — ASSUMPTION ở db/migrations/001_init.sql).
  if (optIn) {
    let normalized = typedPhone;
    if (!normalized) {
      const sess = await one<{ phone_encrypted: Buffer | null }>(
        `SELECT phone_encrypted FROM sessions WHERE id = $1`,
        [auth.user.session_id]
      );
      if (sess?.phone_encrypted) {
        const { decryptPhone } = await import("@/lib/crypto");
        normalized = decryptPhone(sess.phone_encrypted);
      }
    }
    if (normalized) {
      const hash = phoneHash(normalized);
      await q(
        `INSERT INTO leads (name, phone_encrypted, phone_masked, phone_hash, source, opted_in, user_id)
         VALUES ($1,$2,$3,$4,'soft_drawer', true, $5)`,
        [auth.user.display_name, encryptPhone(normalized), maskPhone(normalized),
         hash, auth.user.id]
      );
      // Chỉ gắn SĐT vào hồ sơ khi ĐÚNG số của tài khoản đang đăng nhập — nhập số khác
      // thì lead vẫn ghi nhận nhưng KHÔNG ghi chéo sang tài khoản nào (quy tắc 3b).
      if (hash === auth.user.phone_hash) {
        await q(
          `UPDATE users SET phone_encrypted = $2, phone_purpose = array_append(
             array_remove(phone_purpose, 'lead'), 'lead')
           WHERE id = $1`,
          [auth.user.id, encryptPhone(normalized)]
        );
      }
    }
  }

  return NextResponse.json({ ok: true, suggestion: created }, { status: 201 });
}
