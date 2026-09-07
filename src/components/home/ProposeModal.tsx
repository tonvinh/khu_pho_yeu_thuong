"use client";
// Modal "Đề xuất khu phố mới" — wizard 2 BƯỚC, số đo lấy từ .fig trong repo:
//   Bước 1/2 — Lựa chọn chủ đề  (frame 7458:40650)
//   Bước 2/2 — Thông tin khu phố (frame 7458:41331)
//
// QC 7/9: bước 2 bị dựng sai bộ trường. Design chỉ có ĐÚNG 3 nhóm (Frame 241, gap 16):
//   1. Frame 198  636×82 — 2 cột 310 gap 16: `Tỉnh/thành phố` · `Phường /Xã` (select 50, r=80)
//   2. Frame 199  636×82 — `Tên khu phố/hẻm/ngõ muốn treo biển` (input 50, r=80)
//   3. Frame 200  636×122 — `Điều dễ thương bạn muốn chia sẻ ở khu phố này` (textarea 90, r=16)
// Nhãn 16px Bold, cách ô 8; nút `Button 02` 636×50 r=100 viền #FF8206 1.5px ở đáy.
// So với bản cũ: tỉnh/phường lên ĐẦU, ô "Tên khu phố" và ô "Tên hẻm/ngõ" GỘP làm một,
// ô "Viết câu nhắc thương của bạn (nếu có)" bị BỎ (DESIGN THẮNG SPEC — docs/20 §2.1).
// Ô gộp vẫn là combobox `NeighborhoodPicker` (design vẽ input thường, nhưng lúc không
// focus trông y hệt): chọn được khu phố có sẵn thì resolveNeighborhoodId không sinh
// bản ghi trùng.
import { useEffect, useState } from "react";
import type { MapNeighborhood } from "./types";
import { apiGet, apiSend } from "../client-api";
import { CATEGORIES, type CategoryCode } from "@/lib/taxonomy";
import NeighborhoodPicker from "./NeighborhoodPicker";
import { Field, IconCheck, IconChevronDown, Modal } from "./ui";

interface GeoUnit { code: string; name: string }

