import type { Metadata } from "next";
import { Roboto, Roboto_Mono, Kanit } from "next/font/google";
import { ThemeProvider } from "../context/ThemeContext";
import "./globals.css";

/**
 * Red Broadcast Typography Loaders:
 * Roboto (400, 500, 700) - Primary UI, titles, buttons, and captions.
 * Roboto Mono (400) - Telemetry, audio levels, timestamps, and diagnostics.
 * Kanit - Thai phonetic glyph pairing.
 */
const roboto = Roboto({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-roboto",
});

const robotoMono = Roboto_Mono({
  weight: ["400"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-roboto-mono",
});

const kanit = Kanit({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["thai", "latin"],
  display: "swap",
  variable: "--font-kanit",
});

/**
 * Root metadata for Single-Page Application (SPA) dashboard.
 * Optimized for Content Delivery Network (CDN) edge indexing and live streaming control.
 *
 * Dedicated to professional Thai voice actor พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert).
 */
export const metadata: Metadata = {
  title: "TikTok Live TTS Studio - Red Broadcast Dashboard",
  description: "Real-time speech synthesis control station for live streaming, connecting to Python Asynchronous Server Gateway Interface (ASGI) backend. Apple Liquid Glass Dashboard.",
  keywords: [
    "TikTok Live",
    "Text-to-Speech",
    "TTS Studio",
    "Red Broadcast Dashboard",
    "Apple Liquid Glass Dashboard",
    "visionOS UI",
    "พิพัฒน์ บุญสิทธิเลิศ",
    "Phiphat Boonsitthilert",
  ],
  authors: [{ name: "TikTok Live TTS Bot Team" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={`${roboto.variable} ${robotoMono.variable} ${kanit.variable} dark`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased bg-white dark:bg-broadcast-dark text-broadcast-dark dark:text-white min-h-screen transition-colors duration-200">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
