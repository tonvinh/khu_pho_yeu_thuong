// E2E cho các lỗi trong docs/QC-02-09-2026.md — chạy trên SERVER THẬT (dev hoặc build).
//   pnpm test:e2e            (mặc định http://localhost:3001)
//   E2E_BASE_URL=... pnpm test:e2e
// Không có server thì cả bộ tự SKIP để `pnpm test` trên máy khác không đỏ oan.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { adminClient, BASE_URL, Client, serverUp } from "./client";
import { cleanupE2EUser, E2E_USER_NAME, sql } from "./db";

const up = await serverUp();
const d = describe.skipIf(!up);
if (!up) console.warn(`⚠️  Bỏ qua E2E: không thấy server ở ${BASE_URL}`);

// ===================================================================
// A2 · Tab "Cây bút của khu phố" phải là NGƯỜI (quyết định F3)
// ===================================================================
d("A2 · bảng cây bút", () => {
  it("GET /api/v1/leaderboard trả danh sách người, xếp theo điểm giảm dần", async () => {
    const c = new Client();
    const { status, body } = await c.getJson<{ ambassadors: any[] }>("/api/v1/leaderboard");
    expect(status).toBe(200);
    expect(Array.isArray(body.ambassadors)).toBe(true);

    for (const a of body.ambassadors) {
      // đúng bộ trường F3 cần: tên · khu phố · câu · điểm · slug chia sẻ
      expect(typeof a.display_name).toBe("string");
      expect(typeof a.share_slug).toBe("string");
      expect(typeof a.score).toBe("number");
      expect(a).toHaveProperty("neighborhood_name");
      expect(a).toHaveProperty("top_quote");
      // KHÔNG được lộ SĐT (quy tắc cứng 3b)
      expect(Object.keys(a).join()).not.toMatch(/phone/i);
    }
    const scores = body.ambassadors.map((a) => a.score);
    expect([...scores].sort((x, y) => y - x)).toEqual(scores);
  });

  it("trang chủ SSR sẵn tên cây bút — tab thứ 3 không cần đợi fetch", async () => {
    const c = new Client();
    const { body } = await c.getJson<{ ambassadors: any[] }>("/api/v1/leaderboard");
    if (body.ambassadors.length === 0) return; // DB trống thì không có gì để đối chiếu

    const html = await c.html("/");
    const top = body.ambassadors[0];
    // Dòng cây bút chỉ vẽ khi người dùng bấm sang tab thứ 3, nhưng DỮ LIỆU phải nằm
    // sẵn trong payload SSR — không có thì tab bấm vào sẽ trống cho tới nhịp polling.
    expect(html).toContain(top.display_name);
    expect(html).toContain(top.share_slug);
  });

  it("trang /dai-su/{slug} của cây bút TOP 1 mở được", async () => {
    const c = new Client();
    const { body } = await c.getJson<{ ambassadors: any[] }>("/api/v1/leaderboard");
    if (body.ambassadors.length === 0) return;
    const res = await c.fetch(`/dai-su/${body.ambassadors[0].share_slug}`);
    expect(res.status).toBe(200);
  });

  it("trang chủ KHÔNG còn dùng câu rỗng cũ nói về góc phố ở tab cây bút", async () => {
    const html = await new Client().html("/");
    expect(html).not.toContain("Chưa có góc phố nào được thương");
  });
});

// ===================================================================
// A1 · Banner báo tin phải nằm trên nền hero  ·  A3 · nav không chồng chữ
// ===================================================================
d("A1 + A3 · markup top bar và banner", () => {
  let html = "";
  beforeAll(async () => { html = await new Client().html("/"); });

  it("A3 · cụm hai link nav bật từ xl, không phải sm", () => {
    const nav = html.match(/class="[^"]*hidden min-w-0 items-center gap-14[^"]*"/)?.[0] ?? "";
    expect(nav).toContain("xl:flex");
    expect(nav).not.toContain("sm:flex");
  });

  it("A3 · nhãn CTA đầy đủ bật từ lg, nhãn rút gọn ẩn từ lg", () => {
    expect(html).toMatch(/class="lg:hidden">\+ Đề xuất</);
    expect(html).toMatch(/class="hidden lg:inline">\+ Đề xuất góc phố mới</);
  });
});

