"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Campus Perks removed — redirect to Challenges */
export default function PerksRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/challenges");
  }, [router]);
  return (
    <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span className="muted">…</span>
    </div>
  );
}
