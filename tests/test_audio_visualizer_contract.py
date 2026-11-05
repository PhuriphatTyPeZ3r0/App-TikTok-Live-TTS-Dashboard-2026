"""Contract tests for Next.js 15 Real-Time Audio Spectrum & Waveform Canvas Visualizer.

This test module verifies the component contract, rendering specifications,
Apple visionOS Liquid Glass styling, and technical documentation of `AudioVisualizer.tsx`.

Voice actor attribution: พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)
Contract:
- Fast Fourier Transform (FFT) visual simulation and audio spectrum representation
- Web Audio Application Programming Interface (Web Audio API) compatibility
- High-Definition Audio (HD Audio) responsive canvas rendering
- Apple visionOS Frosted Liquid Glass design tokens and specular borders
"""

from pathlib import Path
import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
FRONTEND_DIR = REPO_ROOT / "frontend"
COMPONENT_FILE = FRONTEND_DIR / "src" / "components" / "AudioVisualizer.tsx"


def test_audio_visualizer_file_and_exports():
    """Verify frontend/src/components/AudioVisualizer.tsx exists and exports required types/components."""
    assert COMPONENT_FILE.exists(), f"Missing visualizer component at {COMPONENT_FILE}"
    content = COMPONENT_FILE.read_text(encoding="utf-8")

    # Client-side directive
    assert '"use client"' in content or "'use client'" in content, "Must declare 'use client' directive"

    # Exported interface and component
    assert "export interface AudioVisualizerProps" in content, "Must export AudioVisualizerProps"
    assert "export function AudioVisualizer" in content or "export const AudioVisualizer" in content, (
        "Must export AudioVisualizer component"
    )


def test_audio_visualizer_props_contract():
    """Verify AudioVisualizerProps interface contract."""
    assert COMPONENT_FILE.exists(), f"Missing visualizer component at {COMPONENT_FILE}"
    content = COMPONENT_FILE.read_text(encoding="utf-8")

    # Props contract validation
    assert "isSpeaking?: boolean" in content or "isSpeaking:" in content
    assert "accentColor?: string" in content or "accentColor:" in content
    assert "className?: string" in content or "className:" in content
    assert "height?: number" in content or "height:" in content
    assert "barCount?: number" in content or "barCount:" in content


def test_canvas_lifecycle_and_high_dpi_rendering():
    """Verify canvas ref, requestAnimationFrame loop, cleanup, and high-DPI scaling."""
    assert COMPONENT_FILE.exists(), f"Missing visualizer component at {COMPONENT_FILE}"
    content = COMPONENT_FILE.read_text(encoding="utf-8")

    # Canvas ref & context
    assert "useRef<HTMLCanvasElement" in content or "useRef<HTMLCanvasElement | null>" in content
    assert "getContext('2d')" in content or 'getContext("2d")' in content

    # Animation frame lifecycle
    assert "requestAnimationFrame" in content, "Must use requestAnimationFrame for fluid 60fps loop"
    assert "cancelAnimationFrame" in content, "Must cleanup with cancelAnimationFrame on unmount"

    # High-DPI & Resize handling
    assert "devicePixelRatio" in content, "Must account for window.devicePixelRatio for crisp High-DPI rendering"
    assert "ResizeObserver" in content, "Must use ResizeObserver for dynamic container responsiveness"
    assert "setTransform" in content or "scale" in content, "Must scale context for high-DPI rendering"
    assert "clientWidth" in content or "getBoundingClientRect" in content, "Must measure container width safely"


def test_visualizer_state_rendering_modes():
    """Verify active speaking frequency spectrum, accent color ref, and idle breathing wave modes."""
    assert COMPONENT_FILE.exists(), f"Missing visualizer component at {COMPONENT_FILE}"
    content = COMPONENT_FILE.read_text(encoding="utf-8")

    # Dynamic accent tracking
    assert "accentRef" in content, "Must track accentColor in a ref for fluid updates"
    assert "barCount" in content, "Must dynamically bind barCount"

    # Dynamic frequency bars and gradient
    assert "createLinearGradient" in content or "gradient" in content
    assert "#00f2fe" in content, "Must include TikTok Cyan accent (#00f2fe)"
    assert "#fe2c55" in content or "#8b5cf6" in content, "Must include TikTok Red/Violet accents"

    # Waveform drawing logic (sine wave / ribbon / idle harmonic)
    assert "Math.sin" in content, "Must compute sine waves for harmonic rendering"
    assert "isSpeaking" in content, "Must branch rendering logic based on isSpeaking state"


def test_apple_visionos_liquid_glass_styling():
    """Verify Apple visionOS Frosted Liquid Glass CSS classes and glowing effects."""
    assert COMPONENT_FILE.exists(), f"Missing visualizer component at {COMPONENT_FILE}"
    content = COMPONENT_FILE.read_text(encoding="utf-8")

    # VisionOS tokens
    assert "liquid-glass" in content, "Must include liquid-glass class"
    assert "specular-border" in content, "Must include specular-border class"
    assert "rounded-2xl" in content, "Must include rounded-2xl container radius"


def test_audio_visualizer_academic_rigor_and_attribution():
    """Verify full technical terms with acronyms and voice actor attribution."""
    assert COMPONENT_FILE.exists(), f"Missing visualizer component at {COMPONENT_FILE}"
    content = COMPONENT_FILE.read_text(encoding="utf-8")

    # Full technical terms with acronyms
    assert "Web Audio Application Programming Interface (Web Audio API)" in content
    assert "Fast Fourier Transform (FFT)" in content
    assert "High-Definition Audio (HD Audio)" in content

    # Voice actor attribution
    assert "พิพัฒน์ บุญสิทธิเลิศ" in content
    assert "Phiphat Boonsitthilert" in content