// ===================================================================
// A1 · Banner báo tin in-web phải nằm TRÊN nền hero (không bị phủ)
// Banner chỉ hiện khi tác giả có thông báo chưa đọc → dựng một thông báo thật trong DB
// rồi xem trang chủ bằng đúng phiên của người đó, xong dọn sạch.
// ===================================================================
d("A1 · banner báo tin in-web", () => {
  let c: Client;
  let notifId: string | null = null;
  let hasDb = true;

  beforeAll(async () => {
    c = new Client();
    const res = await c.sendJson("POST", "/api/v1/auth/identify", {
      phone: process.env.E2E_PHONE || "0987650001",
      display_name: E2E_USER_NAME,
    });
    expect(res.status, JSON.stringify(res.body)).toBe(200);

    const rows = await sql<{ id: string }>(
      `INSERT INTO notifications (user_id, type, payload)
       SELECT id, 'sign_installed', '{"location_text":"Hẻm E2E 1"}'::jsonb
       FROM users WHERE display_name = $1 LIMIT 1
       RETURNING id`,
      [E2E_USER_NAME]
    );
    if (!rows) { hasDb = false; return; }
    notifId = rows[0]?.id ?? null;
  });

  afterAll(async () => {
    if (notifId) await sql(`DELETE FROM notifications WHERE id = $1`, [notifId]);
  });

  it("API trả đúng thông báo cho tác giả", async () => {
    if (!hasDb) return;
    const { status, body } = await c.getJson<{ notifications: any[] }>("/api/v1/me/notifications");
    expect(status).toBe(200);
    expect(body.notifications.some((n) => n.payload?.location_text === "Hẻm E2E 1")).toBe(true);
  });

  it("trang chủ mở được bằng phiên của tác giả (banner do client island vẽ)", async () => {
    if (!hasDb) return;
    // Markup banner KHÔNG nằm trong HTML gốc: nó chỉ vẽ sau khi client gọi
    // /api/v1/me/notifications. Việc `relative` có mặt hay không kiểm ở tầng DOM —
    // xem tests/ui/home-shell.test.tsx (A1) và bước soi bằng trình duyệt trong QC.
    const res = await c.fetch("/");
    expect(res.status).toBe(200);
    const home = await res.text();
    // nền hero vẫn là lớp absolute như thiết kế (không "sửa" A1 bằng cách bỏ absolute)
    expect(home).toMatch(/absolute inset-x-0 top-0 h-\[620px\]/);
  });

  it("đánh dấu đã đọc → thông báo biến mất (nút 'Đóng' của banner)", async () => {
    if (!hasDb || !notifId) return;
    const res = await c.sendJson("PATCH", `/api/v1/me/notifications/${notifId}`);
    expect(res.status).toBe(200);
    const { body } = await c.getJson<{ notifications: any[] }>("/api/v1/me/notifications");
    expect(body.notifications.some((n) => n.id === notifId)).toBe(false);
  });
});

