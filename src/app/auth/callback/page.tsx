"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { finalizeOAuthSession } from "@/lib/googleAuth";

export default function AuthCallbackPage() {
  const [err, setErr] = useState("");
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const res = await finalizeOAuthSession();
      if (!res.ok) {
        setErr(res.error || "Sign-in failed");
        return;
      }
      router.replace(res.next || "/home");
    })();
  }, [router]);

  return (
    <div className="shell" style={{ padding: 24, display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "100dvh" }}>
      <div className="logo" style={{ marginBottom: 16 }}>HATCH</div>
      {err ? (
        <>
          <div className="fail" style={{ marginBottom: 12 }}>{err}</div>
          <Link href="/login" className="btn">Back to login</Link>
        </>
      ) : (
        <p className="muted">Finishing Google sign-in…</p>
      )}
    </div>
  );
}
