import type { Metadata } from "next";
import { Kanit } from "next/font/google";
import "./globals.css";

/**
 * Kanit font loader configured with Thai and Latin sub-character subsets.
 * Provides modern typography pairing for TikTok Live TTS control interfaces.
 */
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
  title: "TikTok Live TTS Studio - Apple Liquid Glass Dashboard",
  description: "Real-time speech synthesis control station for live streaming, connecting to Python Asynchronous Server Gateway Interface (ASGI) backend.",
  keywords: [
    "TikTok Live",
    "Text-to-Speech",
    "TTS Studio",
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
    <html lang="th" className={`${kanit.variable} dark`}>
      <body className="font-sans antialiased bg-[#050508] text-white min-h-screen ambient-glow selection:bg-[#fe2c55]/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
