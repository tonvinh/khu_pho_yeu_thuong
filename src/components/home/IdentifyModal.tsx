"use client";
// Modal "Để FPT gửi ưu đãi đến bạn" (docs/lp/lp6.png) — KHÔNG OTP; SĐT gửi server 1 lần
// qua HTTPS, không bao giờ lưu ở client (quy tắc cứng 3/3b).
// 18/8: thêm select TỈNH/THÀNH PHỐ và BẮT BUỘC chọn khi tự nhập tên khu phố
// (email review: "bắt buộc phải điền tỉnh thành") — trước đây khu phố tự nhập lưu city NULL.
import { useEffect, useState } from "react";
import type { MapNeighborhood, Me } from "./types";
import { apiGet, apiSend } from "../client-api";
import NeighborhoodPicker from "./NeighborhoodPicker";
import { Field, Modal } from "./ui";

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
      <p className="m-0 mb-4 text-[13.5px] leading-relaxed text-ink-soft">{intro}</p>

      <Field label="Số điện thoại">
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="VD: 0988 123 xxx"
          className="kp-input tap"
        />
      </Field>
      <Field label="Tên người dùng" className="mt-3.5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nhập tên hiển thị cho khu phố"
          className="kp-input tap"
        />
      </Field>
      <div className="mt-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="Địa chỉ khu phố">
          <NeighborhoodPicker
            neighborhoods={neighborhoods}
            valueId={nbId}
            valueText={nbText}
            placeholder="Tìm kiếm hoặc tự nhập tên phường"
            onChange={(id, text) => { setNbId(id); setNbText(text); }}
          />
        </Field>
        <Field label="Tỉnh/thành phố">
          {picked ? (
            <input value={picked.city ?? ""} disabled className="kp-input bg-cream text-ink-soft" />
          ) : (
            <select
              value={cityCode}
              onChange={(e) => setCityCode(e.target.value)}
              className="kp-input tap"
            >
              <option value="">Lựa chọn</option>
              {provinces.map((p) => (
                <option key={p.code} value={p.code}>{p.name}</option>
              ))}
            </select>
          )}
        </Field>
      </div>

      {error && <p className="m-0 mt-3 text-sm font-medium text-status-waiting">{error}</p>}
      <div className="py-5">
        <button
          onClick={submit}
          disabled={busy}
          className="kp-btn kp-btn-primary tap w-full px-5 py-3 disabled:opacity-60"
        >
          {busy ? "Đang xử lý…" : "Bắt đầu thôi"}
        </button>
      </div>
    </Modal>
  );
}
