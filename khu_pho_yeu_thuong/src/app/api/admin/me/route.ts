import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-session";
import { jsonError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const admin = await getAdminUser(req);
  if (!admin) return jsonError(401, "Chưa đăng nhập");
  return NextResponse.json({ admin: { email: admin.email } });
}
