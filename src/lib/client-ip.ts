// Xác định IP thật của cư dân sau chuỗi proxy — pentest 10/2026 lỗi 5.1.1.
//
// Lỗi cũ: lấy phần tử ĐẦU của X-Forwarded-For. Phần tử đầu do CLIENT tự ghi, proxy chỉ NỐI
// thêm vào cuối ("<client tự khai>, <IP thật>, <IP proxy>…") ⇒ đổi header là né mọi rate limit
// theo IP và tách rời cụm "nhiều tài khoản cùng IP" ở màn chống gian lận.
//
// Cách đọc mới — đi từ PHẢI sang (phía proxy của mình), không bao giờ tin phía trái:
//   • TRUSTED_PROXY_HOPS=N (khi hạ tầng biết chắc có N proxy NỐI XFF): lấy phần tử thứ N đếm từ
//     phải — đúng cái proxy ngoài cùng đã thấy.
//   • Không đặt (mặc định): bỏ qua các IP nội bộ/loopback ở cuối (proxy, sidecar, pod) và lấy IP
//     CÔNG KHAI đầu tiên gặp được. Edge nginx luôn nối IP công khai của client vào, nên chuỗi
//     client tự chèn phía trước không bao giờ tới lượt. Toàn bộ là IP nội bộ (truy cập từ mạng
//     trong) ⇒ lấy phần tử PHẢI NHẤT: thà gộp chung bucket còn hơn cho giả IP.
// x-real-ip KHÔNG dùng: proxy không đặt nó thì client tự đặt được, y như XFF.
// Next luôn tự điền XFF bằng IP socket khi request tới mà không có header này.
import { isIP } from "node:net";

/** Bỏ port, ngoặc vuông, zone id và tiền tố IPv4-mapped; trả null nếu không phải IP hợp lệ */
export function normalizeIp(raw: string): string | null {
  let s = raw.trim();
  if (!s) return null;
  const bracket = /^\[([^\]]+)\](?::\d+)?$/.exec(s);
  if (bracket) s = bracket[1];
  else if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(s)) s = s.slice(0, s.lastIndexOf(":"));
  s = s.replace(/%.*$/, "").toLowerCase();
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(s);
  if (mapped) s = mapped[1];
  return isIP(s) ? s : null;
}

/** Mở rộng IPv6 về 8 nhóm 16 bit */
function ipv6Groups(ip: string): number[] {
  let tail: number[] = [];
  let s = ip;
  const v4 = /(\d{1,3}(?:\.\d{1,3}){3})$/.exec(s);
  if (v4) {
    const o = v4[1].split(".").map(Number);
    tail = [(o[0] << 8) | o[1], (o[2] << 8) | o[3]];
    s = s.slice(0, -v4[1].length);
  }
  const [head, rest] = s.split("::");
  const h = head ? head.split(":").filter(Boolean).map((x) => parseInt(x, 16)) : [];
  const r = rest !== undefined && rest ? rest.split(":").filter(Boolean).map((x) => parseInt(x, 16)) : [];
  const fill = 8 - h.length - r.length - tail.length;
  return [...h, ...Array(Math.max(fill, 0)).fill(0), ...r, ...tail];
}

/** IP không thể là IP công khai của cư dân: nội bộ, loopback, link-local, CGNAT, unspecified */
export function isPrivateIp(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    );
  }
  const g = ipv6Groups(ip);
  if (g.every((x) => x === 0)) return true; // ::
  if (g.slice(0, 7).every((x) => x === 0) && g[7] === 1) return true; // ::1
  if ((g[0] & 0xfe00) === 0xfc00) return true; // fc00::/7 ULA
  if ((g[0] & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  return false;
}

/**
 * IP client từ giá trị X-Forwarded-For. `trustedHops` = số proxy NỐI XFF đứng trước app
 * (null/0 = tự dò theo IP nội bộ). Không đọc được gì ⇒ "0.0.0.0".
 */
export function resolveClientIp(xff: string | null | undefined, trustedHops?: number | null): string {
  const chain = (xff || "").split(",").map(normalizeIp).filter((x): x is string => !!x);
  if (chain.length === 0) return "0.0.0.0";

  if (trustedHops && trustedHops > 0) {
    return chain[Math.max(chain.length - trustedHops, 0)];
  }
  for (let i = chain.length - 1; i >= 0; i--) {
    if (!isPrivateIp(chain[i])) return chain[i];
  }
  return chain[chain.length - 1];
}

/**
 * Khoá gom IP cho rate limit / hash chống gian lận. IPv6: một hộ gia đình/thiết bị thường
 * được cấp cả dải /64 nên đổi 64 bit cuối là có "IP mới" miễn phí ⇒ gom theo /64.
 */
export function ipBucket(ip: string): string {
  if (isIP(ip) !== 6) return ip;
  return ipv6Groups(ip).slice(0, 4).map((x) => x.toString(16)).join(":") + "::/64";
}

/** Đọc TRUSTED_PROXY_HOPS; giá trị rác ⇒ null (về chế độ tự dò) */
export function trustedHopsFromEnv(v: string | undefined): number | null {
  if (!v || !/^\d+$/.test(v.trim())) return null;
  const n = Number(v.trim());
  return n > 0 && n <= 10 ? n : null;
}
