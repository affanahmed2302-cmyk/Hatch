/** Map raw JS/React errors → plain-English root cause for founders & students */

export type Diagnosed = {
  title: string;
  rootCause: string;
  hint: string;
  raw: string;
  stack?: string;
  name?: string;
};

function str(e: unknown): string {
  if (e == null) return "Unknown error";
  if (typeof e === "string") return e;
  if (e instanceof Error) return e.message || e.name || String(e);
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

function stackOf(e: unknown): string | undefined {
  if (e instanceof Error && e.stack) return e.stack.slice(0, 2500);
  return undefined;
}

function nameOf(e: unknown): string | undefined {
  if (e instanceof Error && e.name) return e.name;
  return undefined;
}

export function diagnoseError(err: unknown, context?: string): Diagnosed {
  const raw = str(err);
  const stack = stackOf(err);
  const name = nameOf(err);
  const lower = raw.toLowerCase();
  const full = (raw + " " + (stack || "")).toLowerCase();

  if (
    full.includes("insertbefore") ||
    full.includes("removechild") ||
    full.includes("not a child of this node") ||
    full.includes("notfounderror")
  ) {
    return {
      title: "DOM conflict (splash / navigation)",
      rootCause:
        "React tried to update the page after something removed or moved a DOM node React still owned (often the splash #hatch-boot via .remove()). This shows up when you open another tab/route.",
      hint: "Fixed in v5.16.3 — splash only hides nodes, never removes them. Hard refresh once.",
      raw,
      stack,
      name,
    };
  }
  if (full.includes("invalid regular expression") || full.includes("nothing to repeat")) {
    return {
      title: "Broken recovery script",
      rootCause: "A regex in the page recovery code was invalid (/?$). Opening with ?fix=1 crashed the app before React loaded.",
      hint: "Fixed in v5.16.1+. Hard-refresh or clear site data if you still see an old cache.",
      raw,
      stack,
      name,
    };
  }
  if (full.includes("chunkloaderror") || full.includes("loading chunk") || full.includes("failed to fetch dynamically imported module")) {
    return {
      title: "Stale app cache",
      rootCause: "The browser loaded an old JavaScript chunk that no longer exists after a deploy (service worker / cache mismatch).",
      hint: "Clear site data for hatch-primeora.vercel.app, or open the site in a private tab.",
      raw,
      stack,
      name,
    };
  }
  if (full.includes("networkerror") || full.includes("failed to fetch") || full.includes("load failed") || full.includes("net::")) {
    return {
      title: "Network / API failure",
      rootCause: "A request to Supabase, Razorpay, or another API failed (offline, blocked, or server down).",
      hint: "Check internet. If online, check Supabase project status and Vercel env keys.",
      raw,
      stack,
      name,
    };
  }
  if (full.includes("jwt") || full.includes("invalid session") || full.includes("refresh_token") || full.includes("auth session missing")) {
    return {
      title: "Auth session expired",
      rootCause: "Supabase session is missing or invalid. User needs to log in again.",
      hint: "Go to /login and sign in again.",
      raw,
      stack,
      name,
    };
  }
  if (full.includes("row-level security") || full.includes("rls") || full.includes("permission denied for table") || full.includes("42501")) {
    return {
      title: "Database permission (RLS)",
      rootCause: "Supabase Row Level Security blocked this read/write. Policy missing or user not allowed.",
      hint: "Check RLS policies on the table in Supabase SQL editor.",
      raw,
      stack,
      name,
    };
  }
  if (full.includes("relation") && full.includes("does not exist")) {
    return {
      title: "Missing database table",
      rootCause: "Code queried a table that does not exist in Supabase yet.",
      hint: "Run the matching .sql migration in Supabase (e.g. lounge, opportunities, lost_found).",
      raw,
      stack,
      name,
    };
  }
  if (name === "TypeError" && (lower.includes("undefined") || lower.includes("null"))) {
    return {
      title: "Null / undefined access",
      rootCause: "Code read a property on null or undefined (missing API data or race before load finished).",
      hint: context
        ? `Check data loading on: ${context}`
        : "Check the stack for the file that accessed .something on empty data.",
      raw,
      stack,
      name,
    };
  }
  if (full.includes("hydration") || full.includes("did not match")) {
    return {
      title: "React hydration mismatch",
      rootCause: "Server-rendered HTML did not match the first client render.",
      hint: "Avoid Date.now()/window in first render; gate client-only UI with useEffect.",
      raw,
      stack,
      name,
    };
  }

  return {
    title: name || "App error",
    rootCause: raw || "No message provided by the runtime.",
    hint: context
      ? `Happened near: ${context}. Copy the stack and search the repo for that file.`
      : "Copy message + stack. Search the repo for the top file name in the stack.",
    raw,
    stack,
    name,
  };
}

const LAST_KEY = "hatch_last_error_v1";

export function saveLastError(d: Diagnosed) {
  try {
    sessionStorage.setItem(
      LAST_KEY,
      JSON.stringify({
        ...d,
        at: new Date().toISOString(),
        path: typeof location !== "undefined" ? location.pathname : "",
      })
    );
  } catch {
    /* */
  }
}

export function readLastError(): (Diagnosed & { at?: string; path?: string }) | null {
  try {
    const raw = sessionStorage.getItem(LAST_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearLastError() {
  try {
    sessionStorage.removeItem(LAST_KEY);
  } catch {
    /* */
  }
}
