"use client";
// Sổ cái điểm (04 §8) — giải trình khi trao giải Đại sứ
import { useEffect, useState } from "react";
import { apiGet } from "@/components/client-api";
import { Card } from "@/components/admin/AdminShell";
import { POINTS } from "@/lib/scoring";

interface UserRow {
  id: string; display_name: string; is_shadow_banned: boolean;
  neighborhood_name: string | null; score: number; event_count: number;
}
interface EventRow {
  id: string; type: keyof typeof POINTS; points: number; is_valid: boolean; created_at: string;
}

const TYPE_LABEL: Record<string, string> = {
  issue_approved: "Đề xuất được duyệt (+2)",
  suggestion_approved: "Câu 4N được duyệt (+5)",
  vote_received: "Lượt thương (+1)",
  sign_installed: "Câu được treo (+30)",
};

export default function ScoresPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [active, setActive] = useState<UserRow | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);

  useEffect(() => {
    apiGet<{ users: UserRow[] }>("/api/admin/scores").then((r) => setUsers(r.users)).catch(() => {});
  }, []);

  const open = async (u: UserRow) => {
    setActive(u);
    const r = await apiGet<{ events: EventRow[] }>(`/api/admin/scores?user=${u.id}`);
    setEvents(r.events);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold">Sổ cái điểm Đại sứ</h1>
      <p className="text-sm text-ink-soft">
        Công thức (05-SCORING-RULES): 2×đề xuất duyệt + 5×câu 4N duyệt + 1×lượt thương + 30×câu treo.
        Điểm = tổng events hợp lệ (append-only, không lưu tổng cứng).
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Xếp hạng (kể cả tài khoản shadow-ban)">
          <div className="space-y-1.5">
            {users.map((u, i) => (
              <button
                key={u.id}
                onClick={() => open(u)}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm ${
                  active?.id === u.id ? "bg-brick-light" : "bg-cream"
                }`}
              >
                <span className="w-6 text-xs font-bold text-ink-soft">{i + 1}</span>
                <span className="font-semibold">{u.display_name}</span>
                {u.is_shadow_banned && (
                  <span className="rounded-full bg-status-waiting/10 px-2 py-0.5 text-[10px] font-bold text-status-waiting">
                    shadow-ban
                  </span>
                )}
                <span className="text-xs text-ink-soft">{u.neighborhood_name || ""}</span>
                <span className="ml-auto font-extrabold text-brick">{u.score}đ</span>
              </button>
            ))}
          </div>
        </Card>
        <Card title={active ? `Chi tiết: ${active.display_name}` : "Chọn một người để xem sổ cái"}>
          <div className="space-y-1">
            {events.map((e) => (
              <div
                key={e.id}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs ${
                  e.is_valid ? "bg-cream" : "bg-status-waiting/5 line-through opacity-60"
                }`}
              >
                <span>{TYPE_LABEL[e.type] || e.type}</span>
                <span className="ml-auto font-bold">{e.points > 0 ? `+${e.points}` : e.points}</span>
                <span className="text-ink-soft">{new Date(e.created_at).toLocaleDateString("vi-VN")}</span>
              </div>
            ))}
            {active && events.length === 0 && <p className="text-sm text-ink-soft">Không có event.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
