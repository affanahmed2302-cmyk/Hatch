"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { finalizeOAuthSession } from "@/lib/googleAuth";

export default function AuthCallbackPage() {
  const [err, setErr] = useState("");
  const [hint, setHint] = useState("");
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const res = await finalizeOAuthSession();
      if (!res.ok) {
        setErr(res.error || "Sign-in failed");
        if (res.error?.includes("Redirect") || res.error?.includes("session")) {
          setHint(
            "Admin tip: Supabase Dashboard → Authentication → URL Configuration → Redirect URLs must include https://hatch-primeora.vercel.app/auth/callback"
          );
        }
        return;
      }
      router.replace(res.next || "/home");
    })();
  }, [router]);

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
      {err ? (
        <>
          <div className="logo" style={{ marginBottom: 16 }}>
            HATCH
          </div>
          <h1 className="h1" style={{ fontSize: 20, marginBottom: 10 }}>
            Couldn&apos;t finish Google login
          </h1>
          <div className="fail" style={{ marginBottom: 12 }}>
            {err}
          </div>
          {hint && (
            <p className="muted" style={{ fontSize: 12, marginBottom: 14, lineHeight: 1.45 }}>
              {hint}
            </p>
          )}
          <Link href="/login" className="btn">
            Back to login
          </Link>
        </>
      ) : (
        <div style={{ textAlign: "center" }}>
          <div className="logo" style={{ marginBottom: 12 }}>
            HATCH
          </div>
          <p className="muted" style={{ fontSize: 13 }}>
            Finishing college Google sign-in…
          </p>
        </div>
      )}
    </div>
  );
}
