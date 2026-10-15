"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Explore redirects into unified Tools hub */
export default function ExploreRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/tools");
  }, [router]);
  return (
    <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span className="muted">Opening Campus Tools…</span>
    </div>
  );
}
