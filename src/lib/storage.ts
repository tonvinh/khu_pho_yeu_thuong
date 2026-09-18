// Ảnh upload lưu FILESYSTEM (17/9 — thay object storage): file nằm ở `${UPLOAD_DIR}/${key}`.
// Production (Kubernetes) mount PVC NFS ReadWriteMany vào /app/uploads, nhiều pod cùng
// ghi/đọc một thư mục ⇒ module này KHÔNG giữ trạng thái nào trong bộ nhớ (không cache
// danh sách file, không cache "thư mục đã tạo"), mọi lần ghi là ghi tạm rồi rename.
//
// Key giữ nguyên quy ước cũ (không migration DB, không đổi URL /api/img/<key>):
//   public/...   ảnh khu phố, chứng nhận, biển, bản đồ cách điệu — stream qua /api/img
//   private/...  ảnh bản đồ GỐC — chỉ admin (Q3), /api/img từ chối
import { randomBytes } from "node:crypto";
import { mkdir, open, readFile, rename, rm } from "node:fs/promises";
import path from "node:path";
import { env } from "./env";

const KEY_PREFIXES = ["public", "private"];
// Mỗi đoạn key chỉ gồm chữ/số/._- và KHÔNG bắt đầu bằng "." — vừa chặn "."/"..",
// vừa bảo đảm file tạm (".<tên>.<ngẫu nhiên>.tmp") không bao giờ phục vụ ra ngoài.
const SEGMENT = /^[A-Za-z0-9_-][A-Za-z0-9._-]*$/;

export class InvalidKeyError extends Error {
  constructor(key: string) {
    super(`Key ảnh không hợp lệ: ${JSON.stringify(key.slice(0, 200))}`);
    this.name = "InvalidKeyError";
  }
}

/** Key → đường dẫn tuyệt đối trong UPLOAD_DIR. Ném InvalidKeyError với mọi key lạ:
 *  prefix khác public/private, đường dẫn tuyệt đối, `..`, `\`, byte null, đoạn rỗng. */
export function resolveKey(key: string): string {
  if (typeof key !== "string" || key.length === 0 || key.length > 500) {
    throw new InvalidKeyError(String(key));
  }
  const parts = key.split("/");
  if (parts.length < 2 || !KEY_PREFIXES.includes(parts[0]) || !parts.every((p) => SEGMENT.test(p))) {
    throw new InvalidKeyError(key);
  }
  const root = env.UPLOAD_DIR;
  const file = path.resolve(root, ...parts);
  // Lớp chặn thứ hai — regex ở trên đã loại hết, đây chỉ là chốt an toàn.
  if (!file.startsWith(root.endsWith(path.sep) ? root : root + path.sep)) throw new InvalidKeyError(key);
  return file;
}

function errCode(e: unknown): string {
  return (e as NodeJS.ErrnoException)?.code || (e as Error)?.name || "UNKNOWN";
}

/** Lỗi đọc vì file không tồn tại (route ảnh trả 404 mà không cần log). */
export function isMissingFile(e: unknown): boolean {
  const code = (e as NodeJS.ErrnoException)?.code;
  // EISDIR: key trỏ vào THƯ MỤC có thật (vd "public/neighborhoods") — resolveKey cho qua vì
  // đúng bộ ký tự. ENOTDIR: một đoạn cha lại là file. Cả hai đều do người gọi bịa key, không
  // phải sự cố đĩa/NFS ⇒ coi như thiếu file, tuyệt đối KHÔNG log (route /api/img mở công khai,
  // log được thì ai cũng bơm rác được vào log — chỗ duy nhất báo EACCES/EIO thật).
  return code === "ENOENT" || code === "EISDIR" || code === "ENOTDIR";
}

/** Ghi ảnh: ghi file tạm CÙNG thư mục → fsync → rename. rename trong cùng thư mục là
 *  nguyên tử (kể cả trên NFS) nên người đọc không bao giờ thấy file dở; hai pod ghi
 *  cùng key thì bản rename sau thắng, không file nào hỏng. */
export async function putObject(key: string, buf: Buffer): Promise<string> {
  const file = resolveKey(key);
  const dir = path.dirname(file);
  const tmp = path.join(dir, `.${path.basename(file)}.${randomBytes(8).toString("hex")}.tmp`);
  try {
    await mkdir(dir, { recursive: true });
    const fh = await open(tmp, "wx");
    try {
      await fh.writeFile(buf);
      await fh.sync();
    } finally {
      await fh.close();
    }
    await rename(tmp, file);
    return key;
  } catch (e) {
    await rm(tmp, { force: true }).catch(() => {});
    console.error(`[storage] ghi ảnh thất bại UPLOAD_DIR=${env.UPLOAD_DIR} code=${errCode(e)} key=${key}`);
    throw e;
  }
}

/** Xoá ảnh (dọn ảnh cũ khi thay/xoá). File không tồn tại = đã xong. Lỗi khác chỉ log —
 *  file mồ côi vô hại, không được làm hỏng thao tác admin đã ghi DB xong. */
export async function removeObject(key: string): Promise<void> {
  try {
    await rm(resolveKey(key), { force: true });
  } catch (e) {
    console.error(`[storage] xoá ảnh thất bại UPLOAD_DIR=${env.UPLOAD_DIR} code=${errCode(e)} key=${key}`);
  }
}

/** Đọc ảnh. File thiếu (hoặc key trỏ vào thư mục) → ném lỗi, kiểm bằng `isMissingFile`. */
export async function getObjectBuffer(key: string): Promise<Buffer> {
  return readFile(resolveKey(key));
}

/** URL public cho ảnh key prefix public/ — đi qua route stream của web app */
export function imgUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  const base = env.BASE_PATH;
  return `${base}/api/img/${key}`;
}
