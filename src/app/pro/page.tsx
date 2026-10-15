"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Nav from "@/components/Nav";
import ModeToggle from "@/components/ModeToggle";
import { PRO_FEATURES } from "@/lib/mode";

/** Professional Mode hub — career, schedule, vault, placement */
export default function ProHubPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setReady(true);
    })();
  }, [router]);

  if (!ready) {
    return (
      <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="muted">…</span>
      </div>
    );
  }

  return (
    <div className="shell">
      <div className="topbar" style={{ gap: 8 }}>
        <div className="logo" style={{ fontSize: 15 }}>PRO</div>
        <ModeToggle compact />
        <Link href="/home" className="btn-ghost btn-sm" style={{ marginLeft: "auto" }}>
          Home
        </Link>
      </div>
      <div className="page">
        <h1 className="h1" style={{ fontSize: 22, marginBottom: 6 }}>Professional</h1>
        <p className="muted" style={{ fontSize: 13, marginBottom: 16, lineHeight: 1.45 }}>
          Time, academics, portfolio, placements — built for BMSCE.
        </p>
        <div style={{ display: "grid", gap: 10 }}>
          {PRO_FEATURES.map((f) => (
            <Link
              key={f.href + f.title}
              href={f.href}
              className="card"
              style={{
                textDecoration: "none",
                color: "inherit",
                border: "1px solid rgba(34,211,238,0.25)",
                background: "linear-gradient(160deg,rgba(34,211,238,0.1),rgba(15,15,22,0.9))",
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 15 }}>{f.title}</div>
              <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>{f.sub}</p>
            </Link>
          ))}
        </div>
        <div style={{ height: 88 }} />
      </div>
      <Nav />
    </div>
  );
}
