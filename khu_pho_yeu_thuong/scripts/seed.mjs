// Seed data demo theo 06-CONTENT-COPY §5 — điểm khớp CHÍNH XÁC công thức 05-SCORING-RULES.
// Bà Liên 82đ (2+5+45+30) · Anh Dũng 77đ (0+15+32+30) · Chú Ba 41đ (0+10+31)
// · Cô Tám 34đ (2+5+27) · Minh 21đ (4+5+12) · Hương 18đ · Cô Bảy 6đ
// Counters: 2 biển đã treo · 5 góc xóm đang chờ · 7 người đóng góp · 5 khu phố.
// GHI CHÚ: vài con số hiển thị trong design (VD "52 lượt thương") không khớp công thức
// điểm đã duyệt — seed ưu tiên CÔNG THỨC (test case 05 §4 là nguồn sự thật).
import pg from "pg";
import { createHmac, randomBytes } from "node:crypto";
import { hash as argonHash } from "@node-rs/argon2";

try { process.loadEnvFile(".env"); } catch { /* env đã có */ }

const PEPPER = process.env.PHONE_PEPPER || "dev-only-pepper-khong-dung-cho-production";
const DATABASE_URL =
  process.env.DATABASE_URL || "postgres://khupho:khupho_dev@localhost:5432/khupho";

const phoneHash = (p) => createHmac("sha256", PEPPER).update(p).digest("hex");
const slug = () => randomBytes(16).toString("base64url").replace(/[-_]/g, "").slice(0, 10).toLowerCase();

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();

const existing = await client.query("SELECT count(*)::int AS n FROM neighborhoods");
if (existing.rows[0].n > 0) {
  console.log("DB đã có dữ liệu — bỏ qua seed (xoá dữ liệu trước nếu muốn seed lại).");
  await client.end();
  process.exit(0);
}

await client.query("BEGIN");

