// Seed BỔ SUNG dữ liệu test — chạy trên DB ĐÃ CÓ dữ liệu (khác seed.mjs vốn chỉ chạy
// trên DB trống): thêm ~18 góc phố trải khắp 20 khu phố tiêu chuẩn, ~26 câu nhắc,
// lượt thương phân bố lệch (3→51) để 3 tab trang chủ (Mới nhất · Chờ bạn bình chọn ·
// Được yêu thích nhất) có dữ liệu phong phú. Điểm ghi sổ cái ĐÚNG công thức 05:
// issue_approved +2 · suggestion_approved +5 · vote_received +1/phiếu · sign_installed +30.
// Idempotent: góc phố nhận diện theo (khu phố, location_text) — đã có thì bỏ qua trọn bộ
// (câu + phiếu + điểm đi kèm); user nhận diện theo phone_hash. Chạy lại không nhân đôi.
// Sau khi chạy: `pnpm seed:images` để sinh ảnh mock cho góc phố/biển mới.
import pg from "pg";
import { createHmac, randomBytes } from "node:crypto";

try { process.loadEnvFile(".env"); } catch { /* env đã có */ }

const PEPPER = process.env.PHONE_PEPPER || "dev-only-pepper-khong-dung-cho-production";
const DATABASE_URL =
  process.env.DATABASE_URL || "postgres://khupho:khupho_dev@localhost:5432/khupho";

const phoneHash = (p) => createHmac("sha256", PEPPER).update(p).digest("hex");
const slug = () => randomBytes(16).toString("base64url").replace(/[-_]/g, "").slice(0, 10).toLowerCase();

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();

// ===== Khu phố tiêu chuẩn phải có sẵn (pnpm seed đã top-up) =====
const nbRows = await client.query(
  `SELECT id, slug FROM neighborhoods WHERE hidden = false`
);
const NB = Object.fromEntries(nbRows.rows.map((r) => [r.slug, r.id]));
const need = (s) => {
  if (!NB[s]) throw new Error(`Thiếu khu phố tiêu chuẩn '${s}' — chạy \`pnpm seed\` trước.`);
  return NB[s];
};

await client.query("BEGIN");

// ===== Cư dân: tác giả mới + hồ bình chọn =====
// phone_hash UNIQUE → ON CONFLICT DO UPDATE để RETURNING id cả khi đã tồn tại (idempotent)
async function upsertUser(phone, name, nbId) {
  const r = await client.query(
    `INSERT INTO users (phone_hash, display_name, share_slug, neighborhood_id)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (phone_hash) DO UPDATE SET display_name = EXCLUDED.display_name
     RETURNING id`,
    [phoneHash(phone), name, slug(), nbId]
  );
  return r.rows[0].id;
}

const AUTHOR_DEFS = [
  ["Cô Út bún riêu", "khu-cho-ba-chieu"],
  ["Chú Tư sửa xe", "cu-xa-thanh-da"],
  ["Chị Hằng", "hem-51-cao-thang"],
  ["Ông Năm cờ tướng", "xom-lo-gom"],
  ["Bé Na (lớp 8)", "phuong-hanh-thong"],
  ["Anh Tài ba gác", "hem-200-xom-chieu"],
  ["Dì Sáu", "xom-dinh-an-nhon"],
  ["Thầy Phong", "phuong-ben-thanh"],
  ["Cô Nhung hàng nước", "xom-chua-tan-quy"],
  ["Anh Khoa Grab", "phuong-phu-nhuan"],
];
const AUTHORS = {};
for (let k = 0; k < AUTHOR_DEFS.length; k++) {
  const [name, nbSlug] = AUTHOR_DEFS[k];
  AUTHORS[name] = await upsertUser(`+8493${String(1000000 + k).slice(-7)}`, name, need(nbSlug));
}

// Hồ 60 cư dân chỉ bình chọn (UNIQUE (suggestion_id, user_id) → cần đủ người cho câu 51 phiếu)
const voters = [];
for (let i = 1; i <= 60; i++) {
  voters.push(
    await upsertUser(`+8492${String(1000000 + i).slice(-7)}`, `Cư dân khu mới ${i}`, need("phuong-ban-co"))
  );
}

