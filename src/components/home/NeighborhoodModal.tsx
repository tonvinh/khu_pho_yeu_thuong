"use client";
// Popup hồ sơ khu phố — thay cho việc rời trang chủ sang /khu-pho/[slug] (18/8).
// Mở từ: ô tra cứu 4N (HeroLookup), pill địa chỉ trên slider khu phố tiêu biểu,
// và deep-link `/?khu-pho=<slug>` (link chia sẻ mở thẳng popup).
import { useEffect, useState } from "react";
import type { NeighborhoodDetail, SiteContentData } from "./types";
import { apiGet } from "../client-api";
import { Modal } from "./ui";
import NeighborhoodView from "./NeighborhoodView";

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

  return (
    /* Figma bản 2/9 · B9 (7756:2954): tiêu đề popup là "Thông tin khu phố" 25px
       Regular — tên khu phố và địa chỉ chuyển xuống THÂN popup (NeighborhoodView),
       không còn nhét vào thanh tiêu đề như bản 18/8. */
    <Modal onClose={onClose} title="Thông tin khu phố">
      {missing ? (
        <p className="py-8 text-center text-[14px] text-ink-soft">Không tìm thấy khu phố này.</p>
      ) : !nb ? (
        /* Khung xám giữ chỗ cho tiêu đề + 2 thẻ câu nhắc để popup không giật */
        <div className="animate-pulse">
          <div className="h-8 w-2/3 rounded-lg bg-cream" />
          <div className="mt-4 h-[73px] w-full rounded-2xl bg-cream" />
          <div className="mt-3 h-[73px] w-full rounded-2xl bg-cream" />
        </div>
      ) : (
        <NeighborhoodView
          nb={nb}
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
