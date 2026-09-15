// OG image động (Q8) — render bằng next/og (satori), tối ưu preview Facebook & Zalo.
// URL/OG không bao giờ chứa SĐT hay ID đoán được (02 §11).
//
// MÔI TRƯỜNG KÍN (15/9): build CI và production không ra được Internet. next/og tự tải
// emoji (cdn.jsdelivr.net) và font bù (fonts.googleapis.com) cho mọi ký tự font không có —
// nên ở đây: icon là SVG vẽ tại chỗ (CẤM emoji), mọi chuỗi đi qua `ogText()` lọc theo cmap
// của font, và dựng lỗi thì trả ảnh tĩnh `public/og-default.png` thay vì 500.
// Test khoá: tests/og-offline.test.tsx (fetch bị chặn, dựng đủ 4 route).
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ogText, parseCmap } from "@/lib/og-text";

export const OG_SIZE = { width: 1200, height: 630 };

/** Header đánh dấu ảnh dự phòng — test dùng để phân biệt dựng thật với dự phòng. */
export const OG_FALLBACK_HEADER = "x-og-fallback";

const BRICK = "#B23A2E";

type Fonts = {
  fonts: { name: string; data: Buffer; weight: 400 | 700; style: "normal" }[];
  supported: Set<number>;
};

let fontsPromise: Promise<Fonts> | null = null;

function loadFonts(): Promise<Fonts> {
  fontsPromise ??= (async (): Promise<Fonts> => {
    const dir = path.join(process.cwd(), "public", "fonts");
    const [regular, bold] = await Promise.all([
      readFile(path.join(dir, "BeVietnamPro-Regular.ttf")),
      readFile(path.join(dir, "BeVietnamPro-Bold.ttf")),
    ]);
    // Giao hai mặt chữ: ký tự nào thiếu ở một trong hai cũng bị lọc.
    const bolds = parseCmap(bold);
    const supported = new Set([...parseCmap(regular)].filter((c) => bolds.has(c)));
    return {
      fonts: [
        { name: "BVP", data: regular, weight: 400, style: "normal" },
        { name: "BVP", data: bold, weight: 700, style: "normal" },
      ],
      supported,
    };
  })().catch((e) => {
    fontsPromise = null; // lỗi đọc file thì lần sau thử lại, không cache lỗi
    throw e;
  });
  return fontsPromise;
}

/**
 * Bọc truy vấn dữ liệu của route OG: DB lỗi thì ghi log và trả null — route vẫn dựng thẻ
 * chung thay vì 500 (crawler Facebook/Zalo gặp 500 là link chia sẻ mất ảnh).
 */
export async function ogData<T>(query: Promise<T>): Promise<T | null> {
  try {
    return await query;
  } catch (err) {
    console.error("[og] truy vấn dữ liệu ảnh OG lỗi, dựng thẻ chung:", err);
    return null;
  }
}

export type OgIcon = "heart" | "medal" | "trophy" | "party";

// Path 24×24 dạng đặc (bộ Material Icons) — vẽ tại chỗ nên không tải gì từ ngoài.
const ICON_PATHS: Record<OgIcon, string> = {
  heart:
    "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z",
  medal:
    "M17 10.43V2H7v8.43c0 .35.18.68.49.86l4.18 2.51-.99 2.34-3.41.29 2.59 2.24L9.07 22 12 20.23 14.93 22l-.78-3.33 2.59-2.24-3.41-.29-.99-2.34 4.18-2.51c.3-.18.48-.5.48-.86zm-4 1.8l-1 .6-1-.6V3h2v9.23z",
  trophy:
    "M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z",
  party:
    "M2 22l14-5-9-9-5 14zm12.53-9.47l5.59-5.59c.49-.49 1.28-.49 1.77 0l.59.59 1.06-1.06-.59-.59c-1.07-1.07-2.82-1.07-3.89 0l-5.59 5.59 1.06 1.06zM10.06 6.88l-.59.59 1.06 1.06.59-.59c1.07-1.07 1.07-2.82 0-3.89l-.59-.59-1.06 1.07.59.59c.48.48.48 1.28 0 1.76zm7.07 5.48l-1.06 1.06 1.06 1.06c.48-.48 1.28-.48 1.76 0l1.07 1.06 1.06-1.06-1.06-1.07c-1.08-1.07-2.82-1.07-3.89 0zM15.06 5.41l-3.18 3.18 1.06 1.06 3.18-3.18-1.06-1.06z",
};

