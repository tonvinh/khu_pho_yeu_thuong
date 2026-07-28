// OG image động (Q8) — render bằng next/og (satori), tối ưu preview Facebook & Zalo.
// URL/OG không bao giờ chứa SĐT hay ID đoán được (02 §11).
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const OG_SIZE = { width: 1200, height: 630 };

async function loadFonts() {
  const dir = path.join(process.cwd(), "public", "fonts");
  const [regular, bold] = await Promise.all([
    readFile(path.join(dir, "BeVietnamPro-Regular.ttf")),
    readFile(path.join(dir, "BeVietnamPro-Bold.ttf")),
  ]);
  return [
    { name: "BVP", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "BVP", data: bold, weight: 700 as const, style: "normal" as const },
  ];
}

export async function ogCard(opts: {
  badge: string;
  title: string;
  subtitle?: string;
  footer?: string;
  emoji?: string;
}) {
  const fonts = await loadFonts();
  return new ImageResponse(
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
              backgroundColor: "#B23A2E",
              fontSize: 36,
            }}
          >
            {opts.emoji || "💛"}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 34, fontWeight: 700, color: "#B23A2E" }}>Khu Phố Của Tôi</div>
            <div style={{ fontSize: 22, color: "#7A6A5C" }}>Cùng xây khu phố biết thương</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              backgroundColor: "#B23A2E",
              color: "#FFFFFF",
              fontSize: 26,
              fontWeight: 700,
              padding: "10px 28px",
              borderRadius: 999,
            }}
          >
            {opts.badge}
          </div>
          <div style={{ fontSize: 58, fontWeight: 700, lineHeight: 1.2, maxWidth: 1050 }}>
            {opts.title}
          </div>
          {opts.subtitle && (
            <div style={{ fontSize: 30, color: "#7A6A5C", maxWidth: 1000 }}>{opts.subtitle}</div>
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
          <div>{opts.footer || "Lên Khu Phố Của Tôi, viết câu nhắc cho xóm mình."}</div>
          <div style={{ display: "flex", color: "#B23A2E", fontWeight: 700 }}>FPT Telecom 💛</div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts }
  );
}
