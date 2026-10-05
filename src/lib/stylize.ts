// Cách điệu bản đồ tự động (Q3): duotone kem–đỏ gạch + làm mờ chi tiết thừa.
// Xử lý server-side bằng sharp → lưu ảnh RIÊNG; public không bao giờ thấy ảnh gốc.
//
// Pentest 10/2026 (lỗi 5.2.1 + 5.2.2): MỌI ảnh upload đi qua `guarded()` dưới đây —
// đừng gọi `sharp(buf)` thẳng trên buffer người dùng gửi lên ở chỗ nào khác.
//   1. Magic bytes: chỉ JPEG/PNG/WebP. sharp tự nhận dạng theo NỘI DUNG chứ không theo
//      Content-Type client khai, nên SVG đổi `Content-Type: image/jpeg` vẫn bị librsvg
//      render (bom filter SVG ăn 37s CPU/request).
//   2. `metadata()` chỉ đọc header ảnh (rẻ): định dạng thật phải khớp magic bytes và
//      số điểm ảnh ≤ MAX_INPUT_PIXELS — PNG 16000×16000 nặng 756KB bung ra 732MB RAM.
//   3. Giải mã có `limitInputPixels` + `timeout` (lưới an toàn thứ hai).
//   4. Tối đa IMAGE_SLOTS ảnh xử lý CÙNG LÚC mỗi tiến trình, hàng chờ có trần — RAM
//      dành cho ảnh có trần cứng dù bị bắn bao nhiêu request song song.
import sharp from "sharp";

/** Trần số điểm ảnh đầu vào (chốt theo khuyến nghị pentest: 4096×4096 ≈ 16,7MP).
 *  Tính theo TỔNG điểm ảnh (rộng × cao) — ảnh 5000×3000 vẫn qua, 6000×4000 thì không. */
export const MAX_INPUT_PIXELS = 4096 * 4096;
const TIMEOUT_SECONDS = 20;
const IMAGE_SLOTS = 2;
const MAX_WAITING = 4;

/** Lỗi ảnh đầu vào — route trả thẳng `status` + `message` cho client. */
export class ImageError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ImageError";
  }
}

type ImageFormat = "jpeg" | "png" | "webp";

/** Nhận dạng định dạng theo chữ ký file — KHÔNG tin Content-Type/đuôi file của client. */
export function sniffImage(buf: Buffer): ImageFormat | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (
    buf.length >= 8 &&
    buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) return "png";
  if (
    buf.length >= 12 &&
    buf.toString("latin1", 0, 4) === "RIFF" &&
    buf.toString("latin1", 8, 12) === "WEBP"
  ) return "webp";
  return null;
}

/** Kiểm ảnh TRƯỚC khi giải mã: chữ ký file + định dạng thật + số điểm ảnh. */
export async function checkImage(buf: Buffer): Promise<void> {
  const fmt = sniffImage(buf);
  if (!fmt) throw new ImageError(400, "Chỉ nhận ảnh jpg/png/webp");
  let meta: sharp.Metadata;
  try {
    meta = await sharp(buf, { limitInputPixels: false }).metadata();
  } catch {
    throw new ImageError(400, "Ảnh bị hỏng hoặc không đọc được");
  }
  if (meta.format !== fmt) throw new ImageError(400, "Chỉ nhận ảnh jpg/png/webp");
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (!w || !h) throw new ImageError(400, "Ảnh bị hỏng hoặc không đọc được");
  if (w * h > MAX_INPUT_PIXELS) {
    throw new ImageError(400, "Ảnh quá lớn — tối đa khoảng 16 megapixel (vd 4096×4096). Thu nhỏ ảnh rồi tải lại nhé");
  }
}

type Slots = { active: number; waiting: Array<() => void> };
declare global {
  // eslint-disable-next-line no-var
  var __kpImageSlots: Slots | undefined;
}
function slots(): Slots {
  if (!globalThis.__kpImageSlots) globalThis.__kpImageSlots = { active: 0, waiting: [] };
  return globalThis.__kpImageSlots;
}

