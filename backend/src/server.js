// server.js — Backend lokal TrobosLink (replika fungsional linkspide.fly.dev)
// Jalankan: npm run dev  (atau node src/server.js)
// Endpoint:
//   POST /api/check                  -> deteksi service
//   POST /api/organic                -> bypass shortlink
//   GET  /api/stream/stream?url=..   -> proxy streaming video (Range-aware)
//   GET  /api/stream/archive?url=&action=list|codec|hls|stream
//   GET  /api/stream/subtitle?url=.. -> proxy subtitle
//   GET  /api/stream/metadata?title= -> lookup IMDb (cari subtitle)
//   GET  /api/stream/search?q=       -> pilih judul (hanya nama ISP untuk lokal)

import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

import { detectService } from "./detect.js";
import { organicBypass } from "./organic.js";
import proxyVideoStream from "./proxy.js";
import { proxySubtitle } from "./subtitle.js";
import { lookupTitle } from "./metadata.js";
import archive, { isArchiveLink, listArchive, proxyArchiveStream } from "./archive.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Proteksi dasar dari abuse lokal.
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", apiLimiter);

// ===== Health =====
app.get("/api", (_req, res) =>
  res.json({ name: "TrobosLink Local", status: "ok", time: new Date().toISOString() })
);

// ===== /api/check =====
app.post("/api/check", (req, res) => {
  const url = String((req.body && req.body.url) || "").trim();
  if (!url) return res.status(400).json({ error: "url wajib diisi" });
  let valid = true;
  try {
    new URL(url);
  } catch {
    valid = false;
  }
  if (!valid) return res.json({ url, valid: false, service: null });
  const det = detectService(url);
  res.json({
    url,
    valid: true,
    known: det.known,
    service: det.service,
    shortener: det.known ? det.service : undefined,
    detectedService: det.known ? det.service : "Unknown",
  });
});

// ===== /api/organic =====
app.post("/api/organic", async (req, res) => {
  const url = String((req.body && req.body.url) || "").trim();
  if (!url) return res.status(400).json({ error: "url wajib diisi" });
  try {
    new URL(url);
  } catch {
    return res.json({ original: url, resolved: null, success: false, error: "URL tidak valid" });
  }
  const result = await organicBypass(url);
  res.json(result);
});

// ===== /api/stream/stream (proxy video) =====
app.all("/api/stream/stream", (req, res) => {
  const url = String(req.query.url || "").trim();
  if (!url || !/^https?:\/\//i.test(url)) {
    return res.status(400).json({ error: "Parameter url valid wajib (http/https)" });
  }
  proxyVideoStream(req, res, url);
});

// ===== /api/stream/archive =====
app.get("/api/stream/archive", (req, res) => {
  const url = String(req.query.url || "").trim();
  const action = String(req.query.action || "info");
  if (!url) return res.status(400).json({ error: "Parameter url wajib" });

  if (action === "list") {
    return listArchive(req, res, url);
  }
  if (isArchiveLink(url)) {
    // Proxy penuh (stream) untuk host langsung.
    return proxyArchiveStream(req, res, url, req.query.file);
  }
  res.status(400).json({ error: "Bukan link arsip (.zip/.rar/.7z)" });
});

// ===== /api/stream/subtitle =====
app.get("/api/stream/subtitle", (req, res) => {
  const url = String(req.query.url || "").trim();
  if (!url) return res.status(400).json({ error: "Parameter url wajib" });
  return proxySubtitle(req, res, url);
});

// ===== /api/stream/metadata =====
app.get("/api/stream/metadata", async (req, res) => {
  const title = String(req.query.title || "").trim();
  if (!title) return res.status(400).json({ error: "Parameter title wajib" });
  const meta = await lookupTitle(title);
  if (!meta.imdbId) return res.status(404).json({ error: "Tidak ditemukan", title });
  res.json(meta);
});

// ===== /api/stream/search (autocomplete judul) =====
// Di backend lokal, delegasikan pencarian ke lookupTitle (satu hasil).
app.get("/api/stream/search", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) return res.json({ results: [] });
  const meta = await lookupTitle(q);
  res.json({
    results: meta.imdbId
      ? [
          {
            title: meta.title,
            year: meta.year,
            type: meta.type,
            imdbId: meta.imdbId,
            available: true,
            count: 0,
          },
        ]
      : [],
  });
});

// ===== Static: serve frontend build jika ada (agar satu port bisa dipakai) =====
const frontendDist = path.resolve(os.homedir(), "AppData/Local/hermes/obsidian_vault/project_vault/troboslink-local/frontend/dist");
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(path.join(frontendDist, "index.html")));
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`[TrobosLink] Backend lokal aktif di http://127.0.0.1:${PORT}`);
  console.log(`[TrobosLink] API: /api/check | /api/organic | /api/stream/*`);
});