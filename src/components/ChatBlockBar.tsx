"use client";
import { useState } from "react";
import { blockUser } from "@/lib/blocks";

/** Soft isolation — after block, person disappears from feeds; no drama banner to them */
export default function ChatBlockBar({
  myId,
  peerId,
  peerName,
  onBlocked,
}: {
  myId: string;
  peerId: string;
  peerName: string;
  onBlocked?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <p className="muted" style={{ fontSize: 12, padding: "8px 12px" }}>
        Blocked — they won&apos;t appear in your chats, radar, or pinches.
      </p>
    );
  }

  return (
    <div style={{ padding: "6px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <button
        type="button"
        className="btn-ghost btn-sm"
        disabled={busy}
        style={{ fontSize: 12, color: "#fb7185" }}
        onClick={async () => {
          if (!confirm(`Block ${peerName}? They won't be able to message or pinch you.`)) return;
          setBusy(true);
          const res = await blockUser(myId, peerId);
          setBusy(false);
          if (res.ok) {
            setDone(true);
            onBlocked?.();
          } else {
            alert(res.error || "Block failed — run sql/blocks_pinches.sql");
          }
        }}
      >
        Block
      </button>
    </div>
  );
}
