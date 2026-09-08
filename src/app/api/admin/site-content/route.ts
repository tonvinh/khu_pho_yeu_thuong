// Module admin "Nội dung" — sửa text trang chủ (hero, khối đóng góp, khối biển,
// khối ưu đãi, chân trang). GET trả mặc định + ghi đè hiện tại; PATCH nhận các field
// text: giá trị rỗng hoặc trùng mặc định → XOÁ ghi đè (quay về copy gốc).
// 4/9 (QC · D3): bỏ 4 khoá campaign_* và route ./kv — khối TVC/KV không còn trên site.
// 8/9 (QC): thêm nhóm `counters` — ghi đè 3 con số ở hero. Lưu cùng bảng site_content
// (khoá `counter_*`, xem lib/counters.ts) nên PATCH dùng chung cơ chế "rỗng → xoá hàng".
// Audit: site_content_update (detail = các key đã đổi).
import { NextRequest, NextResponse } from "next/server";
import { q } from "@/lib/db";
import { jsonError, requireAdmin } from "@/lib/api";
import {
  COUNTER_FIELDS,
  COUNTER_KEYS,
  COUNTER_MAX,
  getCounterOverrides,
  getRealCounters,
  resetCountersCache,
  type CounterKey,
} from "@/lib/counters";
import {
  getSiteOverrides,
  SITE_CONTENT_DEFAULTS,
  SITE_TEXT_KEYS,
} from "@/lib/site-content";

export const dynamic = "force-dynamic";

const MAX_LEN = 1000;

async function payload() {
  const [over, real, counterOver] = await Promise.all([
    getSiteOverrides(),
    getRealCounters(),
    getCounterOverrides(),
  ]);
  return {
    defaults: SITE_CONTENT_DEFAULTS,
    overrides: Object.fromEntries(SITE_TEXT_KEYS.map((k) => [k, over[k] || ""])),
    counters: {
      // Số đếm thật → hiện làm placeholder ("để trống thì trang chủ ra số này")
      real,
      // "" = đang tự đếm
      overrides: Object.fromEntries(
        COUNTER_FIELDS.map((f) => [f, counterOver[f] === null ? "" : String(counterOver[f])])
      ) as Record<CounterKey, string>,
    },
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;
  return NextResponse.json(await payload());
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return jsonError(400, "Body không hợp lệ");

  const changes: Array<{ key: string; value: string | null }> = [];
  for (const key of SITE_TEXT_KEYS) {
    if (!(key in body)) continue;
    const raw = body[key];
    if (typeof raw !== "string") return jsonError(400, `Trường ${key} phải là chuỗi`);
    let value = raw.trim();
    if (value.length > MAX_LEN) return jsonError(400, `Trường ${key} tối đa ${MAX_LEN} ký tự`);
    changes.push({ key, value: value && value !== SITE_CONTENT_DEFAULTS[key] ? value : null });
  }

  // Nhóm `counters`: ô rỗng → xoá ghi đè (quay về đếm thật); có số → lưu nguyên số
  const rawCounters = body.counters;
  let touchedCounters = false;
  if (rawCounters !== undefined) {
    if (typeof rawCounters !== "object" || rawCounters === null || Array.isArray(rawCounters))
      return jsonError(400, "Trường counters phải là object");
    const cb = rawCounters as Record<string, unknown>;
    for (const field of COUNTER_FIELDS) {
      if (!(field in cb)) continue;
      const raw = cb[field];
      if (typeof raw !== "string" && typeof raw !== "number")
        return jsonError(400, `Con số ${field} phải là chuỗi hoặc số`);
      const value = String(raw).trim();
      if (value === "") {
        changes.push({ key: COUNTER_KEYS[field], value: null });
      } else {
        const n = Number(value);
        if (!Number.isInteger(n) || n < 0 || n > COUNTER_MAX)
          return jsonError(400, `Con số phải là số nguyên từ 0 đến ${COUNTER_MAX}`);
        changes.push({ key: COUNTER_KEYS[field], value: String(n) });
      }
      touchedCounters = true;
    }
  }

  if (changes.length === 0) return jsonError(400, "Không có trường nào để lưu");

  // Mỗi key độc lập, số lượng nhỏ — ghi tuần tự, không cần transaction
  for (const c of changes) {
    if (c.value === null) await q(`DELETE FROM site_content WHERE key = $1`, [c.key]);
    else
      await q(
        `INSERT INTO site_content (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
        [c.key, c.value]
      );
  }
  // Bộ đếm cache 15s trong tiến trình — xoá ngay để trang chủ đổi số tức thì
  if (touchedCounters) resetCountersCache();

  await q(
    `INSERT INTO audit_logs (admin_user_id, action, detail) VALUES ($1, 'site_content_update', $2)`,
    [auth.admin.id, JSON.stringify({ keys: changes.map((c) => c.key) })]
  );

  return NextResponse.json(await payload());
}
