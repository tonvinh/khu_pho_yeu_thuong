// QC 2/9 · B1 — đọc file import: CSV UTF-8 KHÔNG BOM phải ra đúng dấu tiếng Việt.
// Trước khi sửa, `XLSX.read(buffer)` để SheetJS tự đoán bảng mã nên CSV không BOM về
// latin-1: "Thành phố Hồ Chí Minh" → "ThÃ nh phá»‘ Há»“ ChÃ­ Minh", kéo theo lỗi giả
// "Tỉnh/Thành phố không có trong danh mục 34 tỉnh/thành".
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { decodeCsv, isCsvFile, readWorkbook } from "@/lib/spreadsheet";

const HEADER = "Tên khu phố,Tỉnh/Thành phố,Phường/Xã";
const ROW = "Xom Import OK,Thành phố Hồ Chí Minh,Phường Bàn Cờ";
const CSV = `${HEADER}\n${ROW}\n`;

/** Đọc lại workbook thành mảng ô như hai route import đang làm */
function cells(wb: XLSX.WorkBook): string[][] {
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils
    .sheet_to_json<string[]>(ws, { header: 1, defval: "" })
    .map((r) => r.map((c) => String(c ?? "").trim()));
}

describe("isCsvFile", () => {
  it("nhận ra CSV theo đuôi tên, không phân biệt hoa thường và khoảng trắng thừa", () => {
    expect(isCsvFile("khu-pho.csv")).toBe(true);
    expect(isCsvFile("KHU-PHO.CSV")).toBe(true);
    expect(isCsvFile("  khu-pho.csv  ")).toBe(true);
  });

  it("nhận ra CSV theo MIME khi tên file không có đuôi", () => {
    expect(isCsvFile("upload", "text/csv")).toBe(true);
    expect(isCsvFile("upload", "application/CSV")).toBe(true);
  });

  it("xlsx thì không phải CSV (kể cả tên có chữ csv ở giữa)", () => {
    expect(isCsvFile("khu-pho.xlsx")).toBe(false);
    expect(isCsvFile("bang-csv-thang-8.xlsx")).toBe(false);
    expect(
      isCsvFile("a.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    ).toBe(false);
  });
});

describe("decodeCsv", () => {
  it("giải mã UTF-8 và bỏ BOM ở đầu file", () => {
    expect(decodeCsv(Buffer.from(CSV, "utf8"))).toBe(CSV);
    expect(decodeCsv(Buffer.from("﻿" + CSV, "utf8"))).toBe(CSV);
  });

  it("chỉ bỏ BOM ở ĐẦU, không đụng ký tự giữa file", () => {
    const withInner = "a,b\nc,﻿d\n";
    expect(decodeCsv(Buffer.from(withInner, "utf8"))).toBe(withInner);
  });
});

describe("readWorkbook", () => {
  it("CSV UTF-8 KHÔNG BOM → giữ nguyên dấu tiếng Việt (lỗi B1)", () => {
    const rows = cells(readWorkbook(Buffer.from(CSV, "utf8"), "khu-pho.csv", "text/csv"));
    expect(rows[1]).toEqual(["Xom Import OK", "Thành phố Hồ Chí Minh", "Phường Bàn Cờ"]);
    // dấu hiệu kinh điển của việc giải mã UTF-8 bằng latin-1
    expect(rows[1][1]).not.toContain("Ã");
  });

  it("CSV UTF-8 CÓ BOM → vẫn chạy như cũ, BOM không dính vào ô đầu tiên", () => {
    const rows = cells(readWorkbook(Buffer.from("﻿" + CSV, "utf8"), "khu-pho.csv"));
    expect(rows[0][0]).toBe("Tên khu phố");
    expect(rows[1][1]).toBe("Thành phố Hồ Chí Minh");
  });

  it(".xlsx vẫn đọc bằng đường buffer và giữ đúng dấu", () => {
    const ws = XLSX.utils.aoa_to_sheet([HEADER.split(","), ROW.split(",")]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "KhuPho");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

    const out = readWorkbook(
      buf,
      "khu-pho.xlsx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    expect(out.SheetNames).toContain("KhuPho");
    expect(cells(out)[1]).toEqual(["Xom Import OK", "Thành phố Hồ Chí Minh", "Phường Bàn Cờ"]);
  });

  it("CSV giữ nguyên chuỗi số (mã phường '01' không bị rút thành 1)", () => {
    const rows = cells(readWorkbook(Buffer.from("a,b\nXóm 1,01\n", "utf8"), "x.csv"));
    expect(rows[1]).toEqual(["Xóm 1", "01"]);
  });
});
