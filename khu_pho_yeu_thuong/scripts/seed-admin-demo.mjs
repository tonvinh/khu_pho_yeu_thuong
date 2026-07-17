// Data minh hoạ cho TRANG ADMIN — chạy THÊM sau seed gốc (scripts/seed.mjs).
// Lấp đầy mọi hàng chờ/bảng của admin mà KHÔNG làm lệch số liệu public đã khớp
// 05-SCORING-RULES (issue pending_review + câu submitted/rejected không hiện public;
// selected/produced vẫn được các query public gộp chung với approved):
//   · Duyệt đề xuất: 5 chờ duyệt (4 hợp lệ + 1 đích danh → minh hoạ Từ chối)
//   · Duyệt câu nhắc: 7 câu submitted xen kẽ đạt/không đạt 4N
//   · Biển: 1 câu selected + 1 câu produced (chuyển từ approved sẵn có)
//   · Leads: 7 bản ghi opt-in đủ 2 tầng nguồn, 4 trạng thái
//   · Gian lận: cụm 4 tài khoản cùng IP · 12 thương từ tài khoản mới · 20 phiếu/giờ
//   · Sổ cái: 1 tài khoản shadow-ban với events đã vô hiệu (gạch ngang)
// Idempotent: bỏ qua nếu đã có marker (user "Số Lạ 0908").
import pg from "pg";
import { createCipheriv, createHash, createHmac, randomBytes } from "node:crypto";
import { pathToFileURL } from "node:url";

const PEPPER = process.env.PHONE_PEPPER || "dev-only-pepper-khong-dung-cho-production";
const phoneHash = (p) => createHmac("sha256", PEPPER).update(p).digest("hex");
const sha256 = (s) => createHash("sha256").update(s).digest("hex");
const slug = () => randomBytes(16).toString("base64url").replace(/[-_]/g, "").slice(0, 10).toLowerCase();

/** AES-256-GCM iv(12)|tag(16)|ciphertext — cùng định dạng src/lib/crypto.ts */
function encryptPhone(normalizedPhone) {
  const key = Buffer.from(process.env.PHONE_AES_KEY || "", "base64");
  if (key.length !== 32) throw new Error("PHONE_AES_KEY phải là 32 byte base64 (xem .env.example)");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(normalizedPhone, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), enc]);
}
const maskPhone = (normalized) => {
  const local = normalized.startsWith("+84") ? "0" + normalized.slice(3) : normalized;
  return local.slice(0, 3) + "***" + local.slice(-3);
};

