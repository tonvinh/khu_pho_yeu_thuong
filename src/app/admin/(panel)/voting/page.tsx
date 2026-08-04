"use client";
// Theo dõi thương: câu được thương & người được thương — admin sửa được số lượt.
// Tăng = phiếu admin (votes source='admin'); giảm = gỡ phiếu admin trước rồi vô hiệu
// phiếu cư dân mới nhất. Điểm sổ cái đi kèm tự động (API /api/admin/votes).
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet, apiSend } from "@/components/client-api";
import { Btn, Card } from "@/components/admin/AdminShell";
import { Pager, SearchBox, clampPage, useUrlState } from "@/components/admin/table-tools";

interface SuggestionRow {
  id: string; content: string; status: string; created_at: string;
  author_id: string; author_name: string; is_shadow_banned: boolean;
  location_text: string; neighborhood_name: string;
  votes: number; admin_votes: number;
}
interface UserRow {
  id: string; display_name: string; is_shadow_banned: boolean;
  neighborhood_name: string | null; suggestion_count: number;
  votes: number; admin_votes: number;
}

const STATUS_LABEL: Record<string, string> = {
  approved: "Đang nhận thương",
  selected: "Đã chọn",
  produced: "Đã sản xuất",
  installed: "Đã treo",
};

/** Ô số thương + nút sửa inline — dùng chung cho 2 tab */
function VoteEditor({
  votes, adminVotes, onSave,
}: {
  votes: number; adminVotes: number; onSave: (n: number) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(votes));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 0) return;
    setSaving(true);
    try {
      await onSave(n);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <span className="ml-auto flex shrink-0 items-center gap-2">
        <span className="font-extrabold text-brick">💛 {votes}</span>
        {adminVotes > 0 && (
          <span className="rounded-full bg-cream-dark px-2 py-0.5 text-[10px] font-bold text-ink-soft">
            {adminVotes} admin
          </span>
        )}
        <Btn variant="outline" onClick={() => { setValue(String(votes)); setEditing(true); }}>
          Sửa
        </Btn>
      </span>
    );
  }
  return (
    <span className="ml-auto flex shrink-0 items-center gap-1.5">
      <input
        type="number"
        min={0}
        value={value}
        autoFocus
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
        className="w-20 rounded-xl border border-cream-dark px-2 py-1 text-sm font-bold"
      />
      <Btn onClick={save} disabled={saving}>Lưu</Btn>
      <Btn variant="ghost" onClick={() => setEditing(false)}>Huỷ</Btn>
    </span>
  );
}

