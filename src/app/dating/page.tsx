"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Canonical alias: /dating → /sparks (Campus Sparks sister app) */
export default function DatingRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/sparks");
  }, [router]);
  return (
    <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span className="muted">Opening Campus Sparks…</span>
    </div>
  );
}
