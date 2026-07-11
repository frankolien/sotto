import type { Metadata } from "next";
import { Geist, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// The confidential-ledger signature face, shared with the mobile app.
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Sotto — confidential contributor payouts on Canton",
  description:
    "Pay every contributor in one confidential batch. Each keeps their own wallet and sees only their own line. A named auditor verifies everything. Privacy is enforced by the ledger, not the app.",
  metadataBase: new URL("https://sotto.dev"),
  openGraph: {
    title: "Sotto — confidential contributor payouts on Canton",
    description:
      "One batch, four kinds of eyes. Everyone keeps their own wallet and sees only what they're allowed to — enforced by the ledger.",
    type: "website",
  },
};

// Set the theme before first paint so there's no flash. Order: ?theme= override,
// then stored preference, then dark default.
const themeScript = `(function(){try{var p=new URLSearchParams(location.search).get('theme');var t=(p==='light'||p==='dark')?p:(localStorage.getItem('theme')||'dark');document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='dark';}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${geistSans.variable} ${plexMono.variable} antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-page font-sans text-ink">{children}</body>
    </html>
  );
}
