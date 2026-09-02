"use client";
// Modal "Để FPT gửi ưu đãi đến bạn" (docs/lp/lp6.png) — KHÔNG OTP; SĐT gửi server 1 lần
// qua HTTPS, không bao giờ lưu ở client (quy tắc cứng 3/3b).
// 18/8: thêm select TỈNH/THÀNH PHỐ và BẮT BUỘC chọn khi tự nhập tên khu phố
// (email review: "bắt buộc phải điền tỉnh thành") — trước đây khu phố tự nhập lưu city NULL.
import { useEffect, useState } from "react";
import type { MapNeighborhood, Me } from "./types";
import { apiGet, apiSend } from "../client-api";
import NeighborhoodPicker from "./NeighborhoodPicker";
import { Field, IconChevronDown, Modal } from "./ui";

interface GeoUnit { code: string; name: string }

export default function IdentifyModal({
  neighborhoods,
  title = "Để FPT gửi ưu đãi đến bạn",
  intro = "Chỉ cần để lại một vài thông tin. FPT sẽ liên hệ khi bạn đồng ý; số điện thoại được bảo mật và không hiển thị công khai.",
  onClose,
  onDone,
}: {
  neighborhoods: MapNeighborhood[];
  /** Đổi theo ngữ cảnh mở modal (đề xuất / viết câu / nhận ưu đãi) */
  title?: string;
  intro?: string;
  onClose: () => void;
  onDone: (me: Me) => void;
}) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [nbId, setNbId] = useState<string | null>(null);
  const [nbText, setNbText] = useState("");
  const [provinces, setProvinces] = useState<GeoUnit[]>([]);
  const [cityCode, setCityCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ provinces: GeoUnit[] }>("/api/v1/geo")
      .then((r) => setProvinces(r.provinces))
      .catch(() => {});
  }, []);

  const picked = neighborhoods.find((n) => n.id === nbId) ?? null;
  const city = picked ? picked.city ?? "" : provinces.find((p) => p.code === cityCode)?.name ?? "";

  const submit = async () => {
    // Tự nhập tên khu phố thì PHẢI có tỉnh/thành (server cũng chặn lại lần nữa)
    if (!picked && nbText.trim() && !city) {
      setError("Chọn tỉnh/thành của khu phố bạn nhé");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await apiSend<{ me: Me }>("POST", "/api/v1/auth/identify", {
        phone,
        display_name: name,
        neighborhood_id: nbId,
        neighborhood_text: nbId ? null : nbText || null,
        neighborhood_city: nbId ? null : city || null,
      });
      onDone(res.me);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={title} onClose={onClose} topmost>
      {/* Frame 192 (.fig 7502:932): mô tả 16px Light #969696, cách khối ô nhập 24px */}
      <p className="m-0 mb-6 font-light text-[15px] leading-relaxed tracking-[-0.02em] text-ink-soft sm:text-[16px]">
        {intro}
      </p>

      <Field label="Số điện thoại" size="lg">
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="VD: 0988 123 xxx"
          className="kp-input kp-input-lg tap"
        />
      </Field>
      <Field label="Tên người dùng" size="lg" className="mt-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nhập tên hiển thị cho khu phố"
          className="kp-input kp-input-lg tap"
        />
      </Field>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Địa chỉ khu phố" size="lg">
          <NeighborhoodPicker
            neighborhoods={neighborhoods}
            valueId={nbId}
            valueText={nbText}
            placeholder="Tìm kiếm hoặc tự nhập tên phường"
              size="lg"
            onChange={(id, text) => { setNbId(id); setNbText(text); }}
          />
        </Field>
        <Field label="Tỉnh/thành phố" size="lg">
          {picked ? (
            <input value={picked.city ?? ""} disabled className="kp-input kp-input-lg bg-cream text-ink-soft" />
          ) : (
            <span className="relative block">
              <select
                value={cityCode}
                onChange={(e) => setCityCode(e.target.value)}
                className="kp-input kp-input-lg tap appearance-none pr-12"
              >
                <option value="">Lựa chọn</option>
                {provinces.map((p) => (
                  <option key={p.code} value={p.code}>{p.name}</option>
                ))}
              </select>
              <IconChevronDown className="pointer-events-none absolute right-4 top-1/2 h-6 w-6 -translate-y-1/2 text-ink" />
            </span>
          )}
        </Field>
      </div>

      {error && <p className="m-0 mt-3 text-sm font-medium text-status-waiting">{error}</p>}
      {/* .fig: ô cuối kết ở y=432, nút y=506 → cách 74px, nút cao 50 */}
      <div className="pb-5 pt-8 sm:pt-[74px]">
        <button
          onClick={submit}
          disabled={busy}
          className="kp-btn kp-btn-primary tap h-[50px] w-full px-5 text-[16px] disabled:opacity-60"
        >
          {busy ? "Đang xử lý…" : "Bắt đầu thôi"}
        </button>
      </div>
    </Modal>
  );
}
