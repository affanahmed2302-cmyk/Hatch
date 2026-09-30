"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase, isSuperAdmin } from "@/lib/supabase";

/** Floating pilot button — only visible to super-admin on non-pilot pages */
export default function PilotButton() {
  const [show, setShow] = useState(false);
  const path = usePathname();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setShow(!!user && isSuperAdmin(user.email));
    })();
  }, [path]);

  if (!show) return null;
  if (path === "/pilot" || path.startsWith("/login") || path.startsWith("/signup")) return null;

  return (
    <Link
      href="/pilot"
      style={{
        position: "fixed",
        right: 14,
        bottom: 78,
        zIndex: 90,
        width: 52,
        height: 52,
        borderRadius: "50%",
        background: "linear-gradient(135deg,#7c3aed,#db2777)",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 900,
        fontSize: 18,
        textDecoration: "none",
        boxShadow: "0 8px 24px rgba(124,58,237,0.45)",
        border: "2px solid rgba(255,255,255,0.25)",
      }}
      title="CEO Pilot"
      aria-label="CEO Pilot control panel"
    >
      ✈
    </Link>
  );
}
