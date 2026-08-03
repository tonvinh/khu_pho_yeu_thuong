// Cách điệu bản đồ tự động (Q3): duotone kem–đỏ gạch + làm mờ chi tiết thừa.
// Xử lý server-side bằng sharp → lưu ảnh RIÊNG; public không bao giờ thấy ảnh gốc.
import sharp from "sharp";

/** Bảng màu chiến dịch: nền kem #FBF5EC, đỏ gạch #B23A2E */
export async function stylizeMap(original: Buffer): Promise<Buffer> {
  const base = sharp(original).rotate().resize(1600, 1600, {
    fit: "inside",
    withoutEnlargement: true,
  });

  // Desaturate GIỮ 3 band (KHÔNG dùng .grayscale() — ảnh 1 band làm .tint()/.linear()
  // của sharp 0.34 không ăn màu, ra đen trắng), median (mờ chi tiết) + posterize nhẹ
  // qua gamma, rồi map tông bằng linear(): đen → đỏ gạch (178,58,46), trắng → kem (251,245,236)
  const duotone = await base
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

  return duotone;
}

/** Ảnh tổng quan khu phố: kích thước ĐỒNG NHẤT 1280×720 (16:9, crop vùng nổi bật) → WebP.
 *  Mọi ảnh upload đều qua đây nên 4 slot của một khu phố luôn cùng cỡ. */
export async function toCover(
  original: Buffer, width = 1280, height = 720, quality = 82
): Promise<Buffer> {
  return sharp(original)
    .rotate()
    .resize(width, height, { fit: "cover", position: "attention" })
    .webp({ quality })
    .toBuffer();
}

/** Resize ảnh thường (địa điểm, biển, khu phố) → WebP */
export async function toWebp(original: Buffer, maxSize = 1400, quality = 80): Promise<Buffer> {
  return sharp(original)
    .rotate()
    .resize(maxSize, maxSize, { fit: "inside", withoutEnlargement: true })
    .webp({ quality })
    .toBuffer();
}
