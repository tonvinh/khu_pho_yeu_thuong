// Lưu ảnh FILESYSTEM (17/9): UPLOAD_DIR trỏ vào thư mục tạm cho từng ca.
// Production nhiều pod cùng mount một NFS ⇒ khoá cả luật "ghi tạm rồi rename, không sót
// file .tmp" lẫn bộ chặn key (traversal, prefix lạ) vì key đi thẳng thành đường dẫn file.
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { mkdtemp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  getObjectBuffer, InvalidKeyError, isMissingFile, putObject, removeObject, resolveKey,
} from "@/lib/storage";

let dir: string;
const prevEnv = process.env.UPLOAD_DIR;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "kp-uploads-"));
  process.env.UPLOAD_DIR = dir;
});
afterEach(async () => {
  vi.restoreAllMocks();
  if (prevEnv === undefined) delete process.env.UPLOAD_DIR;
  else process.env.UPLOAD_DIR = prevEnv;
  await rm(dir, { recursive: true, force: true });
});

/** Liệt kê MỌI file (kể cả file ẩn) dưới thư mục gốc, đường dẫn tương đối */
async function allFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { recursive: true, withFileTypes: true });
  return entries
    .filter((e) => e.isFile())
    .map((e) => path.relative(root, path.join(e.parentPath, e.name)))
    .sort();
}

describe("putObject / getObjectBuffer / removeObject", () => {
  const KEY = "public/neighborhoods/2b1c/photo-1-1726540000000.webp";

  test("ghi rồi đọc lại đúng từng byte, file nằm ở UPLOAD_DIR/key", async () => {
    const buf = Buffer.from([0, 1, 2, 250, 251, 255, 10, 13]);
    expect(await putObject(KEY, buf)).toBe(KEY);
    expect(Buffer.compare(await getObjectBuffer(KEY), buf)).toBe(0);
    expect(await allFiles(dir)).toEqual([KEY]);
  });

  test("ghi đè cùng key: đọc ra bản mới, không sót file .tmp", async () => {
    await putObject(KEY, Buffer.from("ban-cu-dai-hon-ban-moi"));
    await putObject(KEY, Buffer.from("moi"));
    expect((await getObjectBuffer(KEY)).toString()).toBe("moi");
    expect(await allFiles(dir)).toEqual([KEY]);
  });

  test("ghi song song cùng key (mô phỏng 2 pod): file cuối là MỘT bản nguyên vẹn", async () => {
    const a = Buffer.alloc(256 * 1024, 0x61);
    const b = Buffer.alloc(300 * 1024, 0x62);
    await Promise.all([putObject(KEY, a), putObject(KEY, b), putObject(KEY, a), putObject(KEY, b)]);
    const got = await getObjectBuffer(KEY);
    expect([0, 1].some((i) => Buffer.compare(got, [a, b][i]) === 0)).toBe(true);
    expect(await allFiles(dir)).toEqual([KEY]);
  });

  test("ghi lỗi (thư mục cha là FILE): ném lỗi, log UPLOAD_DIR + mã lỗi, không sót .tmp", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await mkdir(path.join(dir, "public"), { recursive: true });
    await writeFile(path.join(dir, "public", "signs"), "không phải thư mục");
    await expect(putObject("public/signs/x/photo.webp", Buffer.from("x"))).rejects.toMatchObject({
      code: expect.stringMatching(/ENOTDIR|EEXIST/),
    });
    expect(log).toHaveBeenCalledOnce();
    expect(String(log.mock.calls[0][0])).toContain(`UPLOAD_DIR=${dir}`);
    expect(String(log.mock.calls[0][0])).toMatch(/code=(ENOTDIR|EEXIST)/);
    expect(await allFiles(dir)).toEqual(["public/signs"]);
  });

  test("xoá file rồi đọc lại → ENOENT nhận diện được", async () => {
    await putObject(KEY, Buffer.from("x"));
    await removeObject(KEY);
    const err = await getObjectBuffer(KEY).catch((e) => e);
    expect(isMissingFile(err)).toBe(true);
    expect(await allFiles(dir)).toEqual([]);
  });

  test("xoá file không tồn tại: không ném lỗi, không log", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(removeObject("public/khong/ton-tai.webp")).resolves.toBeUndefined();
    expect(log).not.toHaveBeenCalled();
  });

  test("đọc file thiếu → isMissingFile = true; lỗi khác → false", async () => {
    const err = await getObjectBuffer("public/khong/ton-tai.webp").catch((e) => e);
    expect(err.code).toBe("ENOENT");
    expect(isMissingFile(err)).toBe(true);
    expect(isMissingFile(new InvalidKeyError("x"))).toBe(false);
    expect(isMissingFile(Object.assign(new Error("x"), { code: "EACCES" }))).toBe(false);
  });

  test("UPLOAD_DIR đọc lại mỗi lần gọi (không cache đường dẫn trong bộ nhớ)", async () => {
    await putObject(KEY, Buffer.from("thu-muc-1"));
    const dir2 = await mkdtemp(path.join(tmpdir(), "kp-uploads-2-"));
    try {
      process.env.UPLOAD_DIR = dir2;
      expect(isMissingFile(await getObjectBuffer(KEY).catch((e) => e))).toBe(true);
      await putObject(KEY, Buffer.from("thu-muc-2"));
      expect(await allFiles(dir2)).toEqual([KEY]);
    } finally {
      await rm(dir2, { recursive: true, force: true });
    }
  });
});

