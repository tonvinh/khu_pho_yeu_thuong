"use client";
// Popup hồ sơ khu phố — thay cho việc rời trang chủ sang /khu-pho/[slug] (18/8).
// Mở từ: ô tra cứu 4N (HeroLookup), pill địa chỉ trên slider khu phố tiêu biểu,
// và deep-link `/?khu-pho=<slug>` (link chia sẻ mở thẳng popup).
import { useEffect, useState } from "react";
import type { NeighborhoodDetail, SiteContentData } from "./types";
import { apiGet } from "../client-api";
import { Modal } from "./ui";
import NeighborhoodView from "./NeighborhoodView";
import { shortAddress } from "@/lib/address";

export default function NeighborhoodModal({
  slug,
  content,
  onClose,
  onWrite,
}: {
  /** slug hoặc id khu phố */
  slug: string;
  content: SiteContentData;
  onClose: () => void;
  /** "Viết lời nhắc cho xóm mình" — đóng popup rồi cuộn xuống khối góc phố */
  onWrite: () => void;
}) {
  const [nb, setNb] = useState<NeighborhoodDetail | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let alive = true;
    apiGet<{ neighborhood: NeighborhoodDetail }>(`/api/v1/neighborhoods/${encodeURIComponent(slug)}`)
      .then((res) => alive && setNb(res.neighborhood))
      .catch(() => alive && setMissing(true));
    return () => {
      alive = false;
    };
  }, [slug]);

  const addr = nb ? shortAddress(nb.ward, nb.city, nb.name) : "";

  return (
    <Modal
      wide
      onClose={onClose}
      title={
        nb ? (
          <>
            {nb.name}
            {addr && (
              <span className="mt-0.5 block font-sans text-[13px] font-light text-ink-soft">
                {addr}
              </span>
            )}
          </>
        ) : (
          "Khu phố"
        )
      }
    >
      {missing ? (
        <p className="py-8 text-center text-[14px] text-ink-soft">Không tìm thấy khu phố này.</p>
      ) : !nb ? (
        // Khung xám giữ đúng chiều cao khung ảnh để popup không giật khi có dữ liệu
        <div className="animate-pulse">
          <div className="aspect-[840/430] w-full rounded-[24px] bg-cream" />
          <div className="mt-4 h-16 w-full rounded-2xl bg-cream" />
        </div>
      ) : (
        <NeighborhoodView
          nb={nb}
          promo={{
            line1: content.sign_promo_line1,
            line2: content.sign_promo_line2,
            sale_phone: content.sign_sale_phone,
            hotline: content.sign_hotline,
          }}
          footer={
            <button onClick={onWrite} className="kp-btn kp-btn-solid tap px-5 py-2.5">
              Viết lời nhắc cho xóm mình
            </button>
          }
        />
      )}
    </Modal>
  );
}
