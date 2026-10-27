import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: { default: "CabinSafe Intelligence", template: "%s · CabinSafe" },
  description: "Private aviation cabin safety command center — demonstration prototype with synthetic data.",
  applicationName: "CabinSafe",
  appleWebApp: { capable: true, title: "CabinSafe", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F2F2F0" },
    { media: "(prefers-color-scheme: dark)", color: "#0C141D" },
  ],
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Applies the saved appearance, and covers the page if the opening sequence is about to play, before first paint.
const THEME_SCRIPT = `try{var t=localStorage.getItem("cabinsafe-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}try{var l=location;if(/[?&]intro=1/.test(l.search)||(l.pathname==="/"&&!sessionStorage.getItem("cabinsafe-intro-seen")))document.documentElement.dataset.intro="1"}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-lg focus:bg-gold focus:px-3 focus:py-2 focus:text-midnight">
          Skip to content
        </a>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
