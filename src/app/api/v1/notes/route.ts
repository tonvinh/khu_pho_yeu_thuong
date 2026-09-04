// Danh sách lời nhắc đang chờ bình chọn — tab 2 của IssueBoard (Figma bản live 4/9).
// SSR trang chủ dùng CHUNG `getVotingNotes()` nên hai nguồn không lệch nhau sau
// polling 20s (bẫy đã ghi trong CLAUDE.md: sửa route mà quên SSR là dòng nhảy chữ).
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getVotingNotes } from "@/lib/notes";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const viewer = await getSessionUser(req);
  const notes = await getVotingNotes(viewer?.id ?? null);
  return NextResponse.json({ notes });
}
