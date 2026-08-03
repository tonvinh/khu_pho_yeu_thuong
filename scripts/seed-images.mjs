// Seed ẢNH mock cho dữ liệu demo — sinh placeholder bằng sharp (SVG → WebP),
// upload MinIO rồi gắn key vào DB. Key ĐÚNG convention của các route admin:
//   - Khu phố:  public/neighborhoods/<id>/photo.webp
//   - Bản đồ:   private/maps/<id>/original.webp (gốc — chỉ admin, Q3)
//               public/maps/<id>/stylized.webp  (duotone kem–đỏ gạch, cùng pipeline stylize.ts)
//   - Vấn đề:   public/issues/<id>/photo.webp   (ảnh địa điểm, hiện khi bấm pin)
//   - Biển:     public/signs/<id>/photo.webp    (ảnh biển đã treo — suggestion installed)
// Chạy lại bao nhiêu lần cũng được (ghi đè object + key cũ).
import pg from "pg";
import sharp from "sharp";
import { Client as MinioClient } from "minio";

try { process.loadEnvFile(".env"); } catch { /* env đã có */ }

const DATABASE_URL =
  process.env.DATABASE_URL || "postgres://khupho:khupho_dev@localhost:5432/khupho";
const MINIO = {
  endPoint: process.env.MINIO_ENDPOINT || "localhost",
  port: Number(process.env.MINIO_PORT || 9000),
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ACCESS_KEY || "khupho",
  secretKey: process.env.MINIO_SECRET_KEY || "khupho_dev_secret",
  bucket: process.env.MINIO_BUCKET || "khupho",
};

// ===== Bảng màu chiến dịch =====
const CREAM = "#FBF5EC";
const BRICK = "#B23A2E";
const HOUSE_COLORS = ["#E8A87C", "#F2D06B", "#9BC1BC", "#D98E73", "#B8C9A3", "#E5B8A5", "#C9A96B"];
const CATEGORY_COLOR = {
  khoe_moi_ngay: "#5B9BD5",
  tre_con_trong_xom: "#F2A65A",
  van_minh_tu_te: "#D4A93B",
  giup_do_san_se: "#7FB285",
  xom_xanh_sach: "#6BA368",
  song_vui_co_ich: "#C97BA5",
};
const CATEGORY_LABEL = {
  khoe_moi_ngay: "Khoẻ mỗi ngày",
  tre_con_trong_xom: "Trẻ con trong xóm",
  van_minh_tu_te: "Lối sống văn minh, tử tế",
  giup_do_san_se: "Giúp đỡ, san sẻ",
  xom_xanh_sach: "Xóm xanh, xóm sạch",
  song_vui_co_ich: "Sống vui, sống có ích",
};

