# Quy định điểm — "Đại sứ khu phố"
Nguồn chuẩn: `QuydinhdiemDaisukhupho.xlsx` (đã được phê duyệt) · Chiến dịch Khu Phố Biết Thương · nền tảng Khu Phố Của Tôi

---

## 1. Công thức

```
ĐIỂM ĐẠI SỨ = (2 × Đề xuất được duyệt)
            + (5 × Câu đạt 4N được duyệt)
            + (1 × Lượt thương)
            + (30 × Câu được treo)
```

## 2. Chi tiết từng chỉ số

| Chỉ số | Điểm | Điều kiện tính | Lý do trọng số |
|--------|------|----------------|----------------|
| Đề xuất góc xóm cần treo biển | **+2** | Chỉ tính đề xuất **ĐƯỢC DUYỆT** · tối đa **3 đề xuất/tuần** được tính điểm | Giữ mức thấp đúng chủ trương "ít thôi": mỗi đề xuất tạo việc thẩm định cho đội vận hành. Trần tuần chặn spam đề xuất. |
| Câu nhắc đạt 4N, được duyệt hiển thị | **+5** | Tính theo câu **được admin duyệt lên trang với checklist 4N tick đủ 4 ô** (Q2: duyệt thủ công, không chấm tự động) — không tính câu gửi bị loại | Cột sản lượng chính của chiến dịch. Tính theo câu được duyệt để lượng không đè chất. |
| Lượt thương nhận được | **+1/lượt** | **Không trần** · chỉ tính lượt thương từ tài khoản đã định danh SĐT hợp lệ (*) · **không tự thương câu mình** | Cột chất lượng — cả xóm chấm thay ban tổ chức. Câu được thương nhiều nhất xứng đáng định đoạt cuộc đua. |
| Câu được chọn treo thành biển thật | **+30** | Tính khi biển **sản xuất và treo thực tế** tại góc xóm (trạng thái `installed`) | Jackpot của mechanic — mọi hành vi khác đều hướng về đích này. Khoảnh khắc tạo UGC mạnh nhất (khoe biển). |

## 3. Luật nền (áp dụng cho mọi chỉ số)

1. **Một số điện thoại = một tài khoản, một phiếu thương cho mỗi câu.**
   > (*) **Ghi chú thay đổi so với xlsx gốc:** bản xlsx quy định "xác thực OTP". Theo quyết định PM (07/2026), OTP được thay bằng **định danh SĐT băm + cookie** (02-FUNCTIONAL-SPEC §8) để giảm ma sát. Mức đảm bảo chống gian lận thấp hơn OTP — bù bằng rate limit định danh, chặn số ảo và heuristics lọc lặng lẽ. Cần stakeholder ký duyệt lại điểm lệch này.
2. **Không tính điểm khi tự thương câu của chính mình**; phiếu bất thường (cụm tài khoản đăng ký cùng lúc, thương hàng loạt một người) bị **lọc lặng lẽ, không thông báo**.
3. **Điểm cá nhân cộng dồn thành điểm khu phố** — dùng cho bảng **"Khu phố tử tế nhất tháng"** (tổng điểm cư dân + số biển mới treo trong khu).
4. **Điểm tích luỹ suốt chiến dịch (sprint 4 tuần).** Nếu chuyển sang vận hành dài hạn: đổi sang chu kỳ tháng và **reset điểm** để người mới còn cửa đua.

## 4. Ví dụ kiểm thử (dùng làm test case)

| Cư dân | Đề xuất duyệt | Câu 4N duyệt | Lượt thương | Câu treo | **Điểm** |
|--------|---------------|--------------|-------------|----------|----------|
| Cô Tám tạp hoá | 1 | 3 | 34 | 1 | **81** = 2+15+34+30 |
| Anh Dũng | 0 | 2 | 47 | 1 | **87** = 0+10+47+30 |
| Minh (lớp 11) | 2 | 4 | 21 | 0 | **45** = 4+20+21+0 |

## 5. Yêu cầu triển khai kỹ thuật

- Điểm ghi dạng **sổ cái append-only** (`score_events`, xem 03-DATA-MODEL) — không lưu tổng cứng; tổng = SUM(events hợp lệ). Cho phép vô hiệu event lặng lẽ khi phát hiện gian lận.
- Trần 3 đề xuất/tuần: tính theo **tuần ISO**, đề xuất duyệt thứ 4 trở đi vẫn hiển thị công khai nhưng ghi event points=0.
- Bỏ thương (toggle off) → vô hiệu event `vote_received` tương ứng.
- Bảng xếp hạng Đại sứ hiển thị: hạng, tên, "{n} câu được treo · {m} lượt thương", tổng điểm (đơn vị "đ" theo design — VD "82đ").
