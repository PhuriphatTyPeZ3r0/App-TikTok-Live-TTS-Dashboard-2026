import type { Metadata } from "next";
import { Prompt, JetBrains_Mono, Roboto, Roboto_Mono, Kanit } from "next/font/google";
import { ThemeProvider } from "../context/ThemeContext";
import "./globals.css";

/**
 * StreamVox Live & Red Broadcast Typography Loaders:
 * Prompt (300, 400, 500, 600, 700) - Primary Thai & Latin UI font for StreamVox Live.
 * JetBrains Mono (400, 600) - Telemetry, audio levels, timestamps, and diagnostics.
 * Roboto, Roboto Mono, Kanit - Maintained for backward compatibility with design tokens.
 */
const promptFont = Prompt({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["thai", "latin"],
  variable: "--font-prompt",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  weight: ["400", "600"],
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

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
      className={`${promptFont.variable} ${jetbrainsMono.variable} ${roboto.variable} ${robotoMono.variable} ${kanit.variable} dark`}
      suppressHydrationWarning
    >
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body className={`${promptFont.className} font-sans antialiased bg-white dark:bg-broadcast-dark text-broadcast-dark dark:text-white min-h-screen transition-colors duration-200`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