// ===== Khu phố (5) =====
async function nb(name, ward, district, city, s) {
  const r = await client.query(
    `INSERT INTO neighborhoods (name, ward, district, city, slug) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    [name, ward, district, city, s]
  );
  return r.rows[0].id;
}
const banCo = await nb("Phường Bàn Cờ", "Phường Bàn Cờ", "Quận 3", "TP. Hồ Chí Minh", "phuong-ban-co");
const leLoi = await nb("Phường Lê Lợi", "Phường Lê Lợi", "Quận 1", "TP. Hồ Chí Minh", "phuong-le-loi");
const xomMoi = await nb("Hẻm chợ Xóm Mới", "Phường 12", "Gò Vấp", "TP. Hồ Chí Minh", "hem-cho-xom-moi");
const tanDinh = await nb("Phường Tân Định", "Phường Tân Định", "Quận 1", "TP. Hồ Chí Minh", "phuong-tan-dinh");
await nb("Xóm Đình An Nhơn", "Phường An Nhơn", "Gò Vấp", "TP. Hồ Chí Minh", "xom-dinh-an-nhon");

// ===== Cư dân =====
let phoneSeq = 0;
async function user(name, nbId) {
  phoneSeq += 1;
  const phone = `+8490${String(1000000 + phoneSeq).slice(-7)}`;
  const r = await client.query(
    `INSERT INTO users (phone_hash, display_name, share_slug, neighborhood_id)
     VALUES ($1,$2,$3,$4) RETURNING id`,
    [phoneHash(phone), name, slug(), nbId]
  );
  return r.rows[0].id;
}
const baLien = await user("Bà Liên", xomMoi);
const anhDung = await user("Anh Dũng", banCo);
const chuBa = await user("Chú Ba xe ôm", leLoi);
const coTam = await user("Cô Tám tạp hoá", leLoi);
const minh = await user("Minh (lớp 11)", leLoi);
const huong = await user("Hương", leLoi);
const coBay = await user("Cô Bảy", leLoi);

// Cư dân chỉ bình chọn (không tính vào bộ đếm "người đóng góp")
const voters = [];
for (let i = 1; i <= 50; i++) voters.push(await user(`Cư dân ${i}`, leLoi));

// ===== Vấn đề =====
async function issue(opts) {
  const days = opts.approvedDaysAgo ?? 10;
  const r = await client.query(
    `INSERT INTO issues (neighborhood_id, category, location_text, description, status,
       proposed_by, pin_x, pin_y, created_at, approved_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8, now() - interval '${days + 1} days',
       now() - interval '${days} days') RETURNING id`,
    [opts.nb, opts.cat, opts.loc, opts.desc, opts.status, opts.by, opts.px ?? null, opts.py ?? null]
  );
  return r.rows[0].id;
}

const i1 = await issue({ nb: leLoi, cat: "toc_do", loc: "Hẻm 42 Lê Lợi",
  desc: "Xe hay phóng nhanh đoạn cua, gần chỗ trẻ con chơi.", status: "voting", by: coTam, px: 35, py: 60 });
const i2 = await issue({ nb: leLoi, cat: "trom_cap", loc: "Ngõ 7 Trần Phú",
  desc: "Dạo này hay mất đồ vặt để trước cửa.", status: "voting", by: coBay, px: 62, py: 30 });
const i3 = await issue({ nb: tanDinh, cat: "phong_chay", loc: "Khu trọ 88 Hai Bà Trưng",
  desc: "Khu trọ đông người, nhiều xe sạc qua đêm.", status: "voting", by: minh, px: 48, py: 72 });
const i4 = await issue({ nb: xomMoi, cat: "ve_sinh", loc: "Cuối hẻm chợ Xóm Mới",
  desc: "Góc cuối hẻm hay bị bỏ rác không đúng giờ.", status: "signed", by: baLien, px: 70, py: 55, approvedDaysAgo: 20 });
const i5 = await issue({ nb: leLoi, cat: "giup_nhau", loc: "Ngách 12/3 Nguyễn Du",
  desc: "Nhiều cô chú lớn tuổi sống một mình, cần xóm để ý giúp nhau.", status: "waiting", by: coBay, px: 20, py: 40 });
const i6 = await issue({ nb: leLoi, cat: "nguoi_gia", loc: "Đầu ngõ 7 Trần Phú",
  desc: "Ông bà hay đi bộ buổi chiều, xe ra vào đông.", status: "voting", by: minh, px: 80, py: 20 });
const i7 = await issue({ nb: banCo, cat: "chieu_sang", loc: "Ngách 5 Bàn Cờ",
  desc: "Đoạn giữa ngách tối, buổi tối khó thấy đường.", status: "signed", by: coBay, px: 55, py: 45, approvedDaysAgo: 25 });

// ===== Câu nhắc =====
const FULL_4N = JSON.stringify({ nhac: true, nho: true, nho2: true, nhe: true });
async function sugg(issueId, author, content, status, daysAgo = 8) {
  const installedDays = Math.max(daysAgo - 4, 1);
  const installedSql = status === "installed"
    ? `now() - interval '${installedDays} days'`
    : "NULL";
  const installedDateSql = status === "installed"
    ? `(now() - interval '${installedDays} days')::date`
    : "NULL";
  const r = await client.query(
    `INSERT INTO suggestions (issue_id, author_id, content, status, review_4n,
       created_at, approved_at, installed_at, installed_date)
     VALUES ($1,$2,$3,$4,$5, now() - interval '${daysAgo + 1} days', now() - interval '${daysAgo} days',
       ${installedSql}, ${installedDateSql})
     RETURNING id`,
    [issueId, author, content, status, FULL_4N]
  );
  return r.rows[0].id;
}

const s1 = await sugg(i1, coTam, "Đi chậm chút nha, trong hẻm có đứa nhỏ đang chơi.", "approved");
const s2 = await sugg(i1, minh, "Hẻm nhỏ, lòng người thì rộng — chạy chậm giùm nhau.", "approved");
const s3 = await sugg(i2, anhDung, "Khoá cửa cẩn thận nha, đi đâu cũng an tâm hơn.", "approved");
const s4 = await sugg(i2, chuBa, "Thấy người lạ, mình hỏi thăm một câu cho ấm ngõ.", "approved");
const s5 = await sugg(i3, anhDung, "Ra khỏi phòng nhớ tắt bếp, cả khu trọ ngủ ngon.", "approved");
const s6 = await sugg(i3, chuBa, "Sạc xe chỗ thoáng, ngủ ngon cả xóm trọ mình.", "approved");
const s7 = await sugg(i4, baLien, "Bỏ rác đúng chỗ một chút, khu mình thơm cả ngày.", "installed", 15);
const s8 = await sugg(i6, huong, "Ông bà đi chậm, mình chờ chút một — ngõ mình đâu có vội.", "approved");
const s9 = await sugg(i7, anhDung, "Bật giùm bóng đèn trước ngõ, tối về ai cũng thấy đường.", "installed", 12);

// ===== Lượt thương (mỗi vote = 1 event vote_received cho tác giả) =====
async function votesFor(suggId, author, count) {
  for (let k = 0; k < count && k < voters.length; k++) {
    const voter = voters[k];
    await client.query(
      `INSERT INTO votes (suggestion_id, user_id, created_at)
       VALUES ($1,$2, now() - interval '${(k % 7) + 1} days')`,
      [suggId, voter]
    );
    await client.query(
      `INSERT INTO score_events (user_id, type, points, ref_id, created_at)
       VALUES ($1,'vote_received',1,$2, now() - interval '${(k % 7) + 1} days')`,
      [author, suggId]
    );
  }
}
await votesFor(s1, coTam, 27);
await votesFor(s2, minh, 12);
await votesFor(s3, anhDung, 10);
await votesFor(s4, chuBa, 21);
await votesFor(s5, anhDung, 10);
await votesFor(s6, chuBa, 10);
await votesFor(s7, baLien, 45);
await votesFor(s8, huong, 13);
await votesFor(s9, anhDung, 12);

// ===== Sổ cái điểm: đề xuất duyệt (+2), câu duyệt (+5), biển treo (+30) =====
async function ev(userId, type, points, ref, daysAgo = 8) {
  await client.query(
    `INSERT INTO score_events (user_id, type, points, ref_id, created_at)
     VALUES ($1,$2,$3,$4, now() - interval '${daysAgo} days')`,
    [userId, type, points, ref]
  );
}
// issue_approved — trần 3/tuần: các đề xuất seed nằm ở tuần cũ, đều được +2
await ev(coTam, "issue_approved", 2, i1, 10);
await ev(coBay, "issue_approved", 2, i2, 10);
await ev(minh, "issue_approved", 2, i3, 10);
await ev(baLien, "issue_approved", 2, i4, 20);
await ev(coBay, "issue_approved", 2, i5, 10);
await ev(minh, "issue_approved", 2, i6, 10);
await ev(coBay, "issue_approved", 2, i7, 25);
// suggestion_approved +5
for (const [uid, sid] of [
  [coTam, s1], [minh, s2], [anhDung, s3], [chuBa, s4], [anhDung, s5],
  [chuBa, s6], [baLien, s7], [huong, s8], [anhDung, s9],
]) await ev(uid, "suggestion_approved", 5, sid);
// sign_installed +30
await ev(baLien, "sign_installed", 30, s7, 11);
await ev(anhDung, "sign_installed", 30, s9, 8);

// ===== Chứng nhận "Khu phố biết thương" — Bàn Cờ 100% biển đã treo =====
await client.query(
  `UPDATE neighborhoods SET certified_4n = true, certified_at = '2026-09-01' WHERE id = $1`,
  [banCo]
);

// ===== Admin demo =====
const adminPass = process.env.SEED_ADMIN_PASSWORD || "KhuPho@2026!Demo";
const passwordHash = await argonHash(adminPass, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
await client.query(
  `INSERT INTO admin_users (email, password_hash) VALUES ($1, $2)
   ON CONFLICT (email) DO NOTHING`,
  ["admin@fpt.com", passwordHash]
);

await client.query("COMMIT");
await client.end();

console.log("✔ Seed xong: 5 khu phố · 7 vấn đề · 9 câu nhắc · sổ cái điểm khớp 05-SCORING-RULES");
console.log(`✔ Admin demo: admin@fpt.com / ${adminPass}`);
console.log("  (đổi mật khẩu bằng: pnpm create-admin <email@fpt.com> <mật khẩu mới>)");
