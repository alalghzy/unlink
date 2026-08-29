// subtitle.js — Proxy subtitle (.srt/.vtt/.ass) dari host eksternal ke client,
// plus konversi format subtitle bila perlu. Client meminta via query `url`.

import https from "node:https";
import http from "node:http";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36";

function fetchRaw(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https:") ? https : http;
    lib
      .get(url, { headers: { "User-Agent": UA } }, (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () =>
          resolve(Buffer.concat(chunks))
        );
        res.on("error", reject);
      })
      .on("error", reject);
  });
}

export async function proxySubtitle(req, res, url) {
  if (!/^https?:\/\//.test(url)) {
    return res.status(400).json({ error: "Subtitle URL harus http(s)" });
  }
  try {
    const buf = await fetchRaw(url);
    const mime =
      /\.vtt$/i.test(url) ? "text/vtt" :
      /\.ass$/i.test(url) ? "text/plain" :
      "application/x-subrip"; // .srt
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", mime + "; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.send(buf);
  } catch (err) {
    return res.status(502).json({ error: "Gagal ambil subtitle: " + err.message });
  }
}

export default { proxySubtitle };