export default function ProposeModal({
  neighborhoods,
  defaultNeighborhoodId,
  requireIdentity,
  onClose,
  onDone,
}: {
  neighborhoods: MapNeighborhood[];
  defaultNeighborhoodId: string | null;
  /** Modal mở THẲNG (không chặn định danh trước) — chỉ hỏi ở bước bấm Gửi */
  requireIdentity: (fn: () => void) => void;
  onClose: () => void;
  onDone: () => void;
}) {
  const defaultNb = neighborhoods.find((n) => n.id === defaultNeighborhoodId) ?? null;
  const [step, setStep] = useState<1 | 2>(1);
  const [category, setCategory] = useState<CategoryCode | null>(null);
  // Ô GỘP "Tên khu phố/hẻm/ngõ muốn treo biển" — vừa là location_text gửi lên API,
  // vừa là tên khu phố khi người dùng tự nhập (nbId = null).
  const [nbId, setNbId] = useState<string | null>(defaultNb?.id ?? null);
  const [nbText, setNbText] = useState(defaultNb?.name ?? "");
  // Địa lý hành chính MỚI (1/7/2025): Tỉnh/Thành → thẳng Phường/Xã, bỏ quận/huyện.
  // Danh mục chính thức (34 tỉnh, 3.321 phường/xã) load từ /api/v1/geo — CHỌN, không nhập.
  const [provinces, setProvinces] = useState<GeoUnit[]>([]);
  const [wards, setWards] = useState<GeoUnit[]>([]);
  const [cityCode, setCityCode] = useState("");
  const [city, setCity] = useState(defaultNb?.city ?? "");
  const [ward, setWard] = useState(defaultNb?.ward ?? "");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ provinces: GeoUnit[] }>("/api/v1/geo")
      .then((r) => setProvinces(r.provinces))
      .catch(() => {});
  }, []);
  // Hai ô tỉnh/phường nay LUÔN chọn được (design đặt lên đầu, không còn ô đọc-chỉ theo
  // khu phố) → phải dò ngược mã tỉnh từ TÊN đã có sẵn để nạp danh sách phường.
  useEffect(() => {
    if (cityCode || !city || provinces.length === 0) return;
    const hit = provinces.find((p) => p.name === city);
    if (hit) setCityCode(hit.code);
  }, [provinces, city, cityCode]);
  useEffect(() => {
    if (!cityCode) { setWards([]); return; }
    let stale = false;
    apiGet<{ wards: GeoUnit[] }>(`/api/v1/geo?province=${cityCode}`)
      .then((r) => { if (!stale) setWards(r.wards); })
      .catch(() => {});
    return () => { stale = true; };
  }, [cityCode]);

  const goStep2 = () => {
    if (!category) { setError("Chọn chủ đề nhé"); return; }
    setError(null);
    setStep(2);
  };

  const submit = () => {
    // Thứ tự báo lỗi bám thứ tự ô trên màn: tỉnh → phường/xã bỏ qua (tuỳ chọn) → tên.
    if (!city) { setError("Chọn tỉnh/thành của khu phố nhé"); return; }
    const name = nbText.trim();
    if (!name) { setError("Nhập tên khu phố/hẻm/ngõ muốn treo biển nhé"); return; }
    // Hỏi định danh ở ĐÂY, không phải lúc mở modal (email 18/8: bấm "Đề xuất góc phố mới"
    // mà bung form ưu đãi là sai luồng)
    requireIdentity(async () => {
      setBusy(true);
      setError(null);
      try {
        // Design gộp "tên khu phố" và "tên hẻm/ngõ" làm MỘT ô → cùng một giá trị đi vào
        // location_text (vị trí treo biển) và neighborhood_text (khi là khu phố tự nhập).
        await apiSend("POST", "/api/v1/issues", {
          category,
          location_text: name,
          description,
          neighborhood_id: nbId,
          neighborhood_text: nbId ? null : name,
          neighborhood_city: nbId ? null : city || null,
          neighborhood_ward: nbId ? null : ward || null,
        });
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
      } finally {
        setBusy(false);
      }
    });
  };

  return (
    <Modal
      title="Đề xuất khu phố mới"
      onClose={onClose}
      onBack={step === 2 ? () => { setStep(1); setError(null); } : undefined}
    >
      {/* Frame 212: hai đầu dòng, chữ 18px Regular #3D3D3D */}
      <div className="mb-4 flex items-baseline justify-between gap-3 text-[15px] tracking-[-0.02em] text-ink sm:text-[18px]">
        <span>{step === 1 ? "Lựa chọn chủ đề" : "Thông tin khu phố của bạn"}</span>
        <span>{step}/2</span>
      </div>

      {step === 1 ? (
        <>
          {/* Frame 240: 6 thẻ 636×54, bo 16, viền 1.5px #3D3D3D, cách nhau 16px;
              thẻ đang chọn tô đặc #3D3D3D, chữ trắng, dấu ✓ bên phải */}
          <div className="flex flex-col gap-4">
            {(Object.entries(CATEGORIES) as [CategoryCode, { label: string; icon: string; desc: string }][]).map(
              ([code, c]) => {
                const on = category === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setCategory(code)}
                    aria-pressed={on}
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border-[1.5px] px-4 py-2.5 text-left transition sm:h-[54px] sm:py-0 ${
                      on
                        ? "border-ink bg-ink text-white"
                        : "border-ink bg-white text-ink hover:border-brick"
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-bold leading-tight sm:text-[16px] sm:leading-[21px]">{c.label}</span>
                      {/* Mobile hẹp hơn 636 của .fig nên mô tả xuống 2 dòng thay vì bị cắt cụt;
                          từ sm mới ép 1 dòng đúng thẻ 54px của design. */}
                      <span className={`block line-clamp-2 text-[13px] font-light leading-snug sm:truncate sm:text-[14px] sm:leading-[18px] ${on ? "text-white/80" : "text-ink-soft"}`}>
                        {c.desc}
                      </span>
                    </span>
                    {on && <IconCheck className="h-[22px] w-[22px] flex-none" />}
                  </button>
                );
              }
            )}
          </div>
          {error && <p className="m-0 mt-3 text-sm font-medium text-status-waiting">{error}</p>}
          {/* Frame 205: nút cách danh sách 32px, cao 50 */}
          <div className="pb-5 pt-8">
            <button onClick={goStep2} className="kp-btn kp-btn-primary tap h-[50px] w-full px-5 text-[16px]">
              Tiếp tục đề xuất
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Frame 241 — 3 nhóm ô, cách nhau 16px (mt-4). Nhóm 1: Frame 198, 2 cột 310. */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Tỉnh/thành phố" size="lg">
              <span className="relative block">
                <select
                  value={cityCode}
                  onChange={(e) => {
                    const code = e.target.value;
                    setCityCode(code);
                    setCity(provinces.find((p) => p.code === code)?.name ?? "");
                    setWard("");
                    // Đổi địa giới thì khu phố đã chọn từ danh sách không còn khớp nữa
                    setNbId(null);
                  }}
                  aria-label="Tỉnh/thành phố"
                  className="kp-input kp-input-lg tap appearance-none pr-12"
                >
                  <option value="">Lựa chọn</option>
                  {provinces.map((p) => (
                    <option key={p.code} value={p.code}>{p.name}</option>
                  ))}
                </select>
                <IconChevronDown className="pointer-events-none absolute right-4 top-1/2 h-6 w-6 -translate-y-1/2 text-ink" />
              </span>
            </Field>
            <Field label="Phường /Xã" size="lg">
              <span className="relative block">
                <select
                  value={ward}
                  onChange={(e) => { setWard(e.target.value); setNbId(null); }}
                  disabled={!cityCode}
                  aria-label="Phường /Xã"
                  className="kp-input kp-input-lg tap appearance-none pr-12 disabled:bg-cream disabled:text-ink-soft"
                >
                  {/* .fig để CẢ HAI ô là "Lựa chọn"; ô phường chỉ bị khoá xám khi chưa có tỉnh */}
                  <option value="">Lựa chọn</option>
                  {/* Khu phố cũ có thể mang tên phường ngoài danh mục hiện hành —
                      vẫn phải hiện được giá trị đang có, nếu không select rơi về rỗng. */}
                  {ward && !wards.some((w) => w.name === ward) && <option value={ward}>{ward}</option>}
                  {wards.map((w) => (
                    <option key={w.code} value={w.name}>{w.name}</option>
                  ))}
                </select>
                <IconChevronDown className="pointer-events-none absolute right-4 top-1/2 h-6 w-6 -translate-y-1/2 text-ink" />
              </span>
            </Field>
          </div>

          {/* Frame 199 — ô GỘP tên khu phố/hẻm/ngõ, full 636 */}
          <Field label="Tên khu phố/hẻm/ngõ muốn treo biển" size="lg" className="mt-4">
            <NeighborhoodPicker
              neighborhoods={neighborhoods}
              valueId={nbId}
              valueText={nbText}
              placeholder="Nhập tên hẻm ngõ nơi bạn sinh sống"
              size="lg"
              onChange={(id, text) => {
                setNbId(id);
                setNbText(text);
                // Chọn khu phố có sẵn → điền hộ tỉnh/phường của khu đó
                const picked = id ? neighborhoods.find((n) => n.id === id) : null;
                if (picked?.city) setCity(picked.city);
                if (picked?.ward) setWard(picked.ward);
              }}
            />
          </Field>

          {/* Frame 200 — textarea 636×90, bo 16 */}
          <Field label="Điều dễ thương bạn muốn chia sẻ ở khu phố này" size="lg" className="mt-4">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Nhập đoạn mô tả"
              rows={3}
              className="kp-input kp-input-lg"
            />
          </Field>

          {error && <p className="m-0 mt-3 text-sm font-medium text-status-waiting">{error}</p>}
          {/* Frame 192: nút cách khối form 32px, cao 50 */}
          <div className="pb-5 pt-8">
            <button
              onClick={submit}
              disabled={busy}
              className="kp-btn kp-btn-primary tap h-[50px] w-full px-5 text-[16px] disabled:opacity-60"
            >
              {busy ? "Đang gửi…" : "Gửi đề xuất"}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
