"use client";

import { displayName } from "@/lib/supabase";

type Props = {
  profile?: {
    full_name?: string | null;
    username?: string | null;
    email?: string | null;
    avatar_url?: string | null;
  } | null;
  size?: number;
  online?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

/** Consistent identity avatar — photo or initials. Never invents a face. */
export default function Avatar({ profile, size = 48, online, className, style }: Props) {
  const name = displayName(profile || null);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("") || "?";
  const url = profile?.avatar_url || "";

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        position: "relative",
        background: url
          ? `url(${url}) center/cover no-repeat`
          : "linear-gradient(135deg, var(--lime-soft), var(--elevated))",
        border: "1.5px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 800,
        fontSize: Math.max(11, size * 0.32),
        color: "var(--lime)",
        letterSpacing: "0.02em",
        ...style,
      }}
      aria-hidden
    >
      {!url && initials}
      {online != null && (
        <span
          style={{
            position: "absolute",
            right: 0,
            bottom: 0,
            width: Math.max(8, size * 0.22),
            height: Math.max(8, size * 0.22),
            borderRadius: "50%",
            background: online ? "var(--emerald)" : "var(--muted)",
            border: "2px solid var(--bg)",
          }}
        />
      )}
    </div>
  );
}
