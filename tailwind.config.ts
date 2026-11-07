import type { Config } from "tailwindcss";

/**
 * Tailwind CSS Configuration with Red Broadcast and Clean Minimal Enterprise (Slate/Zinc) Tokens.
 *
 * Supports real-time dashboard UI for Single-Page Application (SPA) architecture,
 * edge caching over Content Delivery Network (CDN), and bidirectional WebSocket
 * communications with the Asynchronous Server Gateway Interface (ASGI) backend.
 *
 * Voice Actor Attribution: คุณพิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert) - Thai Yuta Okkotsu TTS
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-prompt)", "var(--font-roboto)", "var(--font-kanit)", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "var(--font-roboto-mono)", "monospace"],
      },
      colors: {
        // Semantic HSL Design Tokens (Clean Minimal Enterprise / Slate-Zinc)
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },

        // Red Broadcast Design System Tokens
        "broadcast-red": {
          DEFAULT: "#FF0000",
          hover: "#CC0000",
        },
        "broadcast-red-hover": "#CC0000",
        "broadcast-dark": "#0F0F0F",
        "broadcast-surface-light": "#F2F2F2",
        "broadcast-surface-dark": "#272727",
        "broadcast-blue": "#065FD4",
        "broadcast-border-light": "#E5E5E5",
        "broadcast-border-dark": "#3F3F3F",

        // Platform & Glass compatibility tokens
        "tiktok-cyan": "#00f2fe",
        "tiktok-red": "#fe2c55",
        "glass-border": "rgba(255, 255, 255, 0.12)",
        "glass-surface": "rgba(255, 255, 255, 0.04)",
        "glass-surface-hover": "rgba(255, 255, 255, 0.08)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      backdropBlur: {
        "3xl": "64px",
      },
    },
  },
  plugins: [],
};

export default config;
