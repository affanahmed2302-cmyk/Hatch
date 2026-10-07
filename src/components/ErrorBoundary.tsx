"use client";
import React from "react";

type Props = { children: React.ReactNode };
type State = { hasError: boolean; message: string };

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err?.message || "Something went wrong" };
  }

  componentDidCatch(err: Error) {
    console.error("[Hatch ErrorBoundary]", err);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="shell"
          style={{
            padding: 24,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            minHeight: "100dvh",
          }}
        >
          <h1 className="h1" style={{ fontSize: 22, marginBottom: 8 }}>
            Something broke
          </h1>
          <p className="muted" style={{ fontSize: 14, marginBottom: 16 }}>
            You can keep using Hatch. Try refreshing this page.
          </p>
          <button
            className="btn"
            type="button"
            onClick={() => {
              this.setState({ hasError: false, message: "" });
              if (typeof window !== "undefined") window.location.reload();
            }}
          >
            Refresh
          </button>
          {this.state.message && (
            <p className="muted" style={{ fontSize: 11, marginTop: 16 }}>
              {this.state.message}
            </p>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
