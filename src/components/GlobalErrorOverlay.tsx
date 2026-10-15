"use client";
import { useEffect, useState, useCallback } from "react";
import {
  diagnoseError,
  saveLastError,
  readLastError,
  clearLastError,
  type Diagnosed,
} from "@/lib/diagnoseError";

type Shown = Diagnosed & { at?: string; path?: string };

/**
 * Catches window.onerror + unhandledrejection and shows a dismissible
 * root-cause panel so founders see *why* something failed — not a blank screen.
 */
export default function GlobalErrorOverlay() {
  const [err, setErr] = useState<Shown | null>(null);
  const [copied, setCopied] = useState(false);

  const show = useCallback((raw: unknown, context?: string) => {
    const d = diagnoseError(raw, context);
    saveLastError(d);
    setErr({ ...d, at: new Date().toISOString(), path: location.pathname });
    try {
      sessionStorage.setItem("hatch_client_crash", "1");
    } catch {
      /* */
    }
  }, []);

  useEffect(() => {
    // Surface last crash after reload (optional banner)
    const last = readLastError();
    if (last && sessionStorage.getItem("hatch_show_last_error") === "1") {
      sessionStorage.removeItem("hatch_show_last_error");
      setErr(last);
    }

    const onError = (event: ErrorEvent) => {
      // Ignore noisy resize/script extension noise
      if (!event.message && !event.error) return;
      show(event.error || event.message, event.filename ? `${event.filename}:${event.lineno}` : "window.onerror");
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      show(event.reason, "unhandledrejection");
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, [show]);

  if (!err) return null;

  async function copy() {
    const text = [
      `Title: ${err!.title}`,
      `Root cause: ${err!.rootCause}`,
      `Hint: ${err!.hint}`,
      `Raw: ${err!.raw}`,
      err!.stack ? `Stack:\n${err!.stack}` : "",
      `Path: ${err!.path || location.pathname}`,
      `At: ${err!.at || ""}`,
      `URL: ${location.href}`,
    ]
      .filter(Boolean)
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* */
    }
  }

  return (
    <div
      role="alert"
      style={{
        position: "fixed",
        left: 12,
        right: 12,
        bottom: 12,
        zIndex: 100000,
        maxWidth: 420,
        margin: "0 auto",
        padding: 14,
        borderRadius: 16,
        background: "rgba(20,10,16,0.96)",
        border: "1px solid rgba(248,113,113,0.45)",
        boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
        color: "#f4f4f8",
        fontFamily: "-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: "#f87171" }}>ROOT CAUSE</div>
          <div style={{ fontWeight: 800, fontSize: 15, marginTop: 4 }}>{err.title}</div>
        </div>
        <button
          type="button"
          onClick={() => {
            clearLastError();
            setErr(null);
          }}
          style={{
            background: "transparent",
            border: "none",
            color: "#a1a1aa",
            fontSize: 18,
            lineHeight: 1,
            cursor: "pointer",
            padding: 4,
          }}
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
      <p style={{ fontSize: 13, marginTop: 8, lineHeight: 1.4, color: "#fecaca" }}>{err.rootCause}</p>
      <p style={{ fontSize: 12, marginTop: 6, lineHeight: 1.4, color: "#a1a1aa" }}>{err.hint}</p>
      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={copy}
          style={{
            flex: 1,
            minWidth: 120,
            padding: "10px 12px",
            borderRadius: 12,
            border: "none",
            background: "linear-gradient(135deg,#a855f7,#ec4899)",
            color: "#fff",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          {copied ? "Copied" : "Copy root cause"}
        </button>
        <button
          type="button"
          onClick={() => location.reload()}
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.15)",
            background: "transparent",
            color: "#e4e4e7",
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Reload
        </button>
      </div>
      {err.raw && (
        <details style={{ marginTop: 10 }}>
          <summary style={{ fontSize: 11, color: "#71717a", cursor: "pointer" }}>Raw message</summary>
          <pre
            style={{
              marginTop: 6,
              fontSize: 10,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              maxHeight: 120,
              overflow: "auto",
              color: "#d4d4d8",
            }}
          >
            {err.raw}
            {err.stack ? "\n\n" + err.stack.slice(0, 800) : ""}
          </pre>
        </details>
      )}
    </div>
  );
}