// PRNG xác định theo id — chạy lại ra đúng cùng một ảnh
function rng(seedStr) {
  let h = 1779033703;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const FONT = `font-family="Arial, Helvetica, sans-serif"`;

// ===== SVG: dãy nhà phố (ảnh khu phố cho slider trang chủ) =====
function neighborhoodSvg(name, seed) {
  const r = rng(seed);
  const W = 1200, H = 800;
  const houses = [];
  let x = -40;
  while (x < W + 40) {
    const w = 130 + r() * 90;
    const h = 260 + r() * 200;
    const c = pick(r, HOUSE_COLORS);
    const roofC = pick(r, ["#8C5A44", BRICK, "#7A6A55"]);
    const winRows = Math.floor(h / 95);
    let wins = "";
    for (let row = 0; row < winRows; row++) {
      for (let col = 0; col < 2; col++) {
        wins += `<rect x="${x + 22 + col * (w / 2)}" y="${560 - h + 40 + row * 90}" width="${w / 2 - 40}" height="52" rx="6" fill="#FFF6E5" stroke="#00000022" stroke-width="3"/>`;
      }
    }
    const awning = r() > 0.5
      ? `<rect x="${x - 6}" y="530" width="${w + 12}" height="26" rx="8" fill="${pick(r, [BRICK, "#4E7E77", "#C9862B"])}"/>`
      : "";
    houses.push(
      `<g><rect x="${x}" y="${560 - h}" width="${w}" height="${h}" fill="${c}"/>` +
      `<rect x="${x - 8}" y="${548 - h}" width="${w + 16}" height="18" rx="6" fill="${roofC}"/>` +
      wins + awning +
      `<rect x="${x + w / 2 - 32}" y="470" width="64" height="90" rx="6" fill="#6E4B36"/></g>`
    );
    x += w + 8;
  }
  // Dây đèn treo qua hẻm
  let lights = "";
  for (let i = 0; i < 3; i++) {
    const y = 120 + i * 60 + r() * 30;
    lights += `<path d="M0 ${y} Q ${W / 2} ${y + 70} ${W} ${y - 10}" stroke="#00000033" stroke-width="4" fill="none"/>`;
    for (let k = 1; k < 14; k++) {
      const t = k / 14;
      const lx = t * W;
      const ly = (1 - t) * (1 - t) * y + 2 * (1 - t) * t * (y + 70) + t * t * (y - 10);
      lights += `<circle cx="${lx}" cy="${ly + 10}" r="7" fill="${pick(r, ["#FFD966", "#FF9E5E", "#FFF2B3"])}"/>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#FFE8C7"/><stop offset="1" stop-color="#FFD1A8"/>
  </linearGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#sky)"/>
  <circle cx="${200 + r() * 800}" cy="130" r="64" fill="#FFC96B"/>
  ${houses.join("")}
  <rect y="560" width="${W}" height="${H - 560}" fill="#B9A88F"/>
  <rect y="560" width="${W}" height="14" fill="#00000022"/>
  ${lights}
  <rect x="40" y="${H - 130}" width="${Math.min(60 + name.length * 26, 900)}" height="76" rx="38" fill="${CREAM}" opacity="0.95"/>
  <text x="76" y="${H - 80}" ${FONT} font-size="44" font-weight="bold" fill="${BRICK}">${esc(name)}</text>
</svg>`;
}

// ===== SVG: bản đồ khu phố "gốc" (grid hẻm + block nhà) — nguồn cho bản cách điệu =====
function mapSvg(name, seed) {
  const r = rng(seed);
  const W = 1600, H = 1200;
  const parts = [];
  // Block nhà
  for (let gy = 0; gy < 5; gy++) {
    for (let gx = 0; gx < 7; gx++) {
      const bx = 60 + gx * 215 + r() * 20;
      const by = 60 + gy * 225 + r() * 20;
      parts.push(`<rect x="${bx}" y="${by}" width="${150 + r() * 40}" height="${150 + r() * 45}" rx="14" fill="${pick(r, ["#EADFCB", "#E2D5BE", "#EFE6D4", "#DCCFB6"])}" stroke="#C8B896" stroke-width="3"/>`);
    }
  }
  // Đường ngang/dọc
  for (let i = 1; i < 5; i++) {
    parts.push(`<rect x="0" y="${i * 225 + 18}" width="${W}" height="34" fill="#FFFFFF" stroke="#D8CBB0" stroke-width="2"/>`);
  }
  for (let i = 1; i < 7; i++) {
    parts.push(`<rect x="${i * 215 + 24}" y="0" width="30" height="${H}" fill="#FFFFFF" stroke="#D8CBB0" stroke-width="2"/>`);
  }
  // Công viên + chợ
  parts.push(`<circle cx="${300 + r() * 900}" cy="${300 + r() * 500}" r="95" fill="#AECBA4" stroke="#7FA36F" stroke-width="4"/>`);
  parts.push(`<rect x="${200 + r() * 1000}" y="${200 + r() * 600}" width="150" height="110" rx="10" fill="#E8B04B" stroke="#B9861F" stroke-width="4"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${CREAM}"/>
  ${parts.join("")}
  <rect x="40" y="${H - 120}" width="${Math.min(80 + name.length * 30, 1100)}" height="80" rx="16" fill="#FFFFFF" stroke="${BRICK}" stroke-width="4"/>
  <text x="80" y="${H - 65}" ${FONT} font-size="48" font-weight="bold" fill="${BRICK}">${esc(name)}</text>
</svg>`;
}

// ===== SVG: ảnh địa điểm của vấn đề (góc hẻm) =====
function issueSvg(category, locationText, seed) {
  const r = rng(seed);
  const W = 1000, H = 750;
  const accent = CATEGORY_COLOR[category] || BRICK;
  const label = CATEGORY_LABEL[category] || category;
  const wallC = pick(r, ["#D9C7A7", "#CBB694", "#E3D3B5"]);
  // Chi tiết hẻm: cột điện + dây, chậu cây, xe đạp dựng tường
  const plants = [];
  for (let i = 0; i < 4; i++) {
    const px = 80 + r() * 800;
    plants.push(`<g><rect x="${px}" y="600" width="52" height="46" rx="6" fill="#A8552F"/>
      <circle cx="${px + 26}" cy="580" r="34" fill="#6BA368"/></g>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${wallC}"/>
  <rect width="${W}" height="60" fill="#BFD8E8"/>
  <rect y="560" width="${W}" height="${H - 560}" fill="#A99879"/>
  <rect y="560" width="${W}" height="12" fill="#00000022"/>
  <rect x="60" y="120" width="360" height="440" rx="8" fill="#8C97A0"/>
  <rect x="90" y="150" width="140" height="180" rx="6" fill="#5E6970"/>
  <rect x="250" y="150" width="140" height="180" rx="6" fill="#5E6970"/>
  <rect x="90" y="370" width="300" height="160" rx="6" fill="#4E585F"/>
  <rect x="760" y="80" width="20" height="480" fill="#6E655A"/>
  <path d="M770 110 Q 400 190 0 150" stroke="#3F3A33" stroke-width="5" fill="none"/>
  <path d="M770 150 Q 500 230 0 210" stroke="#3F3A33" stroke-width="4" fill="none"/>
  <circle cx="770" cy="95" r="16" fill="#FFE9A8" stroke="#B9A15E" stroke-width="4"/>
  ${plants.join("")}
  <rect x="40" y="${H - 118}" width="${Math.min(120 + (label.length + locationText.length) * 17, 920)}" height="70" rx="35" fill="${CREAM}" opacity="0.96"/>
  <circle cx="82" cy="${H - 83}" r="17" fill="${accent}"/>
  <text x="112" y="${H - 71}" ${FONT} font-size="32" font-weight="bold" fill="#4A3F33">${esc(label)} · ${esc(locationText)}</text>
</svg>`;
}

// ===== SVG: ảnh biển 4N đã treo trên tường =====
function signSvg(content, neighborhoodName, seed) {
  const r = rng(seed);
  const W = 1000, H = 750;
  const wallC = pick(r, ["#C9B491", "#D6C4A0", "#BFAE8C"]);
  // Bẻ dòng nội dung câu nhắc (~26 ký tự/dòng)
  const words = content.split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > 26) { lines.push(cur.trim()); cur = w; }
    else cur += " " + w;
  }
  if (cur.trim()) lines.push(cur.trim());
  const textEls = lines.map((ln, i) =>
    `<text x="${W / 2}" y="${330 + i * 62}" ${FONT} font-size="46" font-weight="bold" fill="${BRICK}" text-anchor="middle">${esc(ln)}</text>`
  ).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${wallC}"/>
  <rect x="150" y="140" width="700" height="${240 + lines.length * 62}" rx="26" fill="${CREAM}" stroke="${BRICK}" stroke-width="10"/>
  <circle cx="185" cy="175" r="9" fill="#8A8A8A"/><circle cx="815" cy="175" r="9" fill="#8A8A8A"/>
  <path d="M500 210 c -16 -22 -52 -14 -52 12 c 0 20 30 38 52 52 c 22 -14 52 -32 52 -52 c 0 -26 -36 -34 -52 -12 z" fill="${BRICK}"/>
  ${textEls}
  <text x="${W / 2}" y="${270 + lines.length * 62 + 60}" ${FONT} font-size="26" fill="#8A6F52" text-anchor="middle">Khu phố biết thương · ${esc(neighborhoodName)}</text>
</svg>`;
}

// ===== Cách điệu bản đồ: duotone đỏ gạch → kem — GIỐNG src/lib/stylize.ts =====
// (script .mjs thuần không import được TS nên chép pipeline; sửa gì thì sửa cả hai)
async function stylizeMap(original) {
  return sharp(original)
    .rotate()
    .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#fff" })
    .removeAlpha()
    .modulate({ saturation: 0 })
    .median(3)
    .normalise()
    .gamma(1.2)
    .linear([(251 - 178) / 255, (245 - 58) / 255, (236 - 46) / 255], [178, 58, 46])
    .webp({ quality: 78 })
    .toBuffer();
}

const svgToWebp = (svg, quality = 82) =>
  sharp(Buffer.from(svg)).webp({ quality }).toBuffer();

// ===== Main =====
const db = new pg.Client({ connectionString: DATABASE_URL });
await db.connect();
const minio = new MinioClient(MINIO);
if (!(await minio.bucketExists(MINIO.bucket).catch(() => false))) {
  await minio.makeBucket(MINIO.bucket);
}
const put = (key, buf) =>
  minio.putObject(MINIO.bucket, key, buf, buf.length, { "Content-Type": "image/webp" });

// 1) Khu phố: ảnh tổng quan (neighborhood_photos, 2 ảnh demo/khu — kích thước
//    ĐỒNG NHẤT 1280×720 như route upload admin) + bản đồ gốc (private) + cách điệu (public)
const toCover = (buf) =>
  sharp(buf).resize(1280, 720, { fit: "cover" }).webp({ quality: 82 }).toBuffer();
const nbs = await db.query(
  `SELECT id, name FROM neighborhoods WHERE hidden = false ORDER BY name`
);
for (const nb of nbs.rows) {
  for (const position of [1, 2]) {
    const photo = await toCover(
      Buffer.from(neighborhoodSvg(nb.name, `photo:${nb.id}:${position}`))
    );
    const photoKey = `public/neighborhoods/${nb.id}/photo-${position}.webp`;
    await put(photoKey, photo);
    await db.query(
      `INSERT INTO neighborhood_photos (neighborhood_id, photo_key, position)
       VALUES ($1,$2,$3)
       ON CONFLICT (neighborhood_id, position) DO UPDATE SET photo_key = EXCLUDED.photo_key`,
      [nb.id, photoKey, position]
    );
  }
  const mapPng = await sharp(Buffer.from(mapSvg(nb.name, `map:${nb.id}`))).png().toBuffer();
  const originalKey = `private/maps/${nb.id}/original.webp`;
  const stylizedKey = `public/maps/${nb.id}/stylized.webp`;
  await put(originalKey, await sharp(mapPng).webp({ quality: 90 }).toBuffer());
  await put(stylizedKey, await stylizeMap(mapPng));
  await db.query(
    `UPDATE neighborhoods SET map_image_key=$2, map_stylized_key=$3 WHERE id=$1`,
    [nb.id, originalKey, stylizedKey]
  );
  console.log(`✔ Khu phố: ${nb.name} (2 ảnh tổng quan)`);
}

// 2) Vấn đề: ảnh địa điểm
const issues = await db.query(`SELECT id, category, location_text FROM issues`);
for (const i of issues.rows) {
  const key = `public/issues/${i.id}/photo.webp`;
  await put(key, await svgToWebp(issueSvg(i.category, i.location_text, `issue:${i.id}`)));
  await db.query(`UPDATE issues SET photo_key=$2 WHERE id=$1`, [i.id, key]);
}
console.log(`✔ Vấn đề: ${issues.rows.length} ảnh địa điểm`);

// 3) Biển đã treo: ảnh biển thật (suggestion installed)
const signs = await db.query(
  `SELECT s.id, s.content, n.name AS nb_name
   FROM suggestions s JOIN issues i ON i.id = s.issue_id
   JOIN neighborhoods n ON n.id = i.neighborhood_id
   WHERE s.status = 'installed'`
);
for (const s of signs.rows) {
  const key = `public/signs/${s.id}/photo.webp`;
  await put(key, await svgToWebp(signSvg(s.content, s.nb_name, `sign:${s.id}`)));
  await db.query(`UPDATE suggestions SET image_key=$2 WHERE id=$1`, [s.id, key]);
}
console.log(`✔ Biển đã treo: ${signs.rows.length} ảnh`);

await db.end();
console.log("✔ Seed ảnh xong — mở trang chủ để xem slider có ảnh.");
