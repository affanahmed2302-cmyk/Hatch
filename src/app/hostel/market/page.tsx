"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, displayName } from "@/lib/supabase";
import { createHostelListing, fetchHostelListings } from "@/lib/hostel";

const KINDS = [
  { id: "sale" as const, label: "For sale" },
  { id: "borrow" as const, label: "Want to borrow" },
  { id: "lend" as const, label: "Can lend" },
  { id: "free" as const, label: "Free" },
];

export default function HostelMarketPage() {
  const [kind, setKind] = useState<"sale" | "borrow" | "lend" | "free">("sale");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");
  const [list, setList] = useState<any[]>([]);
  const [uid, setUid] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUid(user.id);
      setList(await fetchHostelListings(40));
    })();
  }, [router]);

  async function post() {
    if (!uid) return;
    const res = await createHostelListing(uid, {
      title,
      description: desc,
      kind,
      price: price || undefined,
    });
    if (!res.ok) { setErr(res.error || "Failed"); return; }
    setTitle("");
    setDesc("");
    setPrice("");
    setMsg("Listed");
    setList(await fetchHostelListings(40));
  }

  return (
    <div className="shell">
      <div className="topbar">
        <Link href="/hostel" className="btn-ghost btn-sm">←</Link>
        <div className="logo" style={{ fontSize: 16 }}>Marketplace</div>
      </div>
      <div className="page">
        <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
          Peer listings only — chat in Hatch. No in-app payments.
        </p>
        {msg && <div className="ok" style={{ marginBottom: 10 }}>{msg}</div>}
        {err && <div className="fail" style={{ marginBottom: 10 }}>{err}</div>}
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>New listing</div>
          <div className="row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            {KINDS.map((k) => (
              <button key={k.id} type="button" className={kind === k.id ? "chip on" : "chip"} onClick={() => setKind(k.id)}>
                {k.label}
              </button>
            ))}
          </div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Item title" style={{ marginBottom: 8 }} />
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Condition / details" rows={2} style={{ marginBottom: 8, width: "100%" }} />
          <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price or terms (optional)" style={{ marginBottom: 8 }} />
          <button type="button" className="btn" style={{ width: "100%" }} disabled={!title.trim()} onClick={post}>
            Publish
          </button>
        </div>
        {list.map((item) => (
          <div key={item.id} className="card" style={{ marginBottom: 10 }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <strong>{item.title}</strong>
              <span className="badge">{item.kind}</span>
            </div>
            {item.description && <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>{item.description}</p>}
            <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              {displayName(item.profile || {})}{item.price ? ` · ${item.price}` : ""}
            </p>
            {item.user_id !== uid && (
              <Link href={"/chat/" + item.user_id} className="btn btn-sm" style={{ marginTop: 8 }}>Message</Link>
            )}
          </div>
        ))}
        {!list.length && <p className="muted">No listings yet — publish the first.</p>}
      </div>
    </div>
  );
}
