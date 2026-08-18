"use client";
// Module "Nội dung" — sửa text/ảnh hiển thị trang chủ. Chỉ lưu GHI ĐÈ: ô bỏ trống →
// dùng nội dung mặc định (copy chuẩn trong src/lib/copy.ts) — nên luôn có nút quay về gốc.
//
// 18/8 (skin mới docs/lp): bộ ô bám theo các khối trong design — hero · khối đóng góp ·
// khối biển (gồm banner khuyến mãi in trên biển) · khối ưu đãi · footer.
// Khối TVC hiện TẠM ẨN khỏi trang chủ nhưng vẫn quản lý được ở đây, và nhận NHIỀU
// link video phát lần lượt (yêu cầu "back up ngầm tool up link video").
import { useCallback, useEffect, useRef, useState } from "react";
import { apiGet, apiSend, apiUpload } from "@/components/client-api";
import { Btn, Card } from "@/components/admin/AdminShell";
import SignCard from "@/components/home/SignCard";

type TextKey =
  | "hero_title" | "hero_body" | "hero_search_placeholder"
  | "board_title" | "board_hint"
  | "signs_title" | "sign_promo_line1" | "sign_promo_line2" | "sign_sale_phone" | "sign_hotline"
  | "lead_title" | "lead_body" | "lead_privacy"
  | "footer_line1" | "footer_line2" | "footer_support" | "footer_tagline"
  | "campaign_title" | "campaign_hint" | "campaign_youtube_ids";

interface ContentPayload {
  defaults: Record<TextKey, string>;
  overrides: Record<TextKey, string>;
  kv_url: string | null;
}

