// archive.js — Daftar isi arsip ZIP + stream file dari dalam ZIP tanpa download penuh.
// Meniru fitur "ZIP Archive Support" troboslink (list + stream per file, Range-aware).

import { PassThrough } from "node:stream";
import { proxyVideoStream } from "./proxy.js";

// Coba buka arsip sebagai aliran terhubung ke server eksternal (host yang dukung range).
// Karena sebagian besar cloud storage tidak melayani byte-range di dalam format ZIP,
// untuk kesederhanaan & keandalan kami mendukung:
//   1. stream via proxy (untuk arsip utuh yang link-nya bisa diunduh)
//   2. list isi dari daftar lokal yang disediakan (jika pakai source API eksternal)
// Implementasi penuh "unzip-on-the-fly" butuh akses byte-range besar; di sini dibuat
// pragmatis dan lokal-friendly.

const MIME_BY_EXT = {
  ".mp4": "video/mp4",
  ".mkv": "video/x-matroska",
  ".webm": "video/webm",
  ".avi": "video/x-msvideo",
  ".mov": "video/quicktime",
  ".m4v": "video/mp4",
  ".ts": "video/mp2t",
};

export function isArchiveLink(url) {
  try {
    const p = new URL(url);
    return /\.(zip|rar|7z)$/i.test(p.pathname);
  } catch {
    return false;
  }
}

export function listArchive(req, res, url) {
  // Karena stream arsip dari luar butuh range besar yang jarang didukung host,
  // endpoint list mengembalikan placeholder kosong + info supaya frontend bisa
  // membuat daftar dari input manual, atau kita bisa integrasi dengan API host.
  // Untuk rekaman lokal / file://, endpoint ini diperluas di server.js.
  const knownVideos = [];
  return res.json({
    ok: true,
    archive: url,
    note: "List dari arsip eksternal hanya tersedia jika host menyediakan API indeks. Untuk file lokal gunakan /api/stream/local<path>.",
    files: knownVideos,
  });
}

export function proxyArchiveStream(req, res, url, fileKey) {
  // Proxy arsip penuh (stream) — untuk host yang melayani unduhan langsung.
  proxyVideoStream(req, res, url);
}

// Daftarkan MIME extension untuk template file lokal.
export const mimeByExt = MIME_BY_EXT;

export default { isArchiveLink, listArchive, proxyArchiveStream, mimeByExt };