// Tạo tài khoản admin (super-admin tạo thủ công — không có form tự đăng ký, 04 §0)
// Cách dùng: pnpm create-admin <email@fpt.com> <mật khẩu ≥12 ký tự> [--totp]
import { hash } from "@node-rs/argon2";
import { authenticator } from "otplib";
import pg from "pg";

try { process.loadEnvFile(".env"); } catch { /* env đã có (Docker) */ }

const [email, password, flag] = process.argv.slice(2);

if (!email || !password) {
  console.error("Cách dùng: pnpm create-admin <email@fpt.com> <mật khẩu> [--totp]");
  process.exit(1);
}
if (!/^[a-zA-Z0-9._%+-]+@fpt\.com$/.test(email)) {
  console.error("Email admin bắt buộc đuôi @fpt.com (D11)");
  process.exit(1);
}
if (password.length < 12) {
  console.error("Mật khẩu tối thiểu 12 ký tự (04 §0)");
  process.exit(1);
}

const passwordHash = await hash(password, {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
});

let totpSecret = null;
if (flag === "--totp") {
  totpSecret = authenticator.generateSecret();
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
await client.query(
  `INSERT INTO admin_users (email, password_hash, totp_secret)
   VALUES ($1, $2, $3)
   ON CONFLICT (email) DO UPDATE SET password_hash = $2, totp_secret = $3, is_active = true`,
  [email.toLowerCase(), passwordHash, totpSecret]
);
await client.end();

console.log(`✔ Đã tạo/cập nhật admin: ${email}`);
if (totpSecret) {
  console.log(`TOTP secret (thêm vào app authenticator): ${totpSecret}`);
  console.log(`otpauth://totp/KhuPho:${email}?secret=${totpSecret}&issuer=KhuPhoAdmin`);
}
