// Cách điệu bản đồ tự động (Q3): duotone kem–đỏ gạch + làm mờ chi tiết thừa.
// Xử lý server-side bằng sharp → lưu ảnh RIÊNG; public không bao giờ thấy ảnh gốc.
import sharp from "sharp";

/** Bảng màu chiến dịch: nền kem #FBF5EC, đỏ gạch #B23A2E */
export async function stylizeMap(original: Buffer): Promise<Buffer> {
  const base = sharp(original).rotate().resize(1600, 1600, {
    fit: "inside",
    withoutEnlargement: true,
  });

  // Grayscale + median (mờ chi tiết) + posterize nhẹ qua gamma, rồi tint đỏ gạch trên nền kem
  const duotone = await base
    .grayscale()
    .median(3)
    .normalise()
    .gamma(1.2)
    .tint({ r: 178, g: 58, b: 46 }) // đỏ gạch
    .modulate({ brightness: 1.18, saturation: 0.85 })
    .webp({ quality: 78 })
    .toBuffer();

  return duotone;
}

/** Resize ảnh thường (địa điểm, biển, khu phố) → WebP */
export async function toWebp(original: Buffer, maxSize = 1400, quality = 80): Promise<Buffer> {
  return sharp(original)
    .rotate()
    .resize(maxSize, maxSize, { fit: "inside", withoutEnlargement: true })
    .webp({ quality })
    .toBuffer();
}
