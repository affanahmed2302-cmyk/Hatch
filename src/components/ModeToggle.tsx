"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { HatchMode, isValidMode, readLocalMode, writeLocalMode } from "@/lib/mode";

/** Global Professional / Social / Both toggle */
export default function ModeToggle({ compact = false }: { compact?: boolean }) {
  const [mode, setMode] = useState<HatchMode>("both");
  const [uid, setUid] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setMode(readLocalMode());
    supabase.auth.getUser().then(({ data }) => {
      const id = data.user?.id || null;
      setUid(id);
      if (!id) return;
      supabase
        .from("profiles")
        .select("profile_mode")
        .eq("id", id)
        .maybeSingle()
        .then(({ data: p }) => {
          if (isValidMode(p?.profile_mode)) {
            setMode(p.profile_mode);
            writeLocalMode(p.profile_mode);
          }
        });
    });
  }, []);

  async function pick(m: HatchMode) {
    setMode(m);
    writeLocalMode(m);
    if (uid) {
      await supabase
        .from("profiles")
        .update({ profile_mode: m, updated_at: new Date().toISOString() })
        .eq("id", uid);
    }
    router.refresh();
  }

  const btn = (m: HatchMode, label: string) => (
    <button
      key={m}
      type="button"
      onClick={() => pick(m)}
      className={mode === m ? "btn btn-sm" : "btn-ghost btn-sm"}
      style={{
        padding: compact ? "6px 10px" : undefined,
        fontSize: compact ? 11 : 12,
        fontWeight: 700,
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      className="row"
      style={{
        gap: 4,
        flexWrap: "wrap",
        padding: compact ? 0 : "4px",
        borderRadius: 12,
        background: compact ? "transparent" : "rgba(255,255,255,0.04)",
      }}
      role="group"
      aria-label="App mode"
    >
      {btn("professional", "Pro")}
      {btn("social", "Social")}
      {btn("both", "Both")}
    </div>
  );
}
