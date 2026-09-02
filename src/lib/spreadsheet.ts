// Đọc file import (.xlsx / .csv) — dùng chung cho 2 route import (khu phố, lời nhắc).
//
// QC 2/9 · B1: `XLSX.read(buffer)` để SheetJS tự đoán bảng mã. Với .xlsx thì mã hoá nằm
// trong chính file nên không sao, nhưng với CSV — không có module `cptable` đi kèm —
// SheetJS mặc định latin-1 trừ khi file mở đầu bằng BOM. CSV xuất từ Google Sheets hay
// soạn tay đều KHÔNG có BOM nên mọi dòng tiếng Việt về thành `ThÃ nh phá»`, kéo theo lỗi
// giả "Tỉnh/Thành phố không có trong danh mục".
// Cách chữa: CSV thì tự giải mã UTF-8 rồi đưa vào SheetJS dạng chuỗi.
import * as XLSX from "xlsx";

/** File này có phải CSV không — xét cả đuôi tên lẫn MIME (trình duyệt gửi
 *  `text/csv`, Excel trên Windows gửi `application/vnd.ms-excel` cho .csv). */
export function isCsvFile(name: string, type = ""): boolean {
  return /\.csv$/i.test(name.trim()) || type.toLowerCase().includes("csv");
}

/** Chuỗi UTF-8 đã bỏ BOM — tách riêng để unit test không cần dựng File/Workbook */
export function decodeCsv(buf: Buffer | Uint8Array): string {
  return Buffer.from(buf).toString("utf8").replace(/^\uFEFF/, "");
}

/** Đọc workbook từ nội dung file đã tải lên. Ném lỗi như XLSX.read gốc. */
export function readWorkbook(
  buf: Buffer | Uint8Array,
  fileName: string,
  fileType = ""
): XLSX.WorkBook {
  return isCsvFile(fileName, fileType)
    ? XLSX.read(decodeCsv(buf), { type: "string", raw: true })
    : XLSX.read(Buffer.from(buf), { type: "buffer" });
}