export default function SiteContentPage() {
  const [data, setData] = useState<ContentPayload | null>(null);
  const [form, setForm] = useState<Record<TextKey, string> | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(() => {
    apiGet<ContentPayload>("/api/admin/site-content")
      .then((r) => { setData(r); setForm({ ...r.overrides }); })
      .catch(() => {});
  }, []);
  useEffect(load, [load]);

  const notify = (text: string, ok = true) => {
    setMsg({ text, ok });
    window.setTimeout(() => setMsg(null), 6000);
  };
  const fail = (e: unknown) => notify(e instanceof Error ? e.message : "Có lỗi xảy ra", false);

  const save = async () => {
    if (!form || busy) return;
    setBusy(true);
    try {
      const r = await apiSend<ContentPayload>("PATCH", "/api/admin/site-content", form);
      setData(r);
      setForm({ ...r.overrides });
      notify("Đã lưu nội dung — trang chủ hiển thị bản mới ngay ✓");
    } catch (e) { fail(e); } finally { setBusy(false); }
  };

  const uploadKv = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    try {
      await apiUpload("/api/admin/site-content/kv", fd);
      notify("Đã lưu ảnh KV chiến dịch ✓"); load();
    } catch (e) { fail(e); }
  };
  const deleteKv = async () => {
    try {
      await apiSend("DELETE", "/api/admin/site-content/kv");
      notify("Đã xoá ảnh KV — trang chủ quay về placeholder demo."); load();
    } catch (e) { fail(e); }
  };

  if (!data || !form) return <p className="text-sm text-ink-soft">Đang tải…</p>;

  const val = (key: TextKey) => form[key].trim() || data.defaults[key];

  const field = (key: TextKey, label: string, opts?: { multiline?: boolean; hint?: string }) => {
    const changed = form[key].trim() !== "" && form[key].trim() !== data.defaults[key];
    const common = {
      value: form[key],
      placeholder: data.defaults[key],
      className:
        "mt-1 w-full rounded-xl border border-cream-dark bg-cream px-3 py-2 text-sm" +
        (changed ? " border-brick/60 bg-white" : ""),
    };
    return (
      <label className="block">
        <span className="flex items-baseline justify-between gap-2 text-xs font-bold">
          <span>{label}{changed && <span className="ml-1.5 rounded-full bg-brick/10 px-1.5 py-0.5 text-[10px] font-bold text-brick">đã ghi đè</span>}</span>
          {changed && (
            <button
              onClick={() => setForm({ ...form, [key]: "" })}
              className="text-[11px] font-semibold text-ink-soft underline hover:text-brick"
            >
              ↩ Về mặc định
            </button>
          )}
        </span>
        {opts?.multiline ? (
          <textarea rows={3} {...common} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
        ) : (
          <input {...common} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
        )}
        <span className="mt-1 block text-[11px] leading-4 text-ink-soft">
          {opts?.hint || "Để trống → dùng nội dung mặc định (hiện mờ trong ô)."}
        </span>
      </label>
    );
  };

  // Danh sách video đang có hiệu lực (ô có thể chứa nhiều ID/link, ngăn cách dấu phẩy)
  const videoIds = (form.campaign_youtube_ids.trim() || data.defaults.campaign_youtube_ids)
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const setVideos = (ids: string[]) => setForm({ ...form, campaign_youtube_ids: ids.join(",") });
  const moveVideo = (i: number, dir: -1 | 1) => {
    const next = [...videoIds];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setVideos(next);
  };

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold">📝 Nội dung trang chủ</h1>
          <p className="mt-0.5 text-xs text-ink-soft">
            Sửa lời hiển thị công khai — bản gốc trong copy chuẩn chiến dịch vẫn giữ nguyên,
            xoá ghi đè là quay về.{" "}
            <a href="/" target="_blank" className="underline hover:text-brick">Xem trang chủ ↗</a>
          </p>
        </div>
        <Btn onClick={save} disabled={busy}>{busy ? "Đang lưu…" : "💾 Lưu tất cả"}</Btn>
      </div>

      {msg && (
        <p className={`rounded-xl px-3 py-2 text-sm font-semibold shadow-sm ${
          msg.ok ? "bg-white text-status-signed" : "bg-status-waiting/10 text-status-waiting"
        }`}>
          {msg.text}
        </p>
      )}

      <Card title="Hero đầu trang (nền cam)">
        {field("hero_title", "Tiêu đề lớn (hiển thị IN HOA)")}
        <div className="mt-4">{field("hero_body", "Đoạn mô tả dưới tiêu đề", { multiline: true })}</div>
        <div className="mt-4">
          {field("hero_search_placeholder", "Chữ mờ trong ô tra cứu khu phố", {
            hint: "Ô tìm kiếm nằm dưới KV khu phố — chính là ô tra cứu “Xóm mình đã đạt chuẩn 4N chưa?”.",
          })}
        </div>
      </Card>

      <Card title="Khối “Đóng góp một câu cho khu phố mình nhé”">
        {field("board_title", "Tiêu đề khối")}
        <div className="mt-4">{field("board_hint", "Dòng mô tả dưới tiêu đề")}</div>
      </Card>

      <Card title="Khối “Biển mới của khu phố”">
        {field("signs_title", "Tiêu đề khối")}
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {field("sign_promo_line1", "Banner khuyến mãi — dòng 1")}
          {field("sign_promo_line2", "Banner khuyến mãi — dòng 2")}
          {field("sign_sale_phone", "Số tổng đài bán hàng in trên biển")}
          {field("sign_hotline", "Hotline chăm sóc khách hàng in trên biển")}
        </div>
        <div className="mt-4 rounded-xl border border-cream-dark p-3">
          <span className="text-xs font-bold">Xem trước biển</span>
          <div className="mt-2 max-w-sm">
            <SignCard
              content="Đi chậm chút nha, trong hẻm có đứa nhỏ đang chơi."
              promo={{
                line1: val("sign_promo_line1"),
                line2: val("sign_promo_line2"),
                sale_phone: val("sign_sale_phone"),
                hotline: val("sign_hotline"),
              }}
            />
          </div>
          <span className="mt-2 block text-[11px] text-ink-soft">
            6 biển trên trang chủ lấy 6 câu ĐÃ DUYỆT mới nhất theo ngày duyệt.
          </span>
        </div>
      </Card>

      <Card title="Khối ưu đãi cư dân (lead)">
        {field("lead_title", "Tiêu đề khối")}
        <div className="mt-4">{field("lead_body", "Đoạn mô tả ưu đãi", { multiline: true })}</div>
        <div className="mt-4">
          {field("lead_privacy", "Dòng cam kết bảo mật SĐT (🔒)", {
            multiline: true,
            hint: "Hiện trong tooltip ⓘ cạnh checkbox đồng ý VÀ popup “Tôi muốn nhận ưu đãi”.",
          })}
        </div>
      </Card>

      <Card title="Footer">
        <div className="grid gap-4 md:grid-cols-2">
          {field("footer_line1", "Dòng 1 — giới thiệu chiến dịch")}
          {field("footer_line2", "Dòng 2 — 4N")}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {field("footer_support", "Dòng hỗ trợ kỹ thuật (hotline 1900 6600)")}
          {field("footer_tagline", "Dòng kết cạnh link Chính sách dữ liệu")}
        </div>
      </Card>

      <Card title="Video TVC + KV chiến dịch (khối đang TẠM ẨN khỏi trang chủ)">
        <p className="mb-3 rounded-xl bg-cream px-3 py-2 text-[11.5px] leading-5 text-ink-soft">
          Khối “Câu chuyện Khu phố biết thương” đã được gỡ khỏi trang chủ theo yêu cầu 18/8.
          Nội dung ở đây vẫn lưu bình thường để bật lại ngay khi thiết kế chốt vị trí cho TVC.
          Nhiều video sẽ <b>phát lần lượt</b> theo đúng thứ tự dưới đây.
        </p>

        <span className="text-xs font-bold">Danh sách video (phát lần lượt)</span>
        <div className="mt-2 space-y-2">
          {videoIds.map((id, i) => (
            <div key={`${id}-${i}`} className="flex flex-wrap items-center gap-2 rounded-xl border border-cream-dark bg-cream px-3 py-2">
              <span className="text-xs font-bold text-ink-soft">#{i + 1}</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://i.ytimg.com/vi/${id}/default.jpg`}
                alt=""
                className="h-9 w-16 rounded object-cover"
              />
              <input
                value={id}
                onChange={(e) => {
                  const next = [...videoIds];
                  next[i] = e.target.value.trim();
                  setVideos(next);
                }}
                className="min-w-[180px] flex-1 rounded-lg border border-cream-dark bg-white px-2 py-1.5 text-sm"
              />
              <button onClick={() => moveVideo(i, -1)} disabled={i === 0}
                className="rounded-full border border-cream-dark px-2 py-1 text-xs disabled:opacity-40">↑</button>
              <button onClick={() => moveVideo(i, 1)} disabled={i === videoIds.length - 1}
                className="rounded-full border border-cream-dark px-2 py-1 text-xs disabled:opacity-40">↓</button>
              <button onClick={() => setVideos(videoIds.filter((_, k) => k !== i))}
                className="rounded-full border border-status-waiting px-2 py-1 text-xs font-bold text-status-waiting">Xoá</button>
              <a href={`https://www.youtube.com/watch?v=${id}`} target="_blank" rel="noopener noreferrer"
                className="text-xs underline text-ink-soft hover:text-brick">Mở ↗</a>
            </div>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Btn variant="ghost" onClick={() => setVideos([...videoIds, ""])}>+ Thêm video</Btn>
          <span className="text-[11px] text-ink-soft">
            Dán link youtube.com/watch?v=…, youtu.be/…, shorts/… hoặc ID 11 ký tự — hệ thống tự chuẩn hoá khi lưu.
          </span>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {field("campaign_title", "Tiêu đề khối")}
          {field("campaign_hint", "Dòng mô tả cạnh tiêu đề")}
        </div>

        <div className="mt-4 rounded-xl border border-cream-dark p-3">
          <span className="text-xs font-bold">Ảnh KV chiến dịch (cột trái của khu)</span>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {data.kv_url ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={data.kv_url}
                  alt="KV chiến dịch"
                  className="h-28 rounded-lg border border-cream-dark object-cover"
                />
                <UploadBtn label="🔁 Thay ảnh KV" onFile={uploadKv} />
                <Btn variant="ghost" onClick={deleteKv}>Xoá ảnh</Btn>
              </>
            ) : (
              <>
                <UploadBtn label="🖼 Tải ảnh KV…" onFile={uploadKv} />
                <span className="text-[11px] text-ink-soft">
                  jpg/png/webp ≤ 10MB, giữ nguyên tỷ lệ ảnh gốc.
                </span>
              </>
            )}
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Btn onClick={save} disabled={busy}>{busy ? "Đang lưu…" : "💾 Lưu tất cả"}</Btn>
      </div>
    </div>
  );
}

/* ===== Nút upload file dạng pill (như trang Khu phố) ===== */
function UploadBtn({ label, onFile }: { label: string; onFile: (f: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        className="rounded-full border border-brick px-3.5 py-1.5 text-xs font-bold text-brick"
      >
        {label}
      </button>
    </>
  );
}