// ===== Dữ liệu góc phố + câu nhắc =====
// s: [tác giả, nội dung ≤120 ký tự, số lượt thương, installed?]
const ISSUES = [
  { nb: "cu-xa-thanh-da", cat: "khoe_moi_ngay", loc: "Sân chung Lô A Thanh Đa",
    desc: "Sáng nào cô chú cũng tập dưỡng sinh, dép guốc để lộn xộn dễ vấp.",
    status: "voting", days: 2, px: 30, py: 40,
    s: [
      ["Chú Tư sửa xe", "Dép để gọn một góc, sân rộng thêm một vòng tay.", 24],
      ["Chị Hằng", "Tập sớm nhớ nhẹ chân nhẹ tiếng, hàng xóm còn say giấc nha.", 9],
      ["Anh Khoa Grab", "Xong buổi tập, mình nán lại xếp ghế giùm nhau nhé.", 4],
    ] },
  { nb: "xom-bau-cat", cat: "xom_xanh_sach", loc: "Góc cây bàng Bàu Cát 2",
    desc: "Lá rụng nhiều, có người gom sẵn mà chưa ai đổ giúp.",
    status: "voting", days: 5, px: 55, py: 30,
    s: [
      ["Cô Nhung hàng nước", "Thấy bao lá gom sẵn, tiện tay mang giúp ra xe rác nha.", 18],
      ["Dì Sáu", "Gốc bàng sạch, ghế đá lại đông vui như xưa.", 7],
    ] },
  { nb: "khu-cho-ba-chieu", cat: "giup_do_san_se", loc: "Cổng sau chợ Bà Chiểu",
    desc: "Cô chú bán hàng dọn khuya một mình, nặng tay lắm.",
    status: "voting", days: 1, px: 70, py: 60,
    s: [
      ["Cô Út bún riêu", "Đi ngang thấy cô chú dọn hàng, phụ một tay cho chóng xong nha.", 31],
      ["Anh Tài ba gác", "Chở giùm nhau thùng hàng, chợ mình khuya mấy cũng ấm.", 15],
    ] },
  { nb: "hem-51-cao-thang", cat: "tre_con_trong_xom", loc: "Sân banh mini hẻm 51",
    desc: "Tụi nhỏ đá banh giờ tan tầm, xe về hay lách qua sân.",
    status: "voting", days: 3, px: 45, py: 55,
    s: [
      ["Chị Hằng", "Giờ tụi nhỏ đá banh, mình dắt xe đi vòng cửa sau giùm nha.", 42],
      ["Bé Na (lớp 8)", "Tan trận nhớ gom banh gom áo, sân sạch mai đá tiếp.", 20],
      ["Thầy Phong", "Cổ vũ nhỏ tiếng chút nha, nhà bác Hai có em bé mới sinh.", 6],
    ] },
  { nb: "phuong-ben-thanh", cat: "van_minh_tu_te", loc: "Vỉa hè Lê Thánh Tôn",
    desc: "Giờ tan tầm xe máy hay leo lề, người đi bộ né không kịp.",
    status: "voting", days: 4, px: 25, py: 25,
    s: [
      ["Thầy Phong", "Kẹt xe chút xíu thôi, đừng leo lề — nhường lối cho ông bà đi bộ.", 12],
      ["Anh Khoa Grab", "Chậm một phút không trễ đâu, vỉa hè là của đôi chân.", 5],
    ] },
  { nb: "xom-lo-gom", cat: "song_vui_co_ich", loc: "Đình Xóm Lò Gốm",
    desc: "Chiều cuối tuần các cụ ra chơi cờ, thiếu người châm trà tiếp nước.",
    status: "voting", days: 7, px: 60, py: 45,
    s: [
      ["Ông Năm cờ tướng", "Ghé đình làm ván cờ với các cụ, vui cả buổi chiều đó nghen.", 8],
    ] },
  { nb: "hem-200-xom-chieu", cat: "khoe_moi_ngay", loc: "Cầu thang khu B Xóm Chiếu",
    desc: "Cầu thang dốc, các cô lớn tuổi lên xuống hay mỏi gối.",
    status: "waiting", days: 0, px: 35, py: 65 },
  { nb: "xom-vuon-lai", cat: "xom_xanh_sach", loc: "Bãi đất trống Vườn Lài",
    desc: "Bãi trống đầu xóm ai cũng tiếc, muốn rủ nhau trồng rau chung.",
    status: "waiting", days: 1, px: 50, py: 20 },
  { nb: "phuong-hanh-thong", cat: "tre_con_trong_xom", loc: "Cổng trường mẫu giáo Hạnh Thông",
    desc: "Giờ đón bé, xe đậu kín cổng, các con chạy ra khó thấy đường.",
    status: "voting", days: 6, px: 40, py: 35,
    s: [
      ["Bé Na (lớp 8)", "Đón em đậu xe lùi ra chút, chừa cổng cho tụi nhỏ ùa ra.", 16],
      ["Cô Nhung hàng nước", "Tắt máy chờ bé, cổng trường bớt khói bớt ồn.", 11],
    ] },
  { nb: "phuong-da-kao", cat: "giup_do_san_se", loc: "Chung cư cũ Đa Kao",
    desc: "Thang máy hư lên hư xuống, cô chú tầng cao xách đồ cực.",
    status: "voting", days: 8, px: 65, py: 50,
    s: [
      ["Anh Tài ba gác", "Thang máy hư, gặp cô chú xách nặng thì mình xách tiếp một đoạn nha.", 6],
    ] },
  { nb: "cu-xa-thanh-da", cat: "song_vui_co_ich", loc: "Bờ sông Lô B Thanh Đa",
    desc: "Chiều nào bờ sông cũng đông, rủ nhau giữ chỗ ngồi sạch đẹp.",
    status: "signed", days: 18, px: 20, py: 70,
    s: [["Chú Tư sửa xe", "Ngồi hóng gió xong, mang rác về giùm — bờ sông đẹp là của chung.", 38, true]] },
  { nb: "khu-cho-ba-chieu", cat: "van_minh_tu_te", loc: "Lối vào chợ Bà Chiểu",
    desc: "Lối vào hẹp, người mua kẻ bán chen nhau dễ cáu.",
    status: "signed", days: 22, px: 75, py: 30,
    s: [["Cô Út bún riêu", "Chợ đông, nhường nhau nửa bước — mua bán cả ngày vui.", 29, true]] },
  { nb: "phuong-cau-ong-lanh", cat: "giup_do_san_se", loc: "Dãy nhà ven kênh Cầu Ông Lãnh",
    desc: "Mùa mưa nước lên nhanh, nhà thấp cần người báo giùm.",
    status: "waiting", days: 2, px: 30, py: 55 },
  { nb: "xom-chua-tan-quy", cat: "khoe_moi_ngay", loc: "Sân chùa Tân Quy",
    desc: "Nhóm đi bộ sáng sớm hay tụ ở sân chùa, người mới ngại tham gia.",
    status: "voting", days: 9, px: 45, py: 25,
    s: [
      ["Cô Nhung hàng nước", "Đi bộ ngang sân chùa, vẫy tay rủ thêm một người cho vui chân.", 22],
      ["Dì Sáu", "Hít thở sâu, cười một cái — sáng nào cũng là sáng đẹp.", 10],
    ] },
  { nb: "hem-160-bui-dinh-tuy", cat: "tre_con_trong_xom", loc: "Ngã ba hẻm 160 Bùi Đình Tuý",
    desc: "Ngã ba khuất, tụi nhỏ đạp xe hay giật mình vì xe máy.",
    status: "voting", days: 10, px: 55, py: 60,
    s: [
      ["Chị Hằng", "Tới ngã ba bóp kèn nhẹ một tiếng, tụi nhỏ biết đường mà tránh.", 14],
    ] },
  { nb: "phuong-vo-thi-sau", cat: "xom_xanh_sach", loc: "Công viên nhỏ Võ Thị Sáu",
    desc: "Ghế đá công viên bị chiếm làm chỗ để đồ, người già hết chỗ ngồi.",
    status: "waiting", days: 3, px: 60, py: 40 },
  { nb: "xom-dinh-an-nhon", cat: "song_vui_co_ich", loc: "Sân đình An Nhơn",
    desc: "Sân đình rộng mà tối nào cũng vắng, muốn có góc sinh hoạt chung.",
    status: "signed", days: 26, px: 50, py: 50,
    s: [["Dì Sáu", "Tối thứ bảy ra sân đình chơi chung, già trẻ gì cũng có ghế.", 51, true]] },
  { nb: "phuong-phu-nhuan", cat: "van_minh_tu_te", loc: "Ngã tư Phan Xích Long",
    desc: "Kẹt xe là bấm kèn inh ỏi, nhà mặt tiền mệt lắm.",
    status: "voting", days: 0, px: 35, py: 30,
    s: [
      ["Anh Khoa Grab", "Kèn to không làm đường ngắn lại — thả lỏng tay, tới lượt sẽ đi.", 19],
      ["Thầy Phong", "Đèn đỏ vài giây, đủ cười với người kế bên một cái.", 8],
    ] },
];

