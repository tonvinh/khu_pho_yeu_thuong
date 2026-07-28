"use client";
// Chống gian lận (04 §7) — mọi hành động IM LẶNG, không đổi UI phía người dùng
import { useCallback, useEffect, useState } from "react";
import { apiGet, apiSend } from "@/components/client-api";
import { Btn, Card } from "@/components/admin/AdminShell";

interface FraudData {
  ipClusters: Array<{ ip_hash: string; accounts: number; names: string[]; user_ids: string[] }>;
  burstTargets: Array<{ author_id: string; display_name: string; votes_from_new_accounts: number }>;
  fastVoters: Array<{ user_id: string; display_name: string; is_shadow_banned: boolean; votes_last_hour: number }>;
}

export default function FraudPage() {
  const [d, setD] = useState<FraudData | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    apiGet<FraudData>("/api/admin/fraud").then(setD).catch(() => {});
  }, []);
  useEffect(load, [load]);

  const act = async (action: string, userId: string) => {
    try {
      await apiSend("POST", "/api/admin/fraud", { action, user_id: userId });
      setMsg("Đã xử lý (im lặng — người dùng không được thông báo)");
      load();
    } catch (e) { setMsg(e instanceof Error ? e.message : "Có lỗi"); }
  };

  if (!d) return <p className="text-ink-soft">Đang tải…</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold">Chống gian lận (xử lý im lặng)</h1>
      {msg && <p className="rounded-xl bg-white px-3 py-2 text-sm shadow-sm">{msg}</p>}

      <Card title="Cụm tài khoản cùng IP (24h, ≥3 tài khoản)">
        {d.ipClusters.length === 0 && <p className="text-sm text-ink-soft">Không có cảnh báo.</p>}
        {d.ipClusters.map((c) => (
          <div key={c.ip_hash} className="mb-2 rounded-xl bg-cream px-3 py-2 text-sm">
            <strong>{c.accounts} tài khoản</strong> cùng IP:{" "}
            <span className="text-ink-soft">{c.names.join(", ")}</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {c.user_ids.map((uid, i) => (
                <Btn key={uid} variant="outline" onClick={() => act("shadow_ban", uid)}>
                  Shadow-ban {c.names[i]}
                </Btn>
              ))}
            </div>
          </div>
        ))}
      </Card>

      <Card title="Nhận thương hàng loạt từ tài khoản mới (<48h)">
        {d.burstTargets.length === 0 && <p className="text-sm text-ink-soft">Không có cảnh báo.</p>}
        {d.burstTargets.map((t) => (
          <div key={t.author_id} className="mb-2 flex items-center gap-2 rounded-xl bg-cream px-3 py-2 text-sm">
            <strong>{t.display_name}</strong>
            <span className="text-ink-soft">nhận {t.votes_from_new_accounts} thương từ tài khoản mới</span>
            <span className="ml-auto">
              <Btn variant="danger" onClick={() => act("shadow_ban", t.author_id)}>Shadow-ban</Btn>
            </span>
          </div>
        ))}
      </Card>

      <Card title="Tốc độ vote bất thường (≥20 phiếu/giờ)">
        {d.fastVoters.length === 0 && <p className="text-sm text-ink-soft">Không có cảnh báo.</p>}
        {d.fastVoters.map((v) => (
          <div key={v.user_id} className="mb-2 flex items-center gap-2 rounded-xl bg-cream px-3 py-2 text-sm">
            <strong>{v.display_name}</strong>
            <span className="text-ink-soft">{v.votes_last_hour} phiếu trong 1 giờ</span>
            {v.is_shadow_banned && <span className="text-xs font-bold text-status-waiting">đã shadow-ban</span>}
            <span className="ml-auto flex gap-1.5">
              <Btn variant="outline" onClick={() => act("invalidate_votes", v.user_id)}>Vô hiệu phiếu</Btn>
              {v.is_shadow_banned ? (
                <Btn variant="ghost" onClick={() => act("unban", v.user_id)}>Bỏ ban</Btn>
              ) : (
                <Btn variant="danger" onClick={() => act("shadow_ban", v.user_id)}>Shadow-ban</Btn>
              )}
            </span>
          </div>
        ))}
      </Card>
    </div>
  );
}
