// detect.js — Mendeteksi penyedia shortlink/links dari sebuah URL
// Replika dari perilaku /api/check troboslink, daftar lokal (legal, tidak menyalin data layanan).

function hostnameOf(rawUrl) {
  try {
    return new URL(rawUrl).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

// Daftar shortener/paywall-link yang dikenal. Tambahkan sesuka sesuai kebutuhan lokal.
const SERVICES = [
  { match: [/^shorte\.st$/], name: "Shorte.st" },
  { match: [/^shrtco\.de$/, /^shrtco\.de$/], name: "Shrtco" },
  { match: [/^bit\.ly$/, /bitly\.com$/], name: "Bit.ly" },
  { match: [/^t\.co$/], name: "Twitter (t.co)" },
  { match: [/^tinyurl\.com$/, /^tiny\.cc$/], name: "TinyURL" },
  { match: [/^cutt\.ly$/], name: "Cutt.ly" },
  { match: [/^is\.gd$/, /^v\.gd$/], name: "is.gd / v.gd" },
  { match: [/^goo\.gl$/], name: "Google (goo.gl)" },
  { match: [/^rb\.gy$/], name: "Rebrandly (rb.gy)" },
  { match: [/^s\.id$/], name: "s.id (Telkom)" },
  { match: [/^shrinkearn\.com$/], name: "ShrinkEarn" },
  { match: [/^tpi\.li$/], name: "Interstitial (tpi.li)" },
  { match: [/^shrinkbixby\.com$/], name: "ShrinkBixby" },
  { match: [/^rebrand\.ly$/], name: "Rebrandly" },
  { match: [/^linktr\.ee$/], name: "Linktree" },
  { match: [/^t\.me$/], name: "Telegram (t.me)" },
  { match: [/^lnkd\.in$/, /linkedin\.com\/links\//], name: "LinkedIn" },
  { match: [/^amzn\.to$/], name: "Amazon (amzn.to)" },
  { match: [/^youtu\.be$/], name: "YouTube (youtu.be)" },
  { match: [/^pixeldrain\.com$/], name: "PixelDrain" },
  { match: [/drive\.google\.com$/], name: "Google Drive" },
  { match: [/^mega\.nz$/], name: "Mega.nz" },
  { match: [/^mediafire\.com$/], name: "MediaFire" },
  { match: [/^gofile\.io$/], name: "GoFile" },
  { match: [/^catbox\.moe$/], name: "Catbox" },
  { match: [/^litterbox\.catbox\.moe$/], name: "Catbox / Litterbox" },
];

export function detectService(rawUrl) {
  const host = hostnameOf(rawUrl);
  if (!host) return { valid: false, service: null };
  for (const s of SERVICES) {
    if (s.match.some((re) => re.test(host))) {
      return { valid: true, known: true, service: s.name };
    }
  }
  return { valid: true, known: false, service: "Unknown" };
}

export default { detectService, hostnameOf };