export default function VotingPage() {
  // Tab / tìm kiếm / trang giữ trên URL để chia sẻ link giữ nguyên trạng thái
  const [ui, setUi] = useUrlState({ tab: "suggestions", q: "", page: "1", per: "20" });
  const tab = ui.tab === "users" ? "users" : "suggestions";
  const search = ui.q;
  const per = Number(ui.per) || 20;
  const [suggestions, setSuggestions] = useState<SuggestionRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    apiGet<{ suggestions: SuggestionRow[]; users: UserRow[] }>("/api/admin/votes")
      .then((r) => { setSuggestions(r.suggestions); setUsers(r.users); })
      .catch(() => {});
  }, []);
  useEffect(load, [load]);

  const save = async (body: { suggestion_id?: string; user_id?: string }, n: number) => {
    try {
      await apiSend("PATCH", "/api/admin/votes", { ...body, votes: n });
      setMsg(null);
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Có lỗi xảy ra");
      throw e;
    }
  };

  const kw = search.trim().toLowerCase();
  const filteredSuggestions = useMemo(
    () => suggestions.filter((s) =>
      !kw ||
      s.content.toLowerCase().includes(kw) ||
      s.author_name.toLowerCase().includes(kw) ||
      s.neighborhood_name.toLowerCase().includes(kw)),
    [suggestions, kw]
  );
  const filteredUsers = useMemo(
    () => users.filter((u) =>
      !kw ||
      u.display_name.toLowerCase().includes(kw) ||
      (u.neighborhood_name || "").toLowerCase().includes(kw)),
    [users, kw]
  );

  // Phân trang client (dữ liệu đã tải sẵn cả danh sách để đếm tổng theo tab)
  const totalRows = tab === "suggestions" ? filteredSuggestions.length : filteredUsers.length;
  const page = clampPage(ui.page, totalRows, per);
  const cut = <T,>(arr: T[]) => arr.slice((page - 1) * per, page * per);
  const pageSuggestions = cut(filteredSuggestions);
  const pageUsers = cut(filteredUsers);
  const pager = (
    <Pager
      page={page}
      per={per}
      total={totalRows}
      onPage={(p) => setUi({ page: String(p) })}
      onPer={(n) => setUi({ per: String(n), page: "1" })}
    />
  );

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold">Theo dõi thương (voting)</h1>
      <p className="text-sm text-ink-soft">
        Sửa số thương: tăng thêm bằng phiếu điều chỉnh của admin, giảm thì gỡ phiếu admin trước
        rồi mới vô hiệu phiếu cư dân mới nhất. Điểm Đại sứ (+1/thương) cập nhật theo sổ cái.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {([["suggestions", `Câu được thương (${suggestions.length})`],
           ["users", `Người được thương (${users.length})`]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setUi({ tab: key, page: "1" })}
            className={`rounded-full px-4 py-1.5 text-sm font-bold ${
              tab === key ? "bg-brick text-white" : "bg-white text-ink hover:bg-cream-dark"
            }`}
          >
            {label}
          </button>
        ))}
        <SearchBox
          value={search}
          onChange={(v) => setUi({ q: v, page: "1" })}
          placeholder="Tìm câu, tên, khu phố…"
          className="ml-auto w-56 !rounded-full !bg-white"
        />
      </div>

      {msg && <p className="rounded-xl bg-status-waiting/10 px-3 py-2 text-sm font-semibold text-status-waiting">{msg}</p>}

      {tab === "suggestions" && (
        <Card title="Câu được thương — sắp theo lượt thương">
          {filteredSuggestions.length === 0 && (
            <p className="text-sm text-ink-soft">Chưa có câu nào được duyệt.</p>
          )}
          <div className="space-y-1.5">
            {pageSuggestions.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-cream px-3 py-2 text-sm">
                <div className="min-w-0 flex-1 basis-64">
                  <p className="font-semibold">“{s.content}”</p>
                  <p className="mt-0.5 text-[11px] text-ink-soft">
                    {s.author_name}
                    {s.is_shadow_banned && <span className="font-bold text-status-waiting"> · shadow-ban</span>}
                    {" · "}{s.neighborhood_name} · {s.location_text}
                    {" · "}{STATUS_LABEL[s.status] || s.status}
                  </p>
                </div>
                <VoteEditor
                  votes={s.votes}
                  adminVotes={s.admin_votes}
                  onSave={(n) => save({ suggestion_id: s.id }, n)}
                />
              </div>
            ))}
          </div>
          <div className="mt-3">{pager}</div>
        </Card>
      )}

      {tab === "users" && (
        <Card title="Người được thương — tổng trên mọi câu của họ">
          {filteredUsers.length === 0 && (
            <p className="text-sm text-ink-soft">Chưa có ai có câu được duyệt.</p>
          )}
          <div className="space-y-1.5">
            {pageUsers.map((u, i) => (
              <div key={u.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-cream px-3 py-2 text-sm">
                <span className="w-6 text-xs font-bold text-ink-soft">{(page - 1) * per + i + 1}</span>
                <div className="min-w-0 flex-1 basis-48">
                  <p className="font-semibold">
                    {u.display_name}
                    {u.is_shadow_banned && (
                      <span className="ml-1.5 rounded-full bg-status-waiting/10 px-2 py-0.5 text-[10px] font-bold text-status-waiting">
                        shadow-ban
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink-soft">
                    {u.neighborhood_name || "Chưa rõ khu phố"} · {u.suggestion_count} câu được duyệt
                  </p>
                </div>
                <VoteEditor
                  votes={u.votes}
                  adminVotes={u.admin_votes}
                  onSave={(n) => save({ user_id: u.id }, n)}
                />
              </div>
            ))}
          </div>
          <div className="mt-3">{pager}</div>
          <p className="mt-3 text-[11px] text-ink-soft">
            Tăng số thương của một người → phiếu admin dồn vào câu cao phiếu nhất của họ;
            giảm → gỡ dần từ phiếu mới nhất trên toàn bộ câu.
          </p>
        </Card>
      )}
    </div>
  );
}
