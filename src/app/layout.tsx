import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  metadataBase: new URL("https://hatch-primeora.vercel.app"),
  title: {
    default: "Hatch — BMS Campus Network",
    template: "%s · Hatch",
  },
  description:
    "Find teammates. Chat. I'm Free on campus. Optional Sparks. Built for BMSCE students.",
  applicationName: "Hatch",
  manifest: "/manifest.json",
  openGraph: {
    title: "Hatch — BMS Campus Network",
    description: "College network for BMSCE — people, chat, presence, Sparks.",
    url: "https://hatch-primeora.vercel.app",
    siteName: "Hatch",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Hatch — BMS Campus Network",
    description: "Find teammates. Chat. Campus presence.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Hatch",
  },
  formatDetection: { telephone: false },
  other: {
    "mobile-web-app-capable": "yes",
  },
  icons: {
    icon: [{ url: "/icon.svg?v=energy-h-v8", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg?v=energy-h-v8" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#07070c" },
    { media: "(prefers-color-scheme: light)", color: "#07070c" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

/** Runs before React. Clears poisoned SW/cache when ?fix=1 or after a client crash flag.
 *  NO fragile regex — string split only (avoids /?$/ SyntaxError on phones). */
const RECOVERY_SCRIPT = `
(function () {
  try {
    var q = location.search || "";
    var force = q.indexOf("fix=1") !== -1 || q.indexOf("nocache=1") !== -1;
    var crashed = false;
    try { crashed = sessionStorage.getItem("hatch_client_crash") === "1"; } catch (e) {}
    if (!force && !crashed) return;
    try { sessionStorage.removeItem("hatch_client_crash"); } catch (e) {}
    var done = function () {
      if (force) {
        location.replace(location.pathname + location.hash || "/");
        return;
      }
      location.replace(location.pathname + location.hash || "/");
    };
    var tasks = [];
    if ("serviceWorker" in navigator) {
      tasks.push(
        navigator.serviceWorker.getRegistrations().then(function (regs) {
          return Promise.all(regs.map(function (r) { return r.unregister(); }));
        })
      );
    }
    if ("caches" in window) {
      tasks.push(
        caches.keys().then(function (keys) {
          return Promise.all(keys.map(function (k) { return caches.delete(k); }));
        })
      );
    }
    Promise.all(tasks).then(done).catch(done);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon.svg?v=energy-h-v8" />
        <link rel="icon" href="/icon.svg?v=energy-h-v8" type="image/svg+xml" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Hatch" />
        <meta name="mobile-web-app-capable" content="yes" />
        <script dangerouslySetInnerHTML={{ __html: RECOVERY_SCRIPT }} />
        <style
          dangerouslySetInnerHTML={{
            __html: `
#hatch-boot{position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#07070c;color:#f4f4f8;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",Roboto,sans-serif}
#hatch-boot .hatch-boot-mark{font-weight:900;font-size:clamp(40px,12vw,64px);letter-spacing:.08em;line-height:1;background:linear-gradient(135deg,#ec4899,#a855f7,#22d3ee,#fbbf24);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
#hatch-boot .hatch-boot-sub{margin-top:12px;font-size:11px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:#6b6b80;opacity:.9}
`,
          }}
        />
      </head>
      <body>
        <div id="hatch-boot" aria-hidden="true">
          <div className="hatch-boot-mark">HATCH</div>
          <div className="hatch-boot-sub">Campus network</div>
        </div>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
