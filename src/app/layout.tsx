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
    "Find teammates. Chat. I'm Free on campus. Built for BMSCE students.",
  applicationName: "Hatch",
  manifest: "/manifest.json",
  openGraph: {
    title: "Hatch — BMS Campus Network",
    description: "College network for BMSCE — people, chat, presence.",
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
  other: { "mobile-web-app-capable": "yes" },
  icons: {
    icon: [{ url: "/icon.svg?v=energy-h-v11", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg?v=energy-h-v11" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#10110f" },
    { media: "(prefers-color-scheme: light)", color: "#f5f4ee" },
  ],
  width: "device-width",
  initialScale: 1,
  // Allow zoom for accessibility (WCAG) — do not lock maximumScale
  viewportFit: "cover",
};

/** Before paint: recovery + hide splash if already shown this session (stops double HATCH flash) */
const BOOT_SCRIPT = `
(function () {
  try {
    var q = location.search || "";
    var force = q.indexOf("fix=1") !== -1 || q.indexOf("nocache=1") !== -1;
    var crashed = false;
    try { crashed = sessionStorage.getItem("hatch_client_crash") === "1"; } catch (e) {}
    if (force || crashed) {
      try { sessionStorage.removeItem("hatch_client_crash"); } catch (e) {}
      var done = function () {
        location.replace(location.pathname + (location.hash || ""));
      };
      var tasks = [];
      if ("serviceWorker" in navigator) {
        tasks.push(navigator.serviceWorker.getRegistrations().then(function (regs) {
          return Promise.all(regs.map(function (r) { return r.unregister(); }));
        }));
      }
      if ("caches" in window) {
        tasks.push(caches.keys().then(function (keys) {
          return Promise.all(keys.map(function (k) { return caches.delete(k); }));
        }));
      }
      Promise.all(tasks).then(done).catch(done);
      return;
    }
    try {
      if (sessionStorage.getItem("hatch_splash_done") === "1") {
        document.documentElement.classList.add("hatch-splash-skip");
      }
    } catch (e) {}
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
