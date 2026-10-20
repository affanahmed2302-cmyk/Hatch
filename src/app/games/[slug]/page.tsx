"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getGame } from "@/lib/games/catalog";
import { TRUTHS, DARES, NEVER, MOST_LIKELY, RATHER, CHARADES, HOT_SEAT, RAPID, WHO, STORY, pick, pickIndex } from "@/lib/games/prompts";
import Nav from "@/components/Nav";

export default function GamePlayPage() {
  const params = useParams();
  const slug = String(params?.slug || "");
  const game = getGame(slug);
  const [mode, setMode] = useState<"truth" | "dare">("truth");
  const [idx, setIdx] = useState(() => pickIndex(500));
  const [line, setLine] = useState("");
  const [rather, setRather] = useState<[string, string] | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  function nextPrompt() {
    if (!game) return;
    let text = "";
    if (game.slug === "truth-or-dare") {
      const deck = mode === "truth" ? TRUTHS : DARES;
      const i = pickIndex(deck.length);
      setIdx(i);
      text = deck[i];
    } else if (game.slug === "never-have-i-ever") text = pick(NEVER);
    else if (game.slug === "most-likely-to") text = pick(MOST_LIKELY);
    else if (game.slug === "would-you-rather") {
      const r = pick(RATHER);
      setRather(r);
      text = `A) ${r[0]}  OR  B) ${r[1]}`;
    } else if (game.slug === "two-truths") text = "Say three statements about yourself. Exactly one is a lie. Group votes.";
    else if (game.slug === "charades") text = `Act this out (no talking): ${pick(CHARADES)}`;
    else if (game.slug === "hot-seat") text = pick(HOT_SEAT);
    else if (game.slug === "rapid-fire") text = pick(RAPID);
    else if (game.slug === "who-am-i") text = `Identity (show others, not the guesser): ${pick(WHO)}`;
    else if (game.slug === "story-chain") text = pick(STORY);
    else text = "Pass the phone.";
    setLine(text);
    setHistory((h) => [text, ...h].slice(0, 12));
  }

  const promptView = useMemo(() => {
    if (!line && game?.slug === "truth-or-dare") return mode === "truth" ? TRUTHS[idx] : DARES[idx];
    return line;
  }, [line, game, mode, idx]);

  if (!game) {
    return (
      <div className="shell">
        <div className="page"><p className="muted">Game not found.</p><Link href="/games" className="btn btn-sm">All games</Link></div>
        <Nav />
      </div>
    );
  }

  return (
    <div className="shell">
      <div className="topbar">
        <Link href="/games" className="btn-ghost btn-sm">← Games</Link>
        <div className="logo" style={{ fontSize: 14, marginLeft: 8 }}>{game.icon} {game.name}</div>
      </div>
      <div className="page stack">
        <p className="muted" style={{ fontSize: 13 }}>{game.tagline} · {game.players}</p>
        <div className="card" style={{ borderLeft: `3px solid ${game.accent}` }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: "var(--muted)" }}>How to play</div>
          <ol style={{ paddingLeft: 18, fontSize: 13, lineHeight: 1.55 }}>
            {game.how.map((h) => (<li key={h}>{h}</li>))}
          </ol>
        </div>
        {game.slug === "truth-or-dare" && (
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className={mode === "truth" ? "btn btn-sm" : "btn-ghost btn-sm"} onClick={() => { setMode("truth"); setLine(""); setIdx(pickIndex(TRUTHS.length)); }}>Truth ({TRUTHS.length})</button>
            <button type="button" className={mode === "dare" ? "btn btn-sm" : "btn-ghost btn-sm"} onClick={() => { setMode("dare"); setLine(""); setIdx(pickIndex(DARES.length)); }}>Dare ({DARES.length})</button>
          </div>
        )}
        <div className="card" style={{ minHeight: 160 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 10 }}>PROMPT</div>
          <p style={{ fontSize: 18, lineHeight: 1.45, fontWeight: 600 }}>{promptView || "Tap Next prompt"}</p>
        </div>
        <button type="button" className="btn" onClick={nextPrompt} style={{ width: "100%" }}>Next prompt</button>
        <div style={{ height: 88 }} />
      </div>
      <Nav />
    </div>
  );
}
