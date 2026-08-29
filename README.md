# UNLINK

Alat **bypass shortlink** otomatis — paste link, dapat URL tujuan langsung.
Backend Node/Express + frontend React (Vite). 100% kode original.

## ⚡ Quick Start (clone → langsung jalan)

```bash
git clone https://github.com/alalghzy/unlink.git
cd unlink

# 1. Install semua dependency (backend + frontend otomatis lewat npm workspaces)
npm run setup

# 2. Jalankan server (backend serve UI + API di http://localhost:3000)
npm start
```

Buka **http://localhost:3000** — langsung bisa dipakai.

### Windows (tanpa terminal ribet)
- Double-click `start.bat` → server nyala di `http://localhost:3000`
- Double-click `stop.bat` → matikan server

## 🧰 Requirement

| Kebutuhan | Versi |
|---|---|
| Node.js | >= 18 (tested 22.x) |
| npm | 9+ (ikut Node) |
| Playwright browser | `npx playwright install chromium` (kalau mau metode browser-headless) |

> Metode `param-decode`, `form-token-decode`, `organic-follow` TIDAK butuh browser — jalan instan.
> Metode `browser-headless` (fallback terakhir) butuh Chromium via Playwright.

## 🔄 Metode Bypass (pipeline berlapis)

| Urutan | Metode | Kecepatan | Cara kerja |
|---|---|---|---|
| 1 | ⚡ `param-decode` | instan | URL tujuan ada di `?url=` (base64) — ShrinkEarn family |
| 2 | 🔑 `form-token-decode` | ~1s | token base64 di hidden form (tpi.li family) tanpa captcha |
| 3 | 🔁 `organic-follow` | cepat | ikuti redirect HTTP biasa |
| 4 | 🌐 `browser-headless` | lambat | Playwright + AdBlock untuk yang butuh JS |

Pipeline otomatis: coba 1 → 2 → 3 → 4 sampai dapat hasil.

## 📁 Struktur

```text
unlink/
├── backend/      # Node/Express — API bypass (param-decode, form-token, organic, browser)
├── frontend/     # React (Vite) — UI pixel-art (dark)
├── functions/    # Cloudflare Pages Function — expose BACKEND_URL saat deploy
├── start.bat     # Windows: jalankan server
├── stop.bat      # Windows: hentikan server
└── wrangler.toml # Config deploy Cloudflare Pages (opsional)
```

## 🚀 Deploy (opsional)

| Opsi | Platform | Biaya | Catatan |
|---|---|---|---|
| Frontend | Cloudflare Pages | Gratis | Backend tetap lokal, hubungkan lewat `cloudflared tunnel` + `BACKEND_URL` |
| Full backend | Railway / Fly.io / VPS | ~$5+/bln | Support Playwright penuh |

Arsitektur yang dipakai: **backend tetap lokal** — frontend di Cloudflare Pages memanggil backend lewat
tunnel (`BACKEND_URL` disediakan runtime via `functions/api/config.js`).

```bash
# Jalankan backend lalu buka tunnel:
npm start                # terminal 1
npm run tunnel           # terminal 2 → dapat URL https://xxxx.trycloudflare.com
```

Set `BACKEND_URL` = URL tunnel itu di Cloudflare Pages. Selesai.

## Catatan

- Tanpa jaminan 100% untuk semua link — affiliate yang enkripsi token & wajib captcha manusia butuh solver berbayar.
- Untuk format link umum (shrinkearn, tpi.li) sudah ter-resolve otomatis & gratis.