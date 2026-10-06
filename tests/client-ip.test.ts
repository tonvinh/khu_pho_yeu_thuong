// Pentest 10/2026 — lỗi 5.1.1: X-Forwarded-For giả né rate limit + cụm gian lận cùng IP.
// Khoá: chuỗi client tự chèn phía TRÁI không bao giờ được chọn làm IP.
import { describe, expect, test } from "vitest";
import {
  resolveClientIp, normalizeIp, isPrivateIp, ipBucket, trustedHopsFromEnv,
} from "@/lib/client-ip";

const REAL = "203.113.10.20";

describe("resolveClientIp — chế độ tự dò", () => {
  test("tái hiện request của pentest: XFF giả 127.0.0.4 bị bỏ qua", () => {
    // nginx nối IP thật vào sau giá trị client gửi
    expect(resolveClientIp(`127.0.0.4, ${REAL}`)).toBe(REAL);
    expect(resolveClientIp(`127.0.0.10, ${REAL}`)).toBe(REAL);
  });

  test("giả IP CÔNG KHAI phía trái cũng không ăn", () => {
    expect(resolveClientIp(`8.8.8.8, 1.1.1.1, ${REAL}`)).toBe(REAL);
  });

  test("bỏ qua proxy/sidecar nội bộ ở cuối chuỗi", () => {
    expect(resolveClientIp(`1.2.3.4, ${REAL}, 10.0.3.7, 172.20.0.5, 127.0.0.1`)).toBe(REAL);
    expect(resolveClientIp(`${REAL}, 100.64.1.1, fd00::5`)).toBe(REAL);
  });

  test("edge ghi đè XFF (một phần tử) vẫn đúng", () => {
    expect(resolveClientIp(REAL)).toBe(REAL);
  });

  test("toàn IP nội bộ ⇒ lấy phần tử PHẢI nhất, không lấy phần tử client tự khai", () => {
    expect(resolveClientIp("10.9.9.9, 10.0.0.2, 10.0.0.1")).toBe("10.0.0.1");
    expect(resolveClientIp("::1")).toBe("::1");
  });

  test("rác / rỗng", () => {
    expect(resolveClientIp(null)).toBe("0.0.0.0");
    expect(resolveClientIp("")).toBe("0.0.0.0");
    expect(resolveClientIp("unknown, abc")).toBe("0.0.0.0");
    expect(resolveClientIp(`unknown, ${REAL}`)).toBe(REAL);
  });

  test("IPv6 công khai", () => {
    expect(resolveClientIp("2001:db8::1, 2402:800:6310:1::abcd, fe80::1")).toBe("2402:800:6310:1::abcd");
  });
});

describe("resolveClientIp — TRUSTED_PROXY_HOPS", () => {
  test("lấy phần tử thứ N tính từ phải", () => {
    expect(resolveClientIp(`6.6.6.6, ${REAL}, 10.0.0.1`, 2)).toBe(REAL);
    expect(resolveClientIp(`6.6.6.6, ${REAL}`, 1)).toBe(REAL);
  });
  test("chuỗi ngắn hơn số hop ⇒ phần tử đầu (toàn bộ do proxy ghi)", () => {
    expect(resolveClientIp(REAL, 3)).toBe(REAL);
  });
  test("đọc biến môi trường", () => {
    expect(trustedHopsFromEnv("2")).toBe(2);
    expect(trustedHopsFromEnv(undefined)).toBeNull();
    expect(trustedHopsFromEnv("0")).toBeNull();
    expect(trustedHopsFromEnv("abc")).toBeNull();
    expect(trustedHopsFromEnv("99")).toBeNull();
  });
});

describe("normalizeIp / isPrivateIp / ipBucket", () => {
  test("bỏ port, ngoặc, IPv4-mapped", () => {
    expect(normalizeIp("1.2.3.4:5678")).toBe("1.2.3.4");
    expect(normalizeIp("[2001:db8::1]:443")).toBe("2001:db8::1");
    expect(normalizeIp("::ffff:203.113.10.20")).toBe(REAL);
    expect(normalizeIp("fe80::1%eth0")).toBe("fe80::1");
    expect(normalizeIp("1.2.3")).toBeNull();
  });

  test("dải nội bộ", () => {
    for (const ip of ["10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "127.0.0.4",
      "169.254.1.1", "100.64.0.1", "0.0.0.0", "::1", "::", "fd12::1", "fe80::abcd"]) {
      expect(isPrivateIp(ip), ip).toBe(true);
    }
    for (const ip of [REAL, "172.32.0.1", "100.128.0.1", "8.8.8.8", "2402:800::1", "::ffff:0:1"]) {
      expect(isPrivateIp(ip), ip).toBe(false);
    }
  });

  test("IPv6 gom theo /64 — đổi 64 bit cuối không ra bucket mới", () => {
    expect(ipBucket("2402:800:6310:1::abcd")).toBe(ipBucket("2402:800:6310:1:ffff:1:2:3"));
    expect(ipBucket("2402:800:6310:1::1")).not.toBe(ipBucket("2402:800:6310:2::1"));
    expect(ipBucket(REAL)).toBe(REAL);
  });
});