// ===================================================================
// B1 · Import CSV UTF-8 KHÔNG BOM
// ===================================================================
d("B1 · import CSV không BOM", () => {
  let admin: Client | null = null;
  beforeAll(async () => { admin = await adminClient(); });

  const CSV_HEAD = "Tên khu phố,Tỉnh/Thành phố,Phường/Xã\n";
  const ROW = "Xom E2E Khong BOM,Thành phố Hồ Chí Minh,Phường Bàn Cờ\n";

  /** Chỉ VALIDATE (mode mặc định) — không ghi gì vào DB */
  async function validate(content: string, name = "khu-pho.csv", type = "text/csv") {
    const form = new FormData();
    form.append("file", new Blob([content], { type }), name);
    form.append("mode", "validate");
    return admin!.sendForm<{ rows: any[]; ok_count?: number }>(
      "/api/admin/neighborhoods/import", form
    );
  }

  it("đăng nhập admin được (điều kiện của mấy ca dưới)", () => {
    expect(admin, "admin@fpt.com / mật khẩu trong QC §Môi trường").not.toBeNull();
  });

  it("CSV KHÔNG BOM: giữ đúng dấu tiếng Việt và KHÔNG báo lỗi geo giả", async () => {
    const { status, body } = await validate(CSV_HEAD + ROW);
    expect(status).toBe(200);
    const row = body.rows.find((r: any) => String(r.label).includes("E2E"));
    expect(row, JSON.stringify(body)).toBeTruthy();
    // Nhãn dòng là chỗ QC bắt được lỗi: "ThÃ nh phá»‘ Há»“ ChÃ­ Minh"
    expect(row.label).toContain("Thành phố Hồ Chí Minh");
    expect(row.label).toContain("Phường Bàn Cờ");
    expect(row.label).not.toContain("Ã"); // dấu hiệu latin-1
    expect(row.errors.join(" ")).not.toMatch(/danh mục/);
  });

  it("CSV CÓ BOM vẫn chạy như cũ", async () => {
    const { body } = await validate("﻿" + CSV_HEAD + ROW);
    const row = body.rows.find((r: any) => String(r.label).includes("E2E"));
    expect(row.label).toContain("Thành phố Hồ Chí Minh");
    expect(row.errors.join(" ")).not.toMatch(/danh mục/);
  });

  it("tỉnh sai vẫn phải báo lỗi (không nới lỏng validate khi sửa B1)", async () => {
    const { body } = await validate(CSV_HEAD + "Xom E2E Sai,Tỉnh Không Có Thật,Phường Bàn Cờ\n");
    const row = body.rows.find((r: any) => String(r.label).includes("E2E Sai"));
    expect(row.errors.join(" ")).toMatch(/danh mục/);
  });

  it("import câu nhắc cũng đọc CSV không BOM đúng dấu", async () => {
    const form = new FormData();
    const csv =
      "Câu,Tên khu phố,Vị trí treo biển,Chủ đề,Người đăng\n" +
      "Đi chậm chút nha bà con ơi,Khu phố không tồn tại E2E,Hẻm E2E,Khoẻ mỗi ngày,Cô Bảy\n";
    form.append("file", new Blob([csv], { type: "text/csv" }), "cau.csv");
    form.append("mode", "validate");
    const { status, body } = await admin!.sendForm<{ rows: any[] }>(
      "/api/admin/suggestions/import", form
    );
    expect(status).toBe(200);
    const row = body.rows[0];
    // Nội dung tiếng Việt đọc đúng dấu…
    expect(JSON.stringify(row)).toContain("Đi chậm chút nha");
    expect(JSON.stringify(row)).not.toContain("Ã");
    // …và vẫn bắt đúng lỗi "khu phố chưa có"
    expect(row.errors.join(" ")).toMatch(/[Kk]hu phố/);
  });
});

// ===================================================================
// B4 · Cư dân đăng xuất được
// ===================================================================
d("B4 · đăng xuất cư dân", () => {
  const PHONE = process.env.E2E_PHONE || "0987650001";

  it("định danh → /api/v1/me có dữ liệu → logout → phiên bị thu hồi", async () => {
    const c = new Client();
    const idRes = await c.sendJson<{ ok: boolean; me: any }>("POST", "/api/v1/auth/identify", {
      phone: PHONE,
      display_name: E2E_USER_NAME,
    });
    expect(idRes.status, JSON.stringify(idRes.body)).toBe(200);
    expect(c.cookie("kp_session")).toBeTruthy();

    const me = await c.getJson<{ me: any }>("/api/v1/me");
    expect(me.status).toBe(200);
    expect(me.body.me.display_name).toBe(E2E_USER_NAME);
    expect(typeof me.body.me.score).toBe("number"); // menu avatar hiện điểm này
    expect(JSON.stringify(me.body)).not.toMatch(/phone/i);

    const out = await c.sendJson("POST", "/api/v1/auth/logout");
    expect(out.status).toBe(200);

    // Cookie đã xoá VÀ phiên đã bị thu hồi phía server
    expect(c.cookie("kp_session")).toBeFalsy();
    const after = await c.getJson("/api/v1/me");
    expect(after.status).toBe(401);
  });

  it("token phiên cũ dùng lại cũng bị từ chối (thu hồi thật, không chỉ xoá cookie)", async () => {
    const c = new Client();
    await c.sendJson("POST", "/api/v1/auth/identify", { phone: PHONE, display_name: E2E_USER_NAME });
    const token = c.cookie("kp_session")!;
    const csrf = c.cookie("kp_csrf")!;
    await c.sendJson("POST", "/api/v1/auth/logout");

    const res = await fetch(`${BASE_URL}/api/v1/me`, {
      headers: { cookie: `kp_session=${token}; kp_csrf=${csrf}` },
    });
    expect(res.status).toBe(401);
  });

  it("logout thiếu CSRF → 403 (không nới lỏng bảo mật)", async () => {
    const c = new Client();
    await c.sendJson("POST", "/api/v1/auth/identify", { phone: PHONE, display_name: E2E_USER_NAME });
    // Gọi thẳng fetch gốc: Client tự gắn header CSRF nên phải đi vòng qua nó
    const res = await fetch(`${BASE_URL}/api/v1/auth/logout`, {
      method: "POST",
      headers: { cookie: `kp_session=${c.cookie("kp_session")}; kp_csrf=${c.cookie("kp_csrf")}` },
    });
    expect(res.status).toBe(403);
    // phiên vẫn còn nguyên
    expect((await c.getJson("/api/v1/me")).status).toBe(200);
  });
});

