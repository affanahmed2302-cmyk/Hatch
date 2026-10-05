"use client";
import { useRef } from "react";

/** Bottom sheet: change photo — only opens when user taps avatar */
export default function PhotoSheet({
  open,
  onClose,
  onFile,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  onFile: (file: File) => void;
  busy?: boolean;
}) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  function pick(file?: File | null) {
    if (file) onFile(file);
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal stack" onClick={(e) => e.stopPropagation()}>
        <div className="h2">Change profile photo</div>
        <p className="muted" style={{ fontSize: 13 }}>
          {busy ? "Uploading…" : "Pick one option"}
        </p>
        <button
          className="btn"
          disabled={busy}
          onClick={() => galleryRef.current?.click()}
        >
          Photo library
        </button>
        <button
          className="btn-ghost"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          Choose file
        </button>
        <button
          className="btn-ghost"
          disabled={busy}
          onClick={() => cameraRef.current?.click()}
        >
          Take photo
        </button>
        <button className="btn-ghost" onClick={onClose} disabled={busy}>
          Cancel
        </button>

        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="user"
          hidden
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
