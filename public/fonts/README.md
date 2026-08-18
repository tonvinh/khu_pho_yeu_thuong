# Font FPT SongVui

Mặt chữ DUY NHẤT của trang chủ theo `docs/lp/LandingpageFCM.fig` — Figma dùng các family
`ver 3 FPT SONGVUI LIGHT / REGULAR / BOLD`.

File `.woff2` ở đây được chuyển từ `docs/lp/font_FPT_songvui.zip` (bản TTF gốc của team
Brand) bằng:

```
npx ttf2woff2 < "ver 3 FPT SONGVUI BOLD 20.03.ttf" > FPTSongVui-Bold.woff2
```

Ánh xạ TTF gốc → file dùng trong web (khai báo `@font-face` ở `src/app/globals.css`):

| TTF gốc | woff2 | weight | style |
|---|---|---|---|
| ver 3 FPT SONGVUI LIGHT 20.03 | FPTSongVui-Light | 300 | normal |
| ver 3 FPT SONGVUI REGULAR 20.03 | FPTSongVui-Regular | 400 | normal |
| ver 3 FPT SONGVUI BOLD 20.03 | FPTSongVui-Bold | 700 | normal |
| ver 3 FPT SONGVUI LIGHT ITALIC | FPTSongVui-LightItalic | 300 | italic |
| ver 3 FPT SONGVUI ITALIC 20.03 | FPTSongVui-Italic | 400 | italic |
| ver 3 FPT SONGVUI BOLD ITALIC 20.03 | FPTSongVui-BoldItalic | 700 | italic |

Font là tài sản thương hiệu FPT — chỉ dùng cho chiến dịch này, không phát tán.