const FULL_4N = JSON.stringify({ nhac: true, nho: true, nho2: true, nhe: true });

async function ev(userId, type, points, ref, daysAgo) {
  await client.query(
    `INSERT INTO score_events (user_id, type, points, ref_id, created_at)
     VALUES ($1,$2,$3,$4, now() - interval '${daysAgo} days')`,
    [userId, type, points, ref]
  );
}

let nIssues = 0, nSuggs = 0, nVotes = 0;
for (const spec of ISSUES) {
  const nbId = need(spec.nb);
  // Idempotent: (khu phố, location_text) đã có → bỏ qua trọn bộ
  const dup = await client.query(
    `SELECT 1 FROM issues WHERE neighborhood_id = $1 AND location_text = $2`,
    [nbId, spec.loc]
  );
  if (dup.rowCount > 0) continue;

  const firstAuthor = spec.s?.length ? AUTHORS[spec.s[0][0]] : AUTHORS["Dì Sáu"];
  const days = spec.days;
  const issueRes = await client.query(
    `INSERT INTO issues (neighborhood_id, category, location_text, description, status,
       proposed_by, pin_x, pin_y, created_at, approved_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8, now() - interval '${days + 1} days',
       now() - interval '${days} days') RETURNING id`,
    [nbId, spec.cat, spec.loc, spec.desc, spec.status, firstAuthor, spec.px, spec.py]
  );
  const issueId = issueRes.rows[0].id;
  nIssues += 1;
  await ev(firstAuthor, "issue_approved", 2, issueId, days);

  for (const [authorName, content, voteCount, installed] of spec.s ?? []) {
    const author = AUTHORS[authorName];
    const status = installed ? "installed" : "approved";
    const installedDays = Math.max(days - 4, 1);
    const suggRes = await client.query(
      `INSERT INTO suggestions (issue_id, author_id, content, status, review_4n,
         created_at, approved_at, installed_at, installed_date)
       VALUES ($1,$2,$3,$4,$5, now() - interval '${days + 1} days', now() - interval '${days} days',
         ${installed ? `now() - interval '${installedDays} days'` : "NULL"},
         ${installed ? `(now() - interval '${installedDays} days')::date` : "NULL"})
       RETURNING id`,
      [issueId, author, content, status, FULL_4N]
    );
    const suggId = suggRes.rows[0].id;
    nSuggs += 1;
    await ev(author, "suggestion_approved", 5, suggId, days);
    if (installed) await ev(author, "sign_installed", 30, suggId, Math.max(days - 4, 1));

    for (let k = 0; k < voteCount && k < voters.length; k++) {
      const voteDays = (k % 9) + 1;
      await client.query(
        `INSERT INTO votes (suggestion_id, user_id, created_at)
         VALUES ($1,$2, now() - interval '${voteDays} days')
         ON CONFLICT (suggestion_id, user_id) DO NOTHING`,
        [suggId, voters[k]]
      );
      await ev(author, "vote_received", 1, suggId, voteDays);
      nVotes += 1;
    }
  }
}

await client.query("COMMIT");
await client.end();

if (nIssues === 0) {
  console.log("✔ Không có gì để thêm — toàn bộ góc phố bổ sung đã tồn tại (chạy lại an toàn).");
} else {
  console.log(`✔ Seed bổ sung xong: ${nIssues} góc phố · ${nSuggs} câu nhắc · ${nVotes} lượt thương`);
  console.log("  Sinh ảnh mock cho góc phố/biển mới: pnpm seed:images");
}
