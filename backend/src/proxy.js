// proxy.js — Proxy streaming video + dukungan Range (untuk seek) + deteksi codec.
// Meneruskan request ke host eksternal (Google Drive, Mega, dll) secara streaming
// sehingga <video> bisa seek. Client mengirim header Range; server menghormatinya.

import http from "node:http";
import https from "node:https";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

// Pasang header stub yang sering diharapkan Google Drive / Mega agar dapat konten.
function specialHeaders(host) {
  const h = {
    "User-Agent": UA,
    Accept: "*/*",
    "Accept-Encoding": "identity",
    Connection: "keep-alive",
  };
  if (host.includes("googleusercontent.com") || host.includes("drive.google.com")) {
    h["Cookie"] = "CONSENT=YES+cb; NID=511=af1"; // consent cookie untuk unduhan GDrive publik
  }
  if (host === "mega.nz") h["Sec-Fetch-Dest"] = "document";
  return h;
}

async function httpsFetch(parsed, headers) {
  return new Promise((resolve, reject) => {
    const lib = parsed.protocol === "https:" ? https : http;
    const req = lib.get(parsed, { headers }, resolve);
    req.on("error", reject);
  });
}

// Ambil data dasar (status + headers) dari host tujuan. Objek response dikembalikan.
async function openUpstream(url, headers) {
  const parsed = new URL(url);
  return await httpsFetch(parsed, headers);
}

// Terima request client (berisi Range) -> open upstream dengan Range yang sama -> stream balik.
export function proxyVideoStream(req, res, url, extraHeaders = {}) {
  const parsed = new URL(url);
  const headers = { ...specialHeaders(parsed.hostname), ...extraHeaders };
  if (req.headers.range) headers["Range"] = req.headers.range;

  openUpstream(url, headers).then(
    (up) => {
      const status = up.statusCode || 200;
      const passHeaders = [
        "content-type",
        "content-length",
        "content-range",
        "accept-ranges",
        "last-modified",
        "etag",
        "cache-control",
      ];
      if (status === 302 || status === 301) {
        // Ikuti redirect dari host tujuan
        const loc = new URL(up.headers.location, url).toString();
        !res.destroyed && up.resume();
        return proxyVideoStream(req, res, loc, extraHeaders);
      }
      if (status === 200 || status === 206 || status < 300) {
        res.writeHead(status, { "Access-Control-Allow-Origin": "*", ...pick(up.headers, passHeaders) });
        up.pipe(res);
      } else {
        res.writeHead(status);
        res.end();
        up.resume();
      }
    },
    (err) => {
      if (!res.headersSent) res.writeHead(502, { "Access-Control-Allow-Origin": "*" });
      res.end("Proxy error: " + (err && err.message));
    }
  );
}

function pick(obj, keys) {
  const out = {};
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k];
  return out;
}

export default proxyVideoStream;