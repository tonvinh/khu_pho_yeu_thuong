// Route /api/img/<key> đọc thẳng từ UPLOAD_DIR: chỉ phục vụ public/, mọi lỗi đều 404.
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/img/[...key]/route";

let dir: string;
const prevEnv = process.env.UPLOAD_DIR;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "kp-img-"));
  process.env.UPLOAD_DIR = dir;
});
afterEach(async () => {
  vi.restoreAllMocks();
  if (prevEnv === undefined) delete process.env.UPLOAD_DIR;
  else process.env.UPLOAD_DIR = prevEnv;
  await rm(dir, { recursive: true, force: true });
});

async function put(key: string, body: string | Buffer) {
  const file = path.join(dir, key);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, body);
}

/** Gọi route như Next: params là các đoạn path ĐÃ decode */
function get(segments: string[]) {
  const req = new NextRequest("http://localhost/api/img/" + segments.map(encodeURIComponent).join("/"));
  return GET(req, { params: Promise.resolve({ key: segments }) });
}

describe("GET /api/img/[...key]", () => {
  test.each([
    ["public/neighborhoods/1/photo-1-1.webp", "image/webp"],
    ["public/x/a.png", "image/png"],
    ["public/x/a.jpg", "image/jpeg"],
  ])("%s có file → 200, Content-Type %s, header cache giữ nguyên", async (key, type) => {
    const body = Buffer.from([1, 2, 3, 4, 255]);
    await put(key, body);
    const res = await get(key.split("/"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe(type);
    expect(res.headers.get("cache-control")).toBe("public, max-age=86400, immutable");
    expect(Buffer.compare(Buffer.from(await res.arrayBuffer()), body)).toBe(0);
  });

  test("private/ → 404 dù file có thật", async () => {
    await put("private/maps/1/original.webp", "bi-mat");
    const res = await get(["private", "maps", "1", "original.webp"]);
    expect(res.status).toBe(404);
    expect(await res.text()).not.toContain("bi-mat");
  });

  test("key public/ nhưng thiếu file → 404, không log", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await get(["public", "khong", "co.webp"]);
    expect(res.status).toBe(404);
    expect(log).not.toHaveBeenCalled();
  });

  test.each([
    [["public", "..", "private", "maps", "1", "original.webp"]],
    [["public", "..%2F..%2Fprivate", "x.webp"]],
    [["public", "../private/maps/1/original.webp"]],
    [["public", "..\\private\\maps\\1\\original.webp"]],
    [["public", "x.webp\0"]],
    [["public", ".hidden.webp.abc.tmp"]],
  ])("traversal / key lạ %j → 404", async (segments) => {
    await put("private/maps/1/original.webp", "bi-mat");
    await put("public/.hidden.webp.abc.tmp", "dang-ghi-do");
    const res = await get(segments);
    expect(res.status).toBe(404);
  });
});