/** Chạy `fn` khi có slot trống; hàng chờ đầy → 429. Nhả slot thì trao THẲNG cho người
 *  chờ đầu tiên (không giảm `active`) để không ai chen ngang. */
async function withImageSlot<T>(fn: () => Promise<T>): Promise<T> {
  const s = slots();
  if (s.active >= IMAGE_SLOTS) {
    if (s.waiting.length >= MAX_WAITING) {
      throw new ImageError(429, "Máy chủ đang xử lý nhiều ảnh — thử lại sau ít giây nhé");
    }
    await new Promise<void>((resolve) => s.waiting.push(resolve));
  } else {
    s.active++;
  }
  try {
    return await fn();
  } finally {
    const next = s.waiting.shift();
    if (next) next();
    else s.active--;
  }
}

/** sharp đã chặn trần điểm ảnh + timeout cho buffer người dùng gửi lên. */
function decode(buf: Buffer): sharp.Sharp {
  return sharp(buf, { limitInputPixels: MAX_INPUT_PIXELS }).timeout({ seconds: TIMEOUT_SECONDS });
}

/** Cổng chung: kiểm → chờ slot → xử lý. Mọi lỗi ném ra đều là ImageError. */
async function guarded(original: Buffer, run: (img: sharp.Sharp) => Promise<Buffer>): Promise<Buffer> {
  await checkImage(original);
  return withImageSlot(async () => {
    try {
      return await run(decode(original));
    } catch (e) {
      if (e instanceof ImageError) throw e;
      console.error("[image] xử lý ảnh thất bại:", (e as Error)?.message);
      throw new ImageError(400, "Không xử lý được ảnh này — thử ảnh khác nhé");
    }
  });
}

/** Bảng màu chiến dịch: nền kem #FBF5EC, đỏ gạch #B23A2E */
export async function stylizeMap(original: Buffer): Promise<Buffer> {
  return guarded(original, (img) => {
    const base = img.rotate().resize(1600, 1600, {
      fit: "inside",
      withoutEnlargement: true,
    });

    // Desaturate GIỮ 3 band (KHÔNG dùng .grayscale() — ảnh 1 band làm .tint()/.linear()
    // của sharp 0.34 không ăn màu, ra đen trắng), median (mờ chi tiết) + posterize nhẹ
    // qua gamma, rồi map tông bằng linear(): đen → đỏ gạch (178,58,46), trắng → kem (251,245,236)
    return base
      .flatten({ background: "#fff" })
      .removeAlpha()
      .modulate({ saturation: 0 })
      .median(3)
      .normalise()
      .gamma(1.2)
      .linear(
        [(251 - 178) / 255, (245 - 58) / 255, (236 - 46) / 255],
        [178, 58, 46]
      )
      .webp({ quality: 78 })
      .toBuffer();
  });
}

/** Ảnh tổng quan khu phố: kích thước ĐỒNG NHẤT 1280×720 (16:9, crop vùng nổi bật) → WebP.
 *  Mọi ảnh upload đều qua đây nên 4 slot của một khu phố luôn cùng cỡ. */
export async function toCover(
  original: Buffer, width = 1280, height = 720, quality = 82
): Promise<Buffer> {
  return guarded(original, (img) =>
    img
      .rotate()
      .resize(width, height, { fit: "cover", position: "attention" })
      .webp({ quality })
      .toBuffer()
  );
}

/** Resize ảnh thường (địa điểm, biển, khu phố) → WebP */
export async function toWebp(original: Buffer, maxSize = 1400, quality = 80): Promise<Buffer> {
  return guarded(original, (img) =>
    img
      .rotate()
      .resize(maxSize, maxSize, { fit: "inside", withoutEnlargement: true })
      .webp({ quality })
      .toBuffer()
  );
}
