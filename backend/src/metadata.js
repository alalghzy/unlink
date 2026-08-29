// metadata.js — Cari IMDb ID + judul dari sebuah judul (untuk cari subtitle).
// Menggunakan pencarian publik IMDb (omdb caching tidak dipakai; kita pakai
// endpoint IMDb suggestion agar tidak butuh API key).

import https from "node:https";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36";

function jsonGet(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": UA } }, (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => resolve(body));
        res.on("error", reject);
      })
      .on("error", reject);
  });
}

// Endpoint suggestion IMDb: https://v2.sg.media-imdb.com/suggestion/x/{query}.json
export async function lookupTitle(title) {
  const query = encodeURIComponent(title.trim().toLowerCase().replace(/\s+/g, "_"));
  if (!query) return {};
  try {
    const raw = await jsonGet(
      `https://v2.sg.media-imdb.com/suggestion/x/${query}.json`
    );
    const data = JSON.parse(raw);
    const d = data.d || data;
    if (Array.isArray(d) && d.length > 0) {
      const first = d[0];
      return {
        title: first.l,
        imdbId: first.id && first.id.startsWith("tt") ? first.id : null,
        year: first.y,
        type: first.qid === "tvSeries" ? "tv" : "movie",
      };
    }
    if (d.d && Array.isArray(d.d) && d.d.length > 0) {
      const first = d.d[0];
      return { title: first.l, imdbId: first.id, year: first.y, type: first.qid };
    }
  } catch {
    /* fallthrough */
  }
  return {};
}

export default { lookupTitle };