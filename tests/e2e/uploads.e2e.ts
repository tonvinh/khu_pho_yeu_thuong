// E2E ảnh upload (17/9): admin upload → ảnh phục vụ qua /api/img → thay ảnh thì
// URL cũ 404 (file cũ bị xoá khỏi UPLOAD_DIR) → xoá slot/chứng nhận thì URL 404.
// Chỉ đụng SLOT ẢNH TRỐNG và khu CHƯA có ảnh chứng nhận, dọn lại ở cuối — chạy trên
// server có dữ liệu thật cũng không mất ảnh nào.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import sharp from "sharp";
import { adminClient, BASE_URL, Client, serverUp } from "./client";

const up = await serverUp();
const d = describe.skipIf(!up);
if (!up) console.warn(`⚠️  Bỏ qua E2E: không thấy server ở ${BASE_URL}`);

type Nb = {
  id: string; slug: string; visible: boolean; deleted_at: string | null;
  certificate_photo_url: string | null; photos: { position: number; url: string }[];
};

/** URL ảnh trả về đã kèm basePath ⇒ ghép với ORIGIN, không ghép với BASE_URL */
const img = (url: string) => fetch(new URL(BASE_URL).origin + url);

async function png(color: string): Promise<File> {
  const buf = await sharp({ create: { width: 800, height: 500, channels: 3, background: color } })
    .png().toBuffer();
  return new File([new Uint8Array(buf)], `${color.slice(1)}.png`, { type: "image/png" });
}

async function upload(admin: Client, path: string, file: File, position?: number) {
  const form = new FormData();
  form.append("file", file);
  if (position) form.append("position", String(position));
  return admin.sendForm<{ url?: string; error?: string }>(path, form);
}

d("Ảnh upload lưu filesystem — phục vụ qua /api/img", () => {
  let admin: Client | null = null;
  let nbs: Nb[] = [];
  const cleanups: (() => Promise<unknown>)[] = [];

  beforeAll(async () => {
    admin = await adminClient();
    if (admin) nbs = (await admin.getJson<{ neighborhoods: Nb[] }>("/api/admin/neighborhoods")).body.neighborhoods;
  });
  afterAll(async () => {
    for (const fn of cleanups.reverse()) await fn().catch(() => {});
  });

  it("đăng nhập admin được", () => {
    expect(admin, "admin@fpt.com / mật khẩu trong QC §Môi trường").not.toBeNull();
  });

  it("ảnh khu phố: upload → 200 image/webp → thay ảnh thì URL cũ 404 → xoá slot thì 404", async () => {
    const nb = nbs.find((n) => !n.deleted_at && n.visible && n.photos.length < 4);
    expect(nb, "cần một khu phố đang hiển thị còn slot ảnh trống").toBeTruthy();
    const used = new Set(nb!.photos.map((p) => p.position));
    const position = [4, 3, 2, 1].find((p) => !used.has(p))!;
    const path = `/api/admin/neighborhoods/${nb!.id}/photos`;
    cleanups.push(() => admin!.sendJson("DELETE", `${path}?position=${position}`));

    const first = await upload(admin!, path, await png("#d33333"), position);
    expect(first.status).toBe(201);
    const res1 = await img(first.body.url!);
    expect(res1.status).toBe(200);
    expect(res1.headers.get("content-type")).toBe("image/webp");
    const meta = await sharp(Buffer.from(await res1.arrayBuffer())).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(["webp", 1280, 720]);

    // Popup/trang share khu phố đọc cùng loader — ảnh mới phải có mặt
    const pub = await new Client().getJson(`/api/v1/neighborhoods/${nb!.slug}`);
    expect(pub.status).toBe(200);
    expect(JSON.stringify(pub.body)).toContain(first.body.url);

    const second = await upload(admin!, path, await png("#3333d3"), position);
    expect(second.status).toBe(201);
    expect(second.body.url).not.toBe(first.body.url);
    expect((await img(second.body.url!)).status).toBe(200);
    expect((await img(first.body.url!)).status).toBe(404);

    const del = await admin!.sendJson("DELETE", `${path}?position=${position}`);
    expect(del.status).toBe(200);
    expect((await img(second.body.url!)).status).toBe(404);
  });

  it("ảnh chứng nhận: upload → 200 → thay thì URL cũ 404 → xoá thì 404", async () => {
    const nb = nbs.find((n) => !n.deleted_at && !n.certificate_photo_url);
    expect(nb, "cần một khu phố chưa có ảnh chứng nhận").toBeTruthy();
    const path = `/api/admin/neighborhoods/${nb!.id}/certificate`;
    cleanups.push(() => admin!.sendJson("DELETE", path));

    const first = await upload(admin!, path, await png("#33a333"));
    expect(first.status).toBe(201);
    expect((await img(first.body.url!)).status).toBe(200);

    const second = await upload(admin!, path, await png("#d3a333"));
    expect(second.status).toBe(201);
    expect((await img(second.body.url!)).status).toBe(200);
    expect((await img(first.body.url!)).status).toBe(404);

    expect((await admin!.sendJson("DELETE", path)).status).toBe(200);
    expect((await img(second.body.url!)).status).toBe(404);
  });

  it("/api/img chặn private/ và traversal (404)", async () => {
    for (const p of [
      "/api/img/private/maps/x/original.webp",
      "/api/img/public/..%2Fprivate%2Fmaps%2Fx%2Foriginal.webp",
      "/api/img/public/%2E%2E/private/maps/x/original.webp",
      "/api/img/public/khong-ton-tai.webp",
    ]) {
      const res = await new Client().fetch(p);
      expect(res.status, p).toBe(404);
    }
  });
});
