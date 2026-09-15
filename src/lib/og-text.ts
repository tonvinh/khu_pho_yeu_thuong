// Lọc chữ trước khi đưa vào ảnh OG — production chạy MÔI TRƯỜNG KÍN (không ra Internet).
//
// next/og (satori) gặp grapheme nào mà font truyền vào KHÔNG có glyph thì tự tải ở ngoài:
//   · emoji           → cdn.jsdelivr.net (twemoji) — lỗi là NÉM, build/route OG chết 500
//   · ký tự thiếu font → fonts.googleapis.com — có bắt lỗi nhưng treo tới hết timeout kết nối
// Điều kiện "thiếu glyph" đọc từ bảng cmap của font (satori dùng opentype.js `stringToGlyphs`),
// nên lọc theo đúng cmap là chặn được CẢ HAI mà không phải đoán bằng regex emoji/script.

/** Tập code point có glyph (≠ .notdef) trong bảng cmap của một font TrueType/OpenType. */
export function parseCmap(buf: Uint8Array): Set<number> {
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const numTables = v.getUint16(4);
  let cmap = -1;
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16;
    const tag = String.fromCharCode(buf[rec], buf[rec + 1], buf[rec + 2], buf[rec + 3]);
    if (tag === "cmap") cmap = v.getUint32(rec + 8);
  }
  if (cmap < 0) throw new Error("Font không có bảng cmap");

  // Chọn subtable như opentype.js: ưu tiên format 12 (Unicode full), rồi format 4 (BMP).
  let fmt12 = -1;
  let fmt4 = -1;
  const n = v.getUint16(cmap + 2);
  for (let i = 0; i < n; i++) {
    const rec = cmap + 4 + i * 8;
    const platform = v.getUint16(rec);
    const encoding = v.getUint16(rec + 2);
    const off = cmap + v.getUint32(rec + 4);
    const format = v.getUint16(off);
    const unicode = platform === 0 || (platform === 3 && (encoding === 1 || encoding === 10));
    if (!unicode) continue;
    if (format === 12 && fmt12 < 0) fmt12 = off;
    if (format === 4 && fmt4 < 0) fmt4 = off;
  }

  const out = new Set<number>();
  if (fmt12 >= 0) {
    const groups = v.getUint32(fmt12 + 12);
    for (let i = 0; i < groups; i++) {
      const g = fmt12 + 16 + i * 12;
      const start = v.getUint32(g);
      const end = v.getUint32(g + 4);
      const glyph = v.getUint32(g + 8);
      for (let c = start; c <= end; c++) if (glyph + (c - start) !== 0) out.add(c);
    }
    return out;
  }
  if (fmt4 >= 0) {
    const segX2 = v.getUint16(fmt4 + 6);
    const ends = fmt4 + 14;
    const starts = ends + segX2 + 2;
    const deltas = starts + segX2;
    const ranges = deltas + segX2;
    for (let s = 0; s < segX2; s += 2) {
      const end = v.getUint16(ends + s);
      const start = v.getUint16(starts + s);
      const delta = v.getInt16(deltas + s);
      const rangeOff = v.getUint16(ranges + s);
      for (let c = start; c <= end && c !== 0xffff; c++) {
        let glyph: number;
        if (rangeOff === 0) glyph = (c + delta) & 0xffff;
        else {
          const raw = v.getUint16(ranges + s + rangeOff + (c - start) * 2);
          glyph = raw === 0 ? 0 : (raw + delta) & 0xffff;
        }
        if (glyph !== 0) out.add(c);
      }
    }
    return out;
  }
  throw new Error("Font không có cmap Unicode format 4/12");
}

// Base image build của CI FPT là Node không rõ phiên bản/ICU — thiếu Intl.Segmenter mà gọi
// thẳng lúc import là route OG chết khi prerender. Dự phòng tách theo code point: chuỗi
// emoji vẫn bị lọc sạch (ZWJ, FE0F, 20E3 đều không có trong font), chỉ keycap "1️⃣" sót "1".
const segmenter =
  typeof Intl.Segmenter === "function" ? new Intl.Segmenter("vi", { granularity: "grapheme" }) : null;

function graphemes(s: string): string[] {
  return segmenter ? Array.from(segmenter.segment(s), (x) => x.segment) : Array.from(s);
}

/**
 * Giữ lại đúng những grapheme mà MỌI code point đều có glyph trong `supported`.
 * Emoji (kể cả chuỗi ZWJ, cờ, keycap) và chữ ngoài font bị bỏ NGUYÊN CỤM; khoảng trắng
 * gộp lại một dấu cách. Chỉ dùng khi dựng ảnh OG — dữ liệu gốc trong DB không đổi.
 */
export function ogText(input: string | null | undefined, supported: Set<number>): string {
  if (!input) return "";
  let out = "";
  for (const segment of graphemes(input.normalize("NFC"))) {
    if (/^\s+$/u.test(segment)) {
      out += " ";
      continue;
    }
    let ok = true;
    for (const ch of segment) {
      if (!supported.has(ch.codePointAt(0)!)) {
        ok = false;
        break;
      }
    }
    if (ok) out += segment;
  }
  return out.replace(/\s+/g, " ").trim();
}
