import type { Metadata } from "next";
import { ThemeProvider } from "../context/ThemeContext";
import { DashboardProvider } from "../context/DashboardContext";
import { PersistentAudioPlayer } from "../components/PersistentAudioPlayer";
import "./globals.css";

/**
 * Root metadata for Single-Page Application (SPA) dashboard.
 * Optimized for Content Delivery Network (CDN) edge indexing and live streaming control.
 *
 * Dedicated to professional Thai voice actor พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert).
 */
export const metadata: Metadata = {
  title: "StreamVox Live — TikTok Live TTS Studio",
  description: "StreamVox Live: Real-time speech synthesis control station for live streaming, connecting to Python Asynchronous Server Gateway Interface (ASGI) backend. Apple Liquid Glass Dashboard.",
  keywords: [
    "StreamVox Live",
    "TikTok Live",
    "Text-to-Speech",
    "TTS Studio",
    "Red Broadcast Dashboard",
    "Apple Liquid Glass Dashboard",
    "visionOS UI",
    "พิพัฒน์ บุญสิทธิเลิศ",
    "Phiphat Boonsitthilert",
  ],
  authors: [{ name: "StreamVox Live Team" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className="dark"
      style={
        {
          "--font-roboto": "var(--font-prompt), sans-serif",
          "--font-roboto-mono": "var(--font-jetbrains-mono), monospace",
          "--font-kanit": "var(--font-prompt), sans-serif",
        } as React.CSSProperties
      }
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body className="font-sans antialiased bg-white dark:bg-broadcast-dark text-broadcast-dark dark:text-white min-h-screen min-h-[100dvh] transition-colors duration-200">
        <ThemeProvider>
          <DashboardProvider>
            <div className="pb-20 sm:pb-20 min-h-screen min-h-[100dvh] flex flex-col">
              {children}
            </div>
            <PersistentAudioPlayer />
          </DashboardProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
