import React, { useState } from "react";
import { apiCheck, apiOrganic, normalizeUrl } from "./api.js";

// Komponen tab "Bypass Link" — alur: check -> organic -> hasil + logs.
export default function BypassPanel() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [detected, setDetected] = useState(null);
  const [status, setStatus] = useState(null); // {type, text}
  const [result, setResult] = useState(null); // {url, logs, elapsed}
  const [copied, setCopied] = useState(false);

  async function onInput(v) {
    setUrl(v);
    const norm = normalizeUrl(v);
    if (norm.length > 10) {
      try {
        const d = await apiCheck(norm);
        setDetected(d.valid && d.known ? d.detectedService : null);
      } catch {
        setDetected(null);
      }
    } else {
      setDetected(null);
    }
  }

  async function resolve() {
    const norm = normalizeUrl(url);
    if (!norm || busy) return;
    setBusy(true);
    setResult(null);
    setStatus({ type: "loading", text: "Mendeteksi service..." });
    try {
      const d = await apiCheck(norm);
      if (!d.valid) {
        setStatus({ type: "error", text: "URL tidak valid" });
        return;
      }
      setDetected(d.detectedService === "Unknown" ? null : d.detectedService);
      setStatus({ type: "loading", text: "Mode: ORGANIC — mengikuti redirect..." });
      const t0 = Date.now();
      const data = await apiOrganic(norm);
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      if (data.success) {
        const methodLabel = {
          "param-decode": "⚡ Instan (decode params)",
          "organic-follow": "🔁 Redirect",
          "browser-headless": "🌐 Headless + AdBlock",
          "organic-follow+browser": "🔁→🌐 Fallback",
        }[data.method] || data.method || "organic";
        setResult({ url: data.resolved, logs: data.logs || [], elapsed, method: methodLabel });
        setStatus({ type: "ok", text: `Bypass berhasil (${elapsed}s)` });
      } else {
        setResult(null);
        const errText = data.error || "Gagal memproses";
        setStatus({ type: "error", text: errText });
      }
    } catch (e) {
      setStatus({ type: "error", text: "Koneksi error: " + (e.message || e) });
    } finally {
      setBusy(false);
    }
  }

  function copy() {
    if (!result) return;
    navigator.clipboard?.writeText(result.url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <section className="panel">
      <div className="input-card">
        <div className="input-row">
          <input
            type="url"
            placeholder="Paste link shortlink di sini..."
            value={url}
            onChange={(e) => onInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && resolve()}
            disabled={busy}
          />
          <button className="primary" onClick={resolve} disabled={busy}>
            {busy ? "Bypassing..." : "Bypass"}
          </button>
        </div>
        {detected && <div className="detected-badge">• {detected}</div>}
      </div>

      {status && <div className={`status ${status.type}`}>{status.text}</div>}

      {result && (
        <div className="result-card">
          <div className="result-top">
            <span className="result-badge">✓ URL Ditemukan</span>
            <button className="ghost" onClick={copy}>
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <div className="result-url" title={result.url}>{result.url}</div>
          <div className="result-meta">
            <span className="tag">{detected || "organic"}</span>
            <span className="tag">{result.method}</span>
            <span className="tag">{result.elapsed}s</span>
            <span className="tag">{result.logs.length} step</span>
          </div>
          {result.logs.length > 0 && (
            <details className="logs" open>
              <summary>Proses Bypass</summary>
              <pre>{result.logs.join("\n")}</pre>
            </details>
          )}
        </div>
      )}
    </section>
  );
}