"""Tests for Next.js 15 Single-Page Application (SPA) scaffolding and visionOS Liquid Glass design system.

This module validates that the frontend project structure, dependencies, TypeScript
configuration, PostCSS configuration, Tailwind CSS design tokens, global visionOS frosted glass styling,
root layout with typography and metadata, and Vercel Content Delivery Network (CDN)
deployment configuration are strictly implemented.

Voice actor attribution: พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)
Backend interface: Asynchronous Server Gateway Interface (ASGI)
"""

import json
from pathlib import Path
import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
FRONTEND_DIR = REPO_ROOT / "frontend"
PACKAGE_JSON = FRONTEND_DIR / "package.json"
TSCONFIG_JSON = FRONTEND_DIR / "tsconfig.json"
TAILWIND_CONFIG = FRONTEND_DIR / "tailwind.config.ts"
POSTCSS_CONFIG = FRONTEND_DIR / "postcss.config.mjs"
GLOBALS_CSS = FRONTEND_DIR / "src" / "app" / "globals.css"
LAYOUT_TSX = FRONTEND_DIR / "src" / "app" / "layout.tsx"
VERCEL_JSON = REPO_ROOT / "vercel.json"


def test_frontend_package_json_structure():
    """Verify frontend/package.json exists, parses valid JSON, and declares required dependencies."""
    assert PACKAGE_JSON.exists(), f"Missing package.json at {PACKAGE_JSON}"
    data = json.loads(PACKAGE_JSON.read_text(encoding="utf-8"))

    assert data.get("name") == "tiktok-live-tts-dashboard"
    assert data.get("version") == "2.0.0"
    assert data.get("private") is True

    scripts = data.get("scripts", {})
    assert "dev" in scripts and "next dev" in scripts["dev"]
    assert "build" in scripts and "next build" in scripts["build"]
    assert "start" in scripts and "next start" in scripts["start"]
    assert "lint" in scripts and "next lint" in scripts["lint"]

    deps = data.get("dependencies", {})
    assert "next" in deps, "Next.js 15 dependency required"
    assert "react" in deps, "React 19 dependency required"
    assert "react-dom" in deps, "React DOM dependency required"
    assert "framer-motion" in deps, "Framer Motion animation dependency required"
    assert "lucide-react" in deps, "Lucide React icon dependency required"
    assert "clsx" in deps, "clsx conditional class utility required"
    assert "tailwind-merge" in deps, "tailwind-merge utility required"

    dev_deps = data.get("devDependencies", {})
    assert "typescript" in dev_deps, "TypeScript devDependency required"
    assert "tailwindcss" in dev_deps, "Tailwind CSS devDependency required"
    assert "postcss" in dev_deps, "PostCSS devDependency required"
    assert "autoprefixer" in dev_deps, "Autoprefixer devDependency required"
    assert "@types/node" in dev_deps
    assert "@types/react" in dev_deps
    assert "@types/react-dom" in dev_deps


def test_frontend_tsconfig_json_paths_and_target():
    """Verify frontend/tsconfig.json exists and specifies path alias `@/*`."""
    assert TSCONFIG_JSON.exists(), f"Missing tsconfig.json at {TSCONFIG_JSON}"
    data = json.loads(TSCONFIG_JSON.read_text(encoding="utf-8"))

    compiler_opts = data.get("compilerOptions", {})
    assert compiler_opts.get("target") in ["es5", "ES5", "es6", "ES2020", "ESNext"]
    assert compiler_opts.get("strict") is True
    assert compiler_opts.get("jsx") in ["preserve", "react-jsx"]

    paths = compiler_opts.get("paths", {})
    assert "@/*" in paths
    assert "./src/*" in paths["@/*"] or ["./src/*"] == paths["@/*"]


def test_postcss_config_exists_and_valid():
    """Verify frontend/postcss.config.mjs exists and references tailwindcss and autoprefixer."""
    assert POSTCSS_CONFIG.exists(), f"Missing postcss.config.mjs at {POSTCSS_CONFIG}"
    content = POSTCSS_CONFIG.read_text(encoding="utf-8")

    assert "tailwindcss" in content
    assert "autoprefixer" in content


def test_tailwind_config_liquid_glass_tokens():
    """Verify frontend/tailwind.config.ts configures TikTok palette, Kanit font, and visionOS glass tokens."""
    assert TAILWIND_CONFIG.exists(), f"Missing tailwind.config.ts at {TAILWIND_CONFIG}"
    content = TAILWIND_CONFIG.read_text(encoding="utf-8")

    # Content path inspection
    assert "./src/**/*.{js,ts,jsx,tsx,mdx}" in content or "./src/app/**/*.{js,ts,jsx,tsx,mdx}" in content

    # Brand and glass colors
    assert "tiktok-cyan" in content
    assert "#00f2fe" in content
    assert "tiktok-red" in content
    assert "#fe2c55" in content
    assert "glass-border" in content
    assert "glass-surface" in content
    assert "glass-surface-hover" in content

    # Extended backdrop blur tokens
    assert "backdropBlur" in content or "backdropFilter" in content or "64px" in content
    assert "3xl" in content or "64px" in content

    # Font family linking
    assert "--font-kanit" in content


def test_globals_css_visionos_classes():
    """Verify frontend/src/app/globals.css includes Tailwind directives and visionOS glass utility classes."""
    assert GLOBALS_CSS.exists(), f"Missing globals.css at {GLOBALS_CSS}"
    content = GLOBALS_CSS.read_text(encoding="utf-8")

    assert "@tailwind base;" in content
    assert "@tailwind components;" in content
    assert "@tailwind utilities;" in content

    # Liquid glass and specular reflection classes
    assert ".liquid-glass" in content
    assert ".specular-border" in content
    assert ".ambient-glow" in content
    assert "backdrop-blur" in content


def test_layout_tsx_metadata_and_font():
    """Verify frontend/src/app/layout.tsx defines visionOS root layout, Kanit font, and metadata."""
    assert LAYOUT_TSX.exists(), f"Missing layout.tsx at {LAYOUT_TSX}"
    content = LAYOUT_TSX.read_text(encoding="utf-8")

    assert "TikTok Live TTS Studio" in content
    assert "Apple Liquid Glass Dashboard" in content
    assert "Real-time speech synthesis control station" in content
    assert "Kanit" in content or "sans-serif" in content
    assert "RootLayout" in content
    assert "children" in content


def test_vercel_json_configuration():
    """Verify vercel.json defines Next.js deployment settings for Vercel CDN."""
    assert VERCEL_JSON.exists(), f"Missing vercel.json at {VERCEL_JSON}"
    data = json.loads(VERCEL_JSON.read_text(encoding="utf-8"))

    assert data.get("framework") == "nextjs"
    assert "buildCommand" in data or "installCommand" in data or "outputDirectory" in data
