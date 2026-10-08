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
    icon: [{ url: "/icon.svg?v=energy-h-v5", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg?v=energy-h-v5" }],
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon.svg?v=energy-h-v5" />
        <link rel="icon" href="/icon.svg?v=energy-h-v5" type="image/svg+xml" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Hatch" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
