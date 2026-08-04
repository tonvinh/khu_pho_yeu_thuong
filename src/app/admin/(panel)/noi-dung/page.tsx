"use client";
// Module "Nội dung" — sửa text/ảnh hiển thị trang chủ: hero (2 dòng tiêu đề + mô tả),
// khu "Câu chuyện chiến dịch" (tiêu đề, mô tả, video YouTube, ảnh KV) và khối ưu đãi
// (tiêu đề, mô tả, dòng cam kết bảo mật SĐT). Chỉ lưu GHI ĐÈ: ô bỏ trống → dùng nội
// dung mặc định (copy chuẩn trong src/lib/copy.ts) — nên luôn có nút quay về gốc.
import { useCallback, useEffect, useRef, useState } from "react";
import { apiGet, apiSend, apiUpload } from "@/components/client-api";
import { Btn, Card } from "@/components/admin/AdminShell";

type TextKey =
  | "hero_title_1" | "hero_title_2" | "hero_body"
  | "campaign_title" | "campaign_hint" | "campaign_youtube_id"
  | "lead_title" | "lead_body" | "lead_privacy";

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

  // ID video đang có hiệu lực trên trang chủ (ghi đè nếu là ID hợp lệ, không thì mặc định)
  const effectiveYoutube = /^[A-Za-z0-9_-]{6,20}$/.test(form.campaign_youtube_id.trim())
    ? form.campaign_youtube_id.trim()
    : data.overrides.campaign_youtube_id || data.defaults.campaign_youtube_id;

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

      <Card title="Hero đầu trang">
        <div className="grid gap-4 md:grid-cols-2">
          {field("hero_title_1", "Tiêu đề — dòng 1 (màu đen)")}
          {field("hero_title_2", "Tiêu đề — dòng 2 (màu đỏ gạch)")}
        </div>
        <div className="mt-4">{field("hero_body", "Đoạn mô tả dưới tiêu đề", { multiline: true })}</div>
      </Card>

      <Card title="Câu chuyện chiến dịch (KV + TVC)">
        <div className="grid gap-4 md:grid-cols-2">
          {field("campaign_title", "Tiêu đề khu")}
          {field("campaign_hint", "Dòng mô tả cạnh tiêu đề")}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {field("campaign_youtube_id", "Video TVC (link YouTube hoặc ID)", {
            hint: "Dán link dạng youtube.com/watch?v=…, youtu.be/…, shorts/… — hệ thống tự lấy ID. Để trống → video demo.",
          })}
          <div>
            <span className="text-xs font-bold">Xem trước video đang hiển thị</span>
            <div className="mt-1 aspect-video overflow-hidden rounded-xl border border-cream-dark">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${effectiveYoutube}`}
                title="Xem trước TVC"
                allowFullScreen
                className="h-full w-full border-0"
              />
            </div>
            {/* Ô xám "This content is blocked" = CSP của proxy thiếu
                `frame-src https://www.youtube-nocookie.com` (xem deploy/Caddyfile).
                Link dưới đây để kiểm tra ID đúng chưa kể cả khi iframe bị chặn. */}
            <a
              href={`https://www.youtube.com/watch?v=${effectiveYoutube}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-xs font-semibold text-ink-soft underline hover:text-brick"
            >
              Mở {effectiveYoutube} trên YouTube ↗
            </a>
          </div>
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
                  jpg/png/webp ≤ 10MB, giữ nguyên tỷ lệ ảnh gốc. Chưa có ảnh → trang chủ hiện
                  placeholder “KV chiến dịch — chờ thiết kế final”.
                </span>
              </>
            )}
          </div>
        </div>
      </Card>

      <Card title="Khối ưu đãi cư dân (lead)">
        {field("lead_title", "Tiêu đề khối")}
        <div className="mt-4">{field("lead_body", "Đoạn mô tả ưu đãi", { multiline: true })}</div>
        <div className="mt-4">
          {field("lead_privacy", "Dòng cam kết bảo mật SĐT (🔒)", {
            multiline: true,
            hint: "Hiện ở khối ưu đãi cuối trang VÀ popup “Tôi muốn nhận ưu đãi”. Để trống → dùng cam kết mặc định.",
          })}
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
