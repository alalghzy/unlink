// api.js — klien API untuk backend lokal / deployed.
//  - Lokal (start.bat, :3000): backend serve dist di origin yang sama → default ""
//  - Cloudflare Pages: backend lokal diakses via tunnel → BACKEND_URL dibaca
//    dari Pages Function /api/config pada saat runtime (tanpa rebuild).
// Menyimpan hasil config di cache agar tidak fetch tiap kali.

const VITE_API_BASE = import.meta.env?.VITE_API_BASE || "";
let cachedBackendUrl = null;
let configPromise = null;

async function resolveApiBase() {
  if (cachedBackendUrl !== null) return cachedBackendUrl;
  if (!configPromise) {
    configPromise = (async () => {
      // Coba /api/config (hanya ada di Cloudflare Pages / bila di-deploy).
      try {
        const res = await fetch(`${VITE_API_BASE}/api/config`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.backendUrl) {
            cachedBackendUrl = data.backendUrl;
            return cachedBackendUrl;
          }
        }
      } catch {}
      // Fallback: same-origin (dev lokal) atau VITE_API_BASE.
      cachedBackendUrl = VITE_API_BASE || "";
      return cachedBackendUrl;
    })();
  }
  return configPromise;
}

export function normalizeUrl(raw) {
  const url = String(raw || "").trim();
  if (!url) return "";
  if (!/^[a-zA-Z]+:\/\//.test(url)) return "https://" + url;
  return url;
}

async function apiFetch(path, options) {
  const base = await resolveApiBase();
  return fetch(`${base}${path}`, options);
}

export async function apiCheck(url) {
  const r = await apiFetch("/api/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: normalizeUrl(url) }),
  });
  return r.json();
}

export async function apiOrganic(url) {
  const r = await apiFetch("/api/organic", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: normalizeUrl(url) }),
  });
  return r.json();
}

export async function streamProxyUrl(url) {
  const base = await resolveApiBase();
  return `${base}/api/stream/stream?url=${encodeURIComponent(normalizeUrl(url))}`;
}

export async function subtitleProxyUrl(url) {
  const base = await resolveApiBase();
  return `${base}/api/stream/subtitle?url=${encodeURIComponent(url)}`;
}

export async function apiMetadata(title) {
  const r = await apiFetch(`/api/stream/metadata?title=${encodeURIComponent(title)}`);
  return r.json();
}

export async function apiSearch(q) {
  const r = await apiFetch(`/api/stream/search?q=${encodeURIComponent(q)}`);
  return r.json();
}

export { };