// ===================================================================
// C1 + C2 · CSS thật SERVER GỬI RA (không phải file nguồn): Tailwind biên dịch xong
// vẫn phải giữ đúng số của .fig, và .kp-hero-title/.kp-sec-title phải đứng SAU .kp-h2
// mới thắng được letter-spacing -0.01em.
// ===================================================================
d("C1 + C2 · stylesheet server gửi ra", () => {
  let css = "";
  beforeAll(async () => {
    const c = new Client();
    const html = await c.html("/");
    const hrefs = [...html.matchAll(/href="(\/_next\/static\/css\/[^"]+)"/g)].map((m) => m[1]);
    const parts = await Promise.all(
      hrefs.map(async (h) => (await c.fetch(h.replace(/&amp;/g, "&"))).text())
    );
    css = parts.join("\n");
  });

  it("trang chủ có nạp stylesheet", () => {
    expect(css.length).toBeGreaterThan(1000);
  });

  it("C1 · letter-spacing hero -3% / section -2% có mặt và đứng sau .kp-h2", () => {
    expect(css).toMatch(/\.kp-hero-title\s*\{[^}]*letter-spacing:\s*-\.?0?3em|\.kp-hero-title\s*\{[^}]*letter-spacing:\s*-0?\.03em/);
    expect(css).toMatch(/\.kp-sec-title\s*\{[^}]*letter-spacing:\s*-0?\.02em|\.kp-sec-title\s*\{[^}]*letter-spacing:\s*-\.02em/);
    const h2 = css.indexOf(".kp-h2");
    expect(h2).toBeGreaterThan(-1);
    expect(css.indexOf(".kp-hero-title")).toBeGreaterThan(h2);
    expect(css.indexOf(".kp-sec-title")).toBeGreaterThan(h2);
  });

  it("C2 · .kp-input chốt chiều cao (44 mobile → 40 từ sm), không còn padding 9px", () => {
    const rule = css.match(/\.kp-input\s*\{[^}]*\}/)?.[0] ?? "";
    expect(rule).toMatch(/height:\s*44px/);
    expect(rule).not.toMatch(/padding:\s*9px/);
    const smRule = css.slice(css.indexOf("@media (min-width: 640px)", css.indexOf(".kp-input")));
    expect(smRule).toMatch(/\.kp-input\s*\{\s*height:\s*40px/);
    // `.tap` đặt min-height 44 — không nhả ra thì ô vẫn cao 44 ở desktop
    expect(smRule).toMatch(/\.kp-input\s*\{[^}]*min-height:\s*0/);
    // ô trong popup không bị đụng tới
    expect(css).toMatch(/\.kp-input-lg\s*\{[^}]*height:\s*50px/);
  });
});

// Dọn dấu vết E2E một lần ở CUỐI: xoá user giữa chừng sẽ khiến mỗi lần định danh sau đó
// bị tính là "tạo định danh MỚI" và đâm vào trần 3 SĐT mới/thiết bị/giờ.
afterAll(cleanupE2EUser);
