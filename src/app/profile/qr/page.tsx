"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, displayName } from "@/lib/supabase";

export default function ProfileQrPage() {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const origin = window.location.origin;
      const link = `${origin}/u/${user.id}`;
      setUrl(link);
      const { data: p } = await supabase.from("profiles").select("full_name, username").eq("id", user.id).maybeSingle();
      setName(displayName(p || {}) || "You");
      setLoading(false);
    })();
  }, [router]);

  if (loading) {
    return (
      <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="muted">…</span>
      </div>
    );
  }

  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(url)}`;

  return (
    <div className="shell">
      <div className="topbar">
        <Link href="/profile" className="btn-ghost btn-sm">←</Link>
        <div className="logo" style={{ fontSize: 16 }}>My QR</div>
      </div>
      <div className="page" style={{ textAlign: "center" }}>
        <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
          Let someone scan this on campus — opens your Hatch profile. No username typing.
        </p>
        <div className="card" style={{ display: "inline-block", padding: 20, marginBottom: 16 }}>
          <img src={qrSrc} alt="Profile QR" width={240} height={240} style={{ borderRadius: 12, background: "#fff" }} />
          <p style={{ fontWeight: 800, marginTop: 12 }}>{name}</p>
        </div>
        <p className="muted" style={{ fontSize: 11, wordBreak: "break-all", marginBottom: 12 }}>{url}</p>
        <button
          type="button"
          className="btn"
          style={{ width: "100%", marginBottom: 8 }}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch { /* */ }
          }}
        >
          {copied ? "Copied" : "Copy profile link"}
        </button>
        <Link href="/profile" className="btn-ghost" style={{ display: "block", textAlign: "center" }}>Edit profile</Link>
      </div>
    </div>
  );
}
