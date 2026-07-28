// Chặn UI /admin khi chưa có cookie phiên admin (UX). Bảo mật thật nằm ở
// từng API admin (kiểm tra session DB + CSRF) — middleware chỉ là lớp ngoài.
import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    if (!req.cookies.get("kp_admin_session")?.value) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