function Icon({ name, size, color }: { name: OgIcon; size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}

export async function ogCard(opts: {
  badge: string;
  badgeIcon?: OgIcon;
  title: string;
  /** Bọc tiêu đề trong “…” SAU khi lọc (câu trích của biển) — lọc hết chữ thì bỏ ngoặc. */
  quoteTitle?: boolean;
  subtitle?: string;
  footer?: string;
  icon?: OgIcon;
}): Promise<Response> {
  try {
    const { fonts, supported } = await loadFonts();
    const t = (s?: string) => ogText(s, supported);

    const rawTitle = t(opts.title);
    const title = rawTitle ? (opts.quoteTitle ? `“${rawTitle}”` : rawTitle) : "Khu Phố Của Tôi";
    const badge = t(opts.badge);
    const subtitle = t(opts.subtitle);
    const footer = t(opts.footer) || "Lên Khu Phố Của Tôi, viết câu nhắc cho xóm mình.";

    const img = new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: 64,
            backgroundColor: "#FBF5EC",
            fontFamily: "BVP",
            color: "#3B2E25",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 72,
                height: 72,
                borderRadius: 999,
                backgroundColor: BRICK,
              }}
            >
              <Icon name={opts.icon ?? "heart"} size={40} color="#FFFFFF" />
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 34, fontWeight: 700, color: BRICK }}>Khu Phố Của Tôi</div>
              <div style={{ fontSize: 22, color: "#7A6A5C" }}>Cùng xây khu phố biết thương</div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {badge && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  alignSelf: "flex-start",
                  backgroundColor: BRICK,
                  color: "#FFFFFF",
                  fontSize: 26,
                  fontWeight: 700,
                  padding: "10px 28px",
                  borderRadius: 999,
                }}
              >
                {opts.badgeIcon && <Icon name={opts.badgeIcon} size={28} color="#FFFFFF" />}
                <div style={{ display: "flex" }}>{badge}</div>
              </div>
            )}
            <div style={{ fontSize: 58, fontWeight: 700, lineHeight: 1.2, maxWidth: 1050 }}>
              {title}
            </div>
            {subtitle && (
              <div style={{ fontSize: 30, color: "#7A6A5C", maxWidth: 1000 }}>{subtitle}</div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 24,
              color: "#7A6A5C",
            }}
          >
            <div style={{ display: "flex" }}>{footer}</div>
            <div
              style={{ display: "flex", alignItems: "center", gap: 8, color: BRICK, fontWeight: 700 }}
            >
              FPT Telecom
              <Icon name="heart" size={26} color={BRICK} />
            </div>
          </div>
        </div>
      ),
      { ...OG_SIZE, fonts }
    );
    // ImageResponse dựng LƯỜI trong ReadableStream — lỗi chỉ nổ khi đọc body. Đọc hết ở đây
    // để try/catch bắt được và còn kịp trả ảnh dự phòng.
    const png = await img.arrayBuffer();
    return new Response(png, { headers: img.headers });
  } catch (err) {
    console.error("[og] dựng ảnh OG lỗi, trả ảnh dự phòng:", err);
    const png = await readFile(path.join(process.cwd(), "public", "og-default.png"));
    return new Response(new Uint8Array(png), {
      headers: {
        "content-type": "image/png",
        // Ngắn để crawler lấy lại ảnh thật sau khi sự cố hết.
        "cache-control": "public, max-age=300",
        [OG_FALLBACK_HEADER]: "1",
      },
    });
  }
}
