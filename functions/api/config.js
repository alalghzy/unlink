// functions/api/config.js — Cloudflare Pages Function
// Mengekspos BACKEND_URL (URL cloudflared tunnel ke backend lokal) ke frontend
// pada saat runtime, sehingga ganti tunnel TIDAK perlu rebuild frontend.
export function onRequestGet(context) {
  const backendUrl = context.env?.BACKEND_URL || "";
  return new Response(JSON.stringify({ backendUrl }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