describe("resolveKey — chặn key nguy hiểm", () => {
  test("key hợp lệ → đường dẫn tuyệt đối dưới UPLOAD_DIR", () => {
    expect(resolveKey("public/a/b.webp")).toBe(path.join(dir, "public", "a", "b.webp"));
    expect(resolveKey("private/maps/1/original.webp")).toBe(path.join(dir, "private/maps/1/original.webp"));
  });

  test("UPLOAD_DIR tương đối được resolve thành tuyệt đối", () => {
    process.env.UPLOAD_DIR = "./uploads";
    expect(resolveKey("public/x.webp")).toBe(path.resolve("uploads", "public", "x.webp"));
  });

  const BAD: [string, string][] = [
    ["../etc/passwd", "traversal ở đầu"],
    ["public/../private/x.webp", "public/../private"],
    ["public/a/../../x", "traversal giữa chừng"],
    ["public/..", "đoạn .. cuối"],
    ["public/./x.webp", "đoạn ."],
    ["/etc/passwd", "đường dẫn tuyệt đối"],
    ["/public/x.webp", "tuyệt đối có prefix"],
    ["public\\..\\private\\x.webp", "gạch chéo ngược"],
    ["public/a\\b.webp", "gạch chéo ngược trong tên"],
    ["public/x.webp\0.png", "byte null"],
    ["public/x\0", "byte null cuối"],
    ["static/x.webp", "prefix lạ"],
    ["publicx/x.webp", "prefix gần giống"],
    ["public", "chỉ có prefix"],
    ["public/", "đoạn rỗng cuối"],
    ["public//x.webp", "đoạn rỗng giữa"],
    ["public/.x.webp.abc.tmp", "file ẩn / file tạm"],
    ["", "rỗng"],
    ["public/" + "a".repeat(600), "quá dài"],
  ];
  test.each(BAD)("%j bị chặn (%s)", (key) => {
    expect(() => resolveKey(key)).toThrow(InvalidKeyError);
  });

  test("key xấu: putObject không ghi gì, getObjectBuffer/removeObject cũng từ chối", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(putObject("public/../private/x.webp", Buffer.from("x"))).rejects.toBeInstanceOf(InvalidKeyError);
    await expect(getObjectBuffer("../../etc/passwd")).rejects.toBeInstanceOf(InvalidKeyError);
    await expect(removeObject("public/../../x")).resolves.toBeUndefined();
    expect(await allFiles(dir)).toEqual([]);
  });
});
