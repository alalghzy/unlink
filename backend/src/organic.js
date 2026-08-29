// organic.js — "Organic mode" bypass: ikuti redirect HTTP + validasi respons
// Meniru log perilaku troboslink ("Fetching via HTTP...", "Final URL: ...") namun
// dengan request HTTP biasa (bukan headless browser) — jadi hanya menangani
// shortlink berbasis redirect. Anti-captcha/timer interaktif tidak ditangani.

import http from "node:http";
import https from "node:https";
import { detectService } from "./detect.js";
import { resolveWithBrowser } from "./browser.js";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

// ===== Solusi form-token (tpi.li / shrinkearn-family): =====
// Halaman interstitial tpi.li memuat hidden form POST ke ein hohen `landing`,
// dan field `token` berisi base64 dari URL tujuan — tersedia LANGSUNG di HTML
// awal (tanpa perlu menyelesaikan captcha / tanpa browser).
// Contoh token:
//   452dadc17397875149022eb30d9b81f4a196e8dd2026hG1fZ2S2008
//   aHR0cHM6Ly93d3cuZmlsZWNyeXB0LmNjL0NvbnRhaW5lci8wRURENkY5ODUyLmh0bWw=
//                                  └─ base64("https://www.filecrypt.cc/...")
export async function tryDecodeFormToken(rawUrl) {
  try {
    const u = new URL(rawUrl);
    if (!/^https?:$/.test(u.protocol)) return null;

    const html = await fetchPageText(rawUrl, 1000000);
    if (!html) return null;

    // Ekstrak value dari <input name="token" value="...">
    const m = html.match(/<input[^>]*name=["']token["'][^>]*value=["']([^"']+)["']/i)
           || html.match(/name=["']token["'][^>]*value=["']([^"']+)["']/i);
    if (!m) return null;

    let token = m[1].trim();
    // Cari URL tujuan di dalam token. Token biasanya = <hash><alias><n><base64(url)>
    // dengan base64 menggabung langsung tanpa delimiter, jadi coba decode tiap
    // suffix dari token (potong prefix hash/alias) sampai ketemu URL http(s).
    const tryB64 = (s) => {
      let padded = s.replace(/-/g, "+").replace(/_/g, "/");
      while (padded.length % 4 !== 0) padded += "=";
      try {
        const dec = Buffer.from(padded, "base64").toString("utf-8");
        if (/^https?:\/\//i.test(dec)) return dec.trim();
        const embedded = dec.match(/https?:\/\/[^\s"']+/);
        if (embedded) return embedded[0].trim();
      } catch {}
      return null;
    };
    // 1) coba suffix mulai dari indeks 8 (lewati hash) hingga seluruh panjang
    for (let i = 0; i < token.length - 24; i++) {
      const hit = tryB64(token.slice(i));
      if (hit) return hit;
    }
    return null;
  } catch {
    return null;
  }
}

// GET sederhana + kumpulkan body (utk parsing HTML interstitial).
async function fetchPageText(url, cap = 120000) {
  return new Promise((resolve) => {
    const lib = url.startsWith("https:") ? https : http;
    let body = "";
    const req = lib.get(
      url,
      {
        headers: {
          "User-Agent": UA,
          Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        timeout: 15000,
      },
      (res) => {
        // Ikuti redirect sampai beberapa step
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          const next = new URL(res.headers.location, url).toString();
          fetchPageText(next, cap).then(
            (nextBody) => resolve(nextBody || body || null),
            () => resolve(body || null)
          );
          return;
        }
        res.on("data", (c) => {
          body += c;
          if (body.length > cap) req.destroy();
        });
        res.on("end", () => resolve(body));
        res.on("error", () => resolve(body || null));
      }
    );
    req.on("timeout", () => { req.destroy(); resolve(null); });
    req.on("error", () => resolve(null));
  });
}
export function tryDecodeHiddenUrl(rawUrl) {
  try {
    const u = new URL(rawUrl);
    let candidate = u.searchParams.get("url") || u.searchParams.get("link") || u.searchParams.get("dest") || "";
    if (!candidate) return null;

    const tryDecode = (s) => {
      if (!s) return null;
      let after = s;
      try { after = decodeURIComponent(s); } catch {}
      // Buka base64 (padding-aware)
      let padded = after.replace(/-/g, "+").replace(/_/g, "/");
      while (padded.length % 4 !== 0) padded += "=";
      let raw = null;
      try { raw = Buffer.from(padded, "base64").toString("utf-8"); } catch {}
      if (raw && /^https?:\/\//i.test(raw)) return raw.trim();
      // Maybe it's already plain http(s) (not base64)
      if (/^https?:\/\//i.test(after)) return after.trim();
      if (/^https?:\/\//i.test(padded)) return padded.trim();
      return null;
    };

    return tryDecode(candidate);
  } catch {
    return null;
  }
}

// Lakukan GET dengan mengikuti redirect, kumpulkan log langkah + cek bahwa
// respons akhir menghasilkan konten HTML (kriteria sukses troboslink).
async function resolveWithFollow(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https:") ? https : http;
    const logs = [];
    let finalUrl = url;
    const req = lib.get(
      url,
      {
        headers: {
          "User-Agent": UA,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
          Referer: "https://www.google.com/",
        },
        timeout: 15000,
      },
      (res) => {
        const status = res.statusCode || 0;
        logs.push(`HTTP ${status}`);

        // Redirect
        if (status >= 300 && status < 400 && res.headers.location) {
          const next = new URL(res.headers.location, url).toString();
          logs.push(`Redirect -> ${next}`);
          res.resume(); // discard body
          // Batasi kedalaman redirect untuk hindari loop
          return resolveWithFollow(next).then(
            (r) => resolve({ ...r, logs: [...logs, ...r.logs], redirects: r.redirects + 1 }),
            reject
          );
        }

        // Kumpulkan sebagian body untuk cek HTML
        let body = "";
        res.on("data", (c) => {
          body += c;
          if (body.length > 65536) req.destroy(); // batas ambulans
        });
        res.on("end", () => {
          const isHtml =
            /<html[^>]*>/i.test(body) || /text\/html/.test(res.headers["content-type"] || "");
          if (status >= 400 || !isHtml) {
            return reject(
              new Error(
                status >= 400
                  ? `HTTP ${status} (${res.statusMessage || ""})`
                  : "No HTML response"
              )
            );
          }
          resolve({ success: true, finalUrl, status, logs, redirected: url !== finalUrl, redirects: 0 });
        });
        res.on("error", reject);
      }
    );
    req.on("timeout", () => req.destroy(new Error("Request timeout")));
    req.on("error", reject);
  });
}

export async function organicBypass(rawUrl) {
  const logs = [];
  const det = detectService(rawUrl);
  logs.push(`Service: ${det.known ? det.service : "Unknown"}`);

  // ===== Rute C: decode URL tujuan yang tersu pada param url=/link= =====
  const hidden = tryDecodeHiddenUrl(rawUrl);
  if (hidden) {
    logs.push(`Menemukan URL tujuan tersembunyi di parameter -> ${hidden}`);
    logs.push(`Metode: decode langsung (tanpa navigasi, tanpa captcha)`);
    return {
      original: rawUrl,
      resolved: hidden,
      success: true,
      service: det.known ? det.service : null,
      method: "param-decode",
      logs,
      redirected: false,
    };
  }

  // ===== Rute D: parse token base64 di hidden form (tpi.li / shrinkearn-family) =====
  try {
    const fromForm = await tryDecodeFormToken(rawUrl);
    if (fromForm) {
      logs.push(`Menemukan URL tujuan di token form interstitial -> ${fromForm}`);
      logs.push(`Metode: ekstrak token (GET HTML + decode) tanpa captcha`);
      return {
        original: rawUrl,
        resolved: fromForm,
        success: true,
        service: det.known ? det.service : null,
        method: "form-token-decode",
        logs,
        redirected: false,
      };
    }
  } catch {
    // lanjut ke method berikutnya
  }

  logs.push("Fetching via HTTP...");

  // Catat URL sebelum follow
  logs.push(`Final URL: ${rawUrl}`);

  try {
    const result = await resolveWithFollow(rawUrl);
    return {
      original: rawUrl,
      resolved: result.finalUrl,
      success: true,
      service: det.known ? det.service : null,
      method: "organic-follow",
      logs: result.logs,
      redirected: result.redirected,
    };
  } catch (err) {
    // Fallback: coba headless browser untuk halaman anti-bot / JS-dependent.
    logs.push(`Organic-follow gagal: ${err.message}`);
    logs.push("Mencoba headless browser (Playwright)...");

    try {
      const bRes = await resolveWithBrowser(rawUrl);
      return {
        original: rawUrl,
        resolved: bRes.resolved,
        success: bRes.success,
        service: det.known ? det.service : null,
        method: bRes.method,
        logs: bRes.logs,
        redirect: bRes.resolved,
      };
    } catch (bErr) {
      logs.push(`Browser juga gagal: ${bErr.message}`);
    }

    return {
      original: rawUrl,
      resolved: null,
      success: false,
      service: det.known ? det.service : null,
      method: "organic-follow+browser",
      logs,
      error: err.message,
    };
  }
}

export default organicBypass;