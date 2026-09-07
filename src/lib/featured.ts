/**
 * Slider "Khu phố tiêu biểu" ở hero có ĐÚNG 10 SLOT (chốt 7/9).
 *
 * `neighborhoods.featured_position` là vị trí slide 1..10, KHÔNG trùng nhau (unique index
 * ở migration 011). Khu bật `is_featured` mà chưa xếp vị trí thì đứng cuối theo tên và chỉ
 * lên slider khi 10 slot chưa đầy.
 *
 * Module riêng (không nằm trong `lib/neighborhoods.ts`) để `NeighborhoodSlider` — client
 * component — không phải kéo theo cả lớp truy cập DB.
 */
export const FEATURED_SLOTS = 10;