export async function seedAdminDemo(client) {
  const marker = await client.query(`SELECT 1 FROM users WHERE display_name = 'Số Lạ 0908'`);
  if (marker.rowCount > 0) {
    console.log("Data minh hoạ admin đã có — bỏ qua.");
    return;
  }

  // ===== Tra cứu dữ liệu seed gốc (theo tên/vị trí để chạy được trên DB có sẵn) =====
  const nbId = async (s) =>
    (await client.query(`SELECT id FROM neighborhoods WHERE slug = $1`, [s])).rows[0]?.id;
  const userId = async (name) =>
    (await client.query(`SELECT id FROM users WHERE display_name = $1`, [name])).rows[0]?.id;
  const issueId = async (loc) =>
    (await client.query(`SELECT id FROM issues WHERE location_text = $1`, [loc])).rows[0]?.id;

  // Tuần tự — pg.Client không hỗ trợ query song song trên cùng kết nối
  const banCo = await nbId("phuong-ban-co");
  const leLoi = await nbId("phuong-le-loi");
  const xomMoi = await nbId("hem-cho-xom-moi");
  const tanDinh = await nbId("phuong-tan-dinh");
  const baLien = await userId("Bà Liên");
  const coTam = await userId("Cô Tám tạp hoá");
  const minh = await userId("Minh (lớp 11)");
  const huong = await userId("Hương");
  const coBay = await userId("Cô Bảy");
  const cuDan1 = await userId("Cư dân 1");
  const cuDan2 = await userId("Cư dân 2");
  const i1 = await issueId("Hẻm 42 Lê Lợi");
  const i2 = await issueId("Ngõ 7 Trần Phú");
  const i3 = await issueId("Khu trọ 88 Hai Bà Trưng");
  const i5 = await issueId("Ngách 12/3 Nguyễn Du");
  const i6 = await issueId("Đầu ngõ 7 Trần Phú");
  if (!banCo || !leLoi || !baLien || !i1) {
    throw new Error("Chưa có seed gốc — chạy `pnpm seed` trước.");
  }

  await client.query("BEGIN");

  let phoneSeq = 0;
  const newUser = async (name, nb, opts = {}) => {
    phoneSeq += 1;
    const phone = `+84987${String(100000 + phoneSeq).slice(-6)}`;
    const r = await client.query(
      `INSERT INTO users (phone_hash, display_name, share_slug, neighborhood_id, is_shadow_banned, created_at)
       VALUES ($1,$2,$3,$4,$5, now() - ($6 || ' hours')::interval) RETURNING id`,
      [phoneHash(phone), name, slug(), nb, opts.banned ?? false, String(opts.hoursAgo ?? 0)]
    );
    return r.rows[0].id;
  };

  // ===== 1) ĐỀ XUẤT CHỜ DUYỆT (04 §2) — 4 hợp lệ + 1 vi phạm tiêu chí =====
  const pendingIssue = async (nb, cat, loc, desc, by, hoursAgo) => {
    const r = await client.query(
      `INSERT INTO issues (neighborhood_id, category, location_text, description, status, proposed_by, created_at)
       VALUES ($1,$2,$3,$4,'pending_review',$5, now() - ($6 || ' hours')::interval) RETURNING id`,
      [nb, cat, loc, desc, by, String(hoursAgo)]
    );
    return r.rows[0].id;
  };
  await pendingIssue(leLoi, "an_toan_tre_em", "Sân trước Trường Tiểu học Lê Lợi",
    "Giờ tan học xe đông, tụi nhỏ hay băng ra bất ngờ.", coTam, 3);
  await pendingIssue(leLoi, "chieu_sang", "Cuối ngách 3 Lê Lợi",
    "Bóng đèn đầu ngách cháy cả tuần, tối về khó thấy đường.", huong, 8);
  await pendingIssue(tanDinh, "ve_sinh", "Góc chợ Tân Định",
    "Cuối buổi chợ rác dồn một góc, mùi khó chịu cả xóm.", minh, 26);
  await pendingIssue(xomMoi, "giup_nhau", "Dãy trọ 15 hẻm chợ Xóm Mới",
    "Mấy nhà mới chuyển tới chưa quen ai, muốn xóm mình kết nối.", baLien, 50);

  // Tài khoản khả nghi + đề xuất ĐÍCH DANH (vi phạm "Không đích danh người/nhà" → demo Từ chối)
  const soLa = await newUser("Số Lạ 0908", banCo);
  const spamIssue = await pendingIssue(banCo, "trom_cap", "Trước nhà số 12 Ngách 5 Bàn Cờ",
    "Nhà số 12 hay mất đồ, nghi người trong xóm lấy — đề nghị gắn camera theo dõi nhà bên cạnh.", soLa, 1);

  // ===== 2) CÂU NHẮC CHỜ DUYỆT 4N (04 §3) — xen kẽ đạt / không đạt =====
  const quan = await newUser("Quân (khu trọ 88)", tanDinh, { hoursAgo: 30 });
  const submitted = async (issue, author, content, hoursAgo) => {
    const r = await client.query(
      `INSERT INTO suggestions (issue_id, author_id, content, status, created_at)
       VALUES ($1,$2,$3,'submitted', now() - ($4 || ' hours')::interval) RETURNING id`,
      [issue, author, content, String(hoursAgo)]
    );
    return r.rows[0].id;
  };
  await submitted(i1, huong, "Chạy chậm một nhịp, hẻm mình thêm một nhịp cười.", 5);          // đạt 4N
  await submitted(i1, cuDan1, "Hãy nâng cao ý thức chấp hành, xây dựng nếp sống văn minh đô thị.", 12); // trượt Nhắc/Nhở: khẩu hiệu
  await submitted(i2, cuDan2, "CẤM TRỘM CẮP! VI PHẠM SẼ BỊ BÁO CÔNG AN XỬ LÝ NGHIÊM.", 20);  // trượt Nhở/Nhẹ: ra lệnh, doạ
  await submitted(i6, coBay, "Thấy cụ qua đường, mình bước chậm theo một đoạn nha.", 40);     // đạt 4N
  await submitted(i3, quan, "Tắt bếp trước khi ra khỏi phòng nha, cả dãy trọ ngủ ngon.", 2);  // đạt 4N
  await submitted(i5, quan, "Trời sắp mưa, hô nhau cất đồ — một tiếng gọi đỡ cả buổi phơi.", 70); // đạt 4N (issue đang waiting)
  const burstSugg = await submitted(spamIssue, soLa, "Ai lấy đồ nhà số 12 thì tự giác đem trả lại đi!", 4); // trượt Nhẹ: công kích

  // ===== 3) VÒNG ĐỜI BIỂN (04 §4): selected + produced =====
  // Chuyển 2 câu approved sẵn có — public không đổi (query public gộp approved/selected/produced/installed)
  await client.query(
    `UPDATE suggestions SET status = 'selected'
     WHERE content = 'Sạc xe chỗ thoáng, ngủ ngon cả xóm trọ mình.' AND status = 'approved'`
  );
  await client.query(
    `UPDATE suggestions SET status = 'produced', select_note = 'Câu cao phiếu nhất của điểm này'
     WHERE content = 'Thấy người lạ, mình hỏi thăm một câu cho ấm ngõ.' AND status IN ('approved','selected')`
  );

  // ===== 4) LEADS (04 §6) — chỉ bản ghi opted_in; đủ 2 tầng nguồn + 4 trạng thái =====
  const lead = async (opts) => {
    phoneSeq += 1;
    const phone = `+84912${String(100000 + phoneSeq).slice(-6)}`;
    await client.query(
      `INSERT INTO leads (name, phone_encrypted, phone_masked, phone_hash, neighborhood_text,
         interests, source, opted_in, user_id, status, note, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,true,$8,$9,$10, now() - ($11 || ' days')::interval)`,
      [opts.name, encryptPhone(phone), maskPhone(phone), phoneHash(phone), opts.nbText ?? null,
       opts.interests ?? [], opts.source, opts.userId ?? null, opts.status ?? "new",
       opts.note ?? null, String(opts.daysAgo ?? 0)]
    );
  };
  // Tầng 2 — form "Ưu đãi cư dân"
  await lead({ name: "Cô Tám tạp hoá", nbText: "Hẻm 42 Lê Lợi, P. Lê Lợi", interests: ["internet"],
    source: "active_section", userId: coTam, status: "contacted", note: "Hẹn gọi lại tối thứ Năm", daysAgo: 2 });
  await lead({ name: "Chị Hoa (nhà số 5)", nbText: "Ngõ 7 Trần Phú", interests: ["internet_tv"],
    source: "active_section", daysAgo: 0 });
  await lead({ name: "Anh Tuấn", nbText: "Khu trọ 88 Hai Bà Trưng", interests: ["internet", "internet_camera"],
    source: "active_section", status: "converted", note: "Đã lắp Internet + 2 camera", daysAgo: 6 });
  await lead({ name: "Nhà số 7", nbText: "Ngách 5 Bàn Cờ", interests: ["fpt_play"],
    source: "active_section", daysAgo: 1 });
  await lead({ name: "Chú Chín", nbText: "Hẻm chợ Xóm Mới", interests: ["internet"],
    source: "active_section", status: "closed", note: "Đang dùng nhà mạng khác, hẹn dịp sau", daysAgo: 11 });
  // Tầng 1 — checkbox trong drawer viết câu (SĐT lấy từ định danh, không hỏi lại — 02 §7.1)
  await lead({ name: "Bà Liên", interests: [], source: "soft_drawer", userId: baLien,
    status: "contacted", daysAgo: 4 });
  await lead({ name: "Hương", interests: [], source: "soft_drawer", userId: huong, daysAgo: 8 });

  // ===== 5) GIAN LẬN (04 §7) — mọi thứ gắn vào issue pending_review nên KHÔNG hiện public =====
  // 5a. Cụm 4 tài khoản đăng ký cùng IP trong 24h (ngưỡng cảnh báo ≥3)
  const clusterIp = sha256("demo-ip-cluster-203.0.113.7");
  const freshVoters = [];
  for (let i = 1; i <= 12; i++) freshVoters.push(await newUser(`Tài khoản mới ${i}`, banCo, { hoursAgo: i }));
  for (const uid of [soLa, ...freshVoters.slice(0, 3)]) {
    await client.query(
      `INSERT INTO sessions (user_id, token_hash, expires_at, ip_hash)
       VALUES ($1,$2, now() + interval '30 days', $3)`,
      [uid, sha256(`demo-session-${uid}`), clusterIp]
    );
  }
  // 5b. Nhận thương hàng loạt từ tài khoản mới <48h (ngưỡng ≥10): 12 thương cho câu của Số Lạ
  for (const uid of freshVoters) {
    await client.query(
      `INSERT INTO votes (suggestion_id, user_id, created_at)
       VALUES ($1,$2, now() - interval '30 minutes')`,
      [burstSugg, uid]
    );
    // Không ghi score_events: tác giả khả nghi không được cộng điểm trước khi admin xử lý
  }
  // 5c. Tốc độ vote bất thường ≥20 phiếu/giờ: 20 câu spam đã bị từ chối + 1 người bấm liên tục
  const fastVoter = await newUser("Bấm Liên Tục", banCo, { hoursAgo: 2 });
  for (let i = 1; i <= 20; i++) {
    const r = await client.query(
      `INSERT INTO suggestions (issue_id, author_id, content, status, review_note, created_at)
       VALUES ($1,$2,$3,'rejected','Spam hàng loạt — đã từ chối', now() - interval '3 hours') RETURNING id`,
      [spamIssue, soLa, `Câu spam thử nghiệm số ${i} — nội dung trùng lặp.`]
    );
    await client.query(
      `INSERT INTO votes (suggestion_id, user_id, created_at)
       VALUES ($1,$2, now() - interval '${(i * 2) + 1} minutes')`,
      [r.rows[0].id, fastVoter]
    );
  }

  // ===== 6) SỔ CÁI ĐIỂM (04 §8): tài khoản đã shadow-ban, events bị vô hiệu (gạch ngang) =====
  const daXuLy = await newUser("Tài Khoản Ảo (đã xử lý)", banCo, { banned: true, hoursAgo: 24 * 20 });
  const oldSpam = await client.query(
    `INSERT INTO suggestions (issue_id, author_id, content, status, review_note, created_at)
     VALUES ($1,$2,'Nhà nào cũng phải tự giác chấp hành nghiêm chỉnh!','rejected',
       'Giọng ra lệnh, không đạt Nhở/Nhẹ', now() - interval '19 days') RETURNING id`,
    [spamIssue, daXuLy]
  );
  for (let i = 0; i < 12; i++) {
    // Phiếu ảo đã bị admin vô hiệu — is_valid=false ở cả votes lẫn score_events
    await client.query(
      `INSERT INTO votes (suggestion_id, user_id, is_valid, created_at)
       VALUES ($1,$2,false, now() - interval '19 days')`,
      [oldSpam.rows[0].id, freshVoters[i]]
    );
    await client.query(
      `INSERT INTO score_events (user_id, type, points, ref_id, is_valid, created_at)
       VALUES ($1,'vote_received',1,$2,false, now() - interval '19 days')`,
      [daXuLy, oldSpam.rows[0].id]
    );
  }

  await client.query("COMMIT");
  console.log("✔ Data minh hoạ admin: 5 đề xuất chờ · 7 câu chờ 4N · selected/produced · 7 leads · 3 cảnh báo gian lận · 1 shadow-ban");
}

// Chạy trực tiếp: node scripts/seed-admin-demo.mjs
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { process.loadEnvFile(".env"); } catch { /* env đã có */ }
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL || "postgres://khupho:khupho_dev@localhost:5432/khupho",
  });
  await client.connect();
  try {
    await seedAdminDemo(client);
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    await client.end();
  }
}
