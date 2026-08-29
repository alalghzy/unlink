// browser.js — Resolver via headless browser (Playwright).
// Dipakai sebagai FALLBACK ketika organic-follow (HTTP polos) gagal karena
// halaman butuh JavaScript / cookie-session / anti-bot (captcha gate, timer).
//
// Alur: buka page headless → tunggu load → biarkan JS eksekusi → pantau navigasi
// sampai mencapai URL tujuan (bukan lagi interstitial) atau timeout.

import { chromium } from "playwright";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

// Set domain yang dianggap "tujuan akhir" — biasanya file host / konten.
const TARGET_HOST_HINT =
  /(drive\.google\.com|pixeldrain\.com|mega\.nz|mediafire\.com|gofile\.io|catbox\.moe|dropbox\.com|mega\.co\.nz|dood\.to|streamwish|embedsito|youtube\.com|youtu\.be)/i;

// Biasanya kita tidak ingin berhenti di halaman interstitial/penengah.
const INTERSTITIAL_HINT = /(tpi\.li|ad\.|interstitial|gateway|click|safelink|adlinkfly|shrinkearn|paid|out\.link)/i;

// Timeout (ms) menunggu sampai halaman mencapai URL tujuan.
const NAV_TIMEOUT = 20000;

function isTarget(url) {
  return TARGET_HOST_HINT.test(url);
}

function isInterstitial(url) {
  return INTERSTITIAL_HINT.test(url) && !isTarget(url);
}

export async function resolveWithBrowser(rawUrl, { timeout = NAV_TIMEOUT } = {}) {
  const logs = [];
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      userAgent: UA,
      viewport: { width: 1280, height: 800 },
      // Aktifkan cookie & persist sesi dalam 1 context.
    });
    const page = await context.newPage();

    // ===== AdBlock (route interception): blokir iklan/tracker/malware hosts =====
    const BLOCKED_HOST_RE =
      /(doubleclick\.net|googlesyndication\.com|googleadservices\.com|google-analytics\.com|googletagmanager\.com|facebook\.com\/tr|adsystem|adservice|adnxs\.com|adroll\.com|taboola\.com|outbrain\.com|quantserve\.com|scorecardresearch\.com|criteo\.com|mgid\.com|adsterra|propellerads|cpmstar|exoclick|popads|juicyads|onclickads|adb\.pm|2mdn\.net|adfox\.ru|yandex\.ru\/clck|adskeeper|7xxx\.cc)/i;
    await context.route("**/*", (route) => {
      const url = route.request().url();
      const rtype = route.request().resourceType();
      // Blokir hosts iklan/tracker + resource tipe tertentu dari host iklan
      if (BLOCKED_HOST_RE.test(url)) {
        route.abort().catch(() => {});
        return;
      }
      route.continue().catch(() => {});
    });
    logs.push("AdBlocker aktif");
    logs.push(`Browser headless dibuka`);

    let finalUrl = null;
    let landed = false;

    // Pantau setiap target baru (popup/redirect) yang kemungkinan tujuan.
    page.on("popup", async (popup) => {
      try {
        await popup.waitForLoadState("domcontentloaded", { timeout: 8000 });
        const u = popup.url();
        logs.push(`Popup terbuka -> ${u}`);
        if (u && !isInterstitial(u)) { finalUrl = u; landed = true; }
      } catch { /* ignore */ }
    });

    await page.goto(rawUrl, { waitUntil: "domcontentloaded", timeout: 15000 });

    // Bantu resolve halaman anti-bot:
    // 1. Klik checkbox "Verify you are human" di iframe Cloudflare Turnstile (jika ada)
    // 2. Klik tombol "Continue"/proceed
    const trySolveTurnstile = async () => {
      try {
        const solved = await page.evaluate(async () => {
          // Coba cari checkbox di dalam all iframes (turnstile cross-origin kadang sulit,
          // tapi beberapa diserve same-origin / srcdoc).
          for (const frame of document.querySelectorAll("iframe")) {
            try {
              const doc = frame.contentDocument;
              const cb = doc && doc.querySelector(
                "input[type=checkbox], [role=checkbox], .challenge-container label, label"
              );
              if (cb) { cb.click(); return true; }
            } catch { /* cross-origin */ }
          }
          // Fallback: cari elemen klik-area di halaman utama dgn teks verify/human
          const el = [...document.querySelectorAll("[role=button], button, a, .checkbox, label")].find(
            (e) => /verify you are human|i'm not a robot|verify|human|checkbox/i.test((e.innerText || "") + (e.title || "") + (e.getAttribute && e.getAttribute("aria-label") || ""))
          );
          if (el) { el.click(); return true; }
          return false;
        });
        return solved;
      } catch { return false; }
    };

    const clickContinue = async () => {
      try {
        const clicked = await page.evaluate(() => {
          const btns = [...document.querySelectorAll("button, a.btn, a.button, [role=button]")];
          const target = btns.find(
            (b) => /continue|proceed|next|start|get link|go|verify/i.test((b.innerText || "").trim())
          );
          if (target) { target.click(); return true; }
          return false;
        });
        return clicked;
      } catch { return false; }
    };

    for (let i = 0; i < 5; i++) {
      const solved = await trySolveTurnstile().catch(() => false);
      const clicked = await clickContinue().catch(() => false);
      if (solved) logs.push(`Coba klik checkbox Turnstile (percobaan ${i + 1})`);
      if (clicked) logs.push(`Klik tombol Continue (percobaan ${i + 1})`);
      await new Promise((r) => setTimeout(r, 1800));
    }

    // Tunggu sampai halaman menuju tujuan.
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline && !landed) {
      const cur = page.url();
      if (cur && !isInterstitial(cur) && isTarget(cur)) {
        finalUrl = cur;
        landed = true;
        break;
      }
      if (cur && !isInterstitial(cur) && cur !== "about:blank" && !/shrinkearn\.com|tpi\.li/i.test(cur)) {
        finalUrl = cur;
        landed = true;
        break;
      }
      const target = await page
        .evaluate(() => {
          const hint = /drive\.google\.com|pixeldrain|mega\.nz|mediafire|gofile|catbox|dropbox|youtube/i;
          const els = document.querySelectorAll("a[href]");
          for (const a of els) {
            const href = (a.href || "").toLowerCase();
            if (hint.test(href) && !/\.my\.id|shrinkearn|tpi\.li/.test(href)) return a.href;
          }
          return null;
        })
        .catch(() => null);
      if (target) {
        logs.push(`Link tujuan ditemukan di DOM -> ${target}`);
        finalUrl = target;
        landed = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 600));
    }

    if (landed && finalUrl) {
      logs.push(`Resolved via browser -> ${finalUrl}`);
      return { success: true, resolved: finalUrl, logs, method: "browser-headless" };
    }

    logs.push(`Timeout / tidak ketemu tujuan (${Date.now() - (Date.now() - timeout)}ms)`);
    return {
      success: false,
      resolved: null,
      logs,
      method: "browser-headless",
      error: "Tidak dapat melewati proteksi anti-bot di halaman ini",
    };
  } finally {
    await browser.close();
  }
}

export default resolveWithBrowser;