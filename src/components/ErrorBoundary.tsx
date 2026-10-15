"use client";
import React from "react";
import { diagnoseError, saveLastError, type Diagnosed } from "@/lib/diagnoseError";

type Props = { children: React.ReactNode };
type State = { hasError: boolean; diagnosed: Diagnosed | null };

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, diagnosed: null };

  static getDerivedStateFromError(err: Error): State {
    const diagnosed = diagnoseError(err, "React render");
    return { hasError: true, diagnosed };
  }

  componentDidCatch(err: Error, info: React.ErrorInfo) {
    const diagnosed = diagnoseError(err, info?.componentStack?.split("\n")[1]?.trim() || "React tree");
    if (info?.componentStack) {
      diagnosed.stack = (diagnosed.stack || "") + "\n\n— Component stack —\n" + info.componentStack.slice(0, 1500);
    }
    saveLastError(diagnosed);
    this.setState({ diagnosed });
    console.error("[Hatch ErrorBoundary]", err, info);
  }

  copyDetails = () => {
    const d = this.state.diagnosed;
    if (!d) return;
    const text = [
      `Title: ${d.title}`,
      `Root cause: ${d.rootCause}`,
      `Hint: ${d.hint}`,
      `Raw: ${d.raw}`,
      d.name ? `Name: ${d.name}` : "",
      d.stack ? `Stack:\n${d.stack}` : "",
      `URL: ${typeof location !== "undefined" ? location.href : ""}`,
      `Time: ${new Date().toISOString()}`,
    ]
      .filter(Boolean)
      .join("\n\n");
    try {
      void navigator.clipboard.writeText(text);
    } catch {
      /* */
    }
  };

  render() {
    if (this.state.hasError && this.state.diagnosed) {
      const d = this.state.diagnosed;
      return (
        <div
          className="shell"
          style={{
            padding: 20,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            minHeight: "100dvh",
            maxWidth: 480,
            margin: "0 auto",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", color: "#f87171", marginBottom: 8 }}>
            ROOT CAUSE
          </div>
          <h1 className="h1" style={{ fontSize: 20, marginBottom: 8 }}>
            {d.title}
          </h1>
          <div
            style={{
              padding: 14,
              borderRadius: 14,
              background: "rgba(248,113,113,0.12)",
              border: "1px solid rgba(248,113,113,0.35)",
              marginBottom: 12,
            }}
          >
            <p style={{ fontSize: 14, lineHeight: 1.45, fontWeight: 600 }}>{d.rootCause}</p>
          </div>
          <p className="muted" style={{ fontSize: 13, marginBottom: 14, lineHeight: 1.45 }}>
            <strong style={{ color: "#e9d5ff" }}>What to do:</strong> {d.hint}
          </p>
          <div className="row" style={{ gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <button
              className="btn"
              type="button"
              onClick={() => {
                this.setState({ hasError: false, diagnosed: null });
                if (typeof window !== "undefined") window.location.reload();
              }}
            >
              Refresh
            </button>
            <button className="btn-ghost" type="button" onClick={this.copyDetails}>
              Copy root cause
            </button>
            <a href="/home" className="btn-ghost" style={{ display: "inline-flex", alignItems: "center" }}>
              Go home
            </a>
          </div>
          <details style={{ marginTop: 8 }}>
            <summary className="muted" style={{ fontSize: 12, cursor: "pointer" }}>
              Technical details (stack)
            </summary>
            <pre
              style={{
                marginTop: 10,
                padding: 12,
                borderRadius: 12,
                background: "rgba(0,0,0,0.45)",
                fontSize: 10,
                lineHeight: 1.4,
                overflow: "auto",
                maxHeight: 220,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {[d.name, d.raw, d.stack].filter(Boolean).join("\n\n")}
            </pre>
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}
