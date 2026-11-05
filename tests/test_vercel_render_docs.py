"""Contract and documentation tests for Vercel and Render decoupled deployment.

Validates the Content Delivery Network (CDN) Next.js 15 Single-Page Application (SPA)
deployment guide and its integration with the Asynchronous Server Gateway Interface (ASGI)
FastAPI backend on Render, the Web Audio Application Programming Interface (Web Audio API)
audio streaming pipeline, and the First-In, First-Out (FIFO) event queue. Also asserts
coverage of the Fish Speech v1.5 Dual Autoregressive (Dual-AR) transformer with
Vector Quantization (VQ) and Generative Adversarial Network (GAN) vocoder featuring
พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert).
"""

from pathlib import Path
import re
import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
DOCS_DIR = REPO_ROOT / "docs"
DEPLOY_GUIDE_FILE = DOCS_DIR / "VERCEL_RENDER_DEPLOYMENT_GUIDE.md"
README_FILE = REPO_ROOT / "README.md"


def test_deployment_guide_file_exists():
    """Verify docs/VERCEL_RENDER_DEPLOYMENT_GUIDE.md exists and is non-empty."""
    assert DEPLOY_GUIDE_FILE.exists(), f"Missing file: {DEPLOY_GUIDE_FILE}"
    content = DEPLOY_GUIDE_FILE.read_text(encoding="utf-8")
    assert len(content.strip()) > 1000, "Deployment guide content is unexpectedly short"


def test_deployment_guide_architecture_flowchart():
    """Verify deployment guide contains a Mermaid architecture diagram."""
    content = DEPLOY_GUIDE_FILE.read_text(encoding="utf-8")
    assert "```mermaid" in content, "Missing Mermaid block in deployment guide"
    assert ("flowchart TD" in content or "flowchart LR" in content), "Mermaid diagram must use flowchart TD or LR"
    assert "Vercel" in content
    assert "Render" in content
    assert "Colab" in content or "ZeroGPU" in content


def test_deployment_guide_required_steps():
    """Verify deployment guide details all 4 required deployment steps."""
    content = DEPLOY_GUIDE_FILE.read_text(encoding="utf-8")
    
    # Step 1: Render backend deployment & environment variables
    assert "render.yaml" in content
    assert "TIKTOK_USERNAME" in content
    assert "COLAB_TUNNEL_URL" in content
    assert "FISH_AUDIO_API_KEY" in content

    # Step 2: Vercel frontend deployment
    assert "Deploy to Vercel" in content or "Deploy with Vercel" in content or "vercel.com/new/clone" in content
    assert "NEXT_PUBLIC_BACKEND_URL" in content
    assert "frontend" in content

    # Step 3: Streamer workflow & OBS Studio Browser Source
    assert "OBS" in content
    assert "/overlay" in content
    assert "token" in content or "overlay_token" in content

    # Step 4: Troubleshooting & operational stability
    assert "CORS" in content
    assert "WebSocket" in content
    assert "Cold start" in content or "cold start" in content or "Render" in content


def test_deployment_guide_voice_actor_attribution():
    """Verify voice actor attribution to พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)."""
    content = DEPLOY_GUIDE_FILE.read_text(encoding="utf-8")
    assert "พิพัฒน์ บุญสิทธิเลิศ" in content
    assert "Phiphat Boonsitthilert" in content


def test_deployment_guide_mandatory_acronyms():
    """Verify mandatory technical terminology with full expansions in the deployment guide."""
    content = DEPLOY_GUIDE_FILE.read_text(encoding="utf-8")
    required_acronyms = [
        "Content Delivery Network (CDN)",
        "Single-Page Application (SPA)",
        "Asynchronous Server Gateway Interface (ASGI)",
        "Web Audio Application Programming Interface (Web Audio API)",
        "First-In, First-Out (FIFO)",
        "Dual Autoregressive (Dual-AR)",
        "Vector Quantization (VQ)",
        "Generative Adversarial Network (GAN)",
    ]
    for term in required_acronyms:
        assert term in content, f"Missing required technical acronym in guide: '{term}'"


def test_deployment_guide_academic_citations():
    """Verify academic citations and references are properly formatted with links."""
    content = DEPLOY_GUIDE_FILE.read_text(encoding="utf-8")
    assert "References" in content or "บรรณานุกรม" in content or "เอกสารอ้างอิง" in content
    assert "arXiv" in content or "arxiv.org" in content
    assert "W3C" in content or "webaudio" in content or "RFC" in content


def test_readme_vercel_deploy_button():
    """Verify README.md contains Vercel deploy badge button linking to repo frontend root."""
    content = README_FILE.read_text(encoding="utf-8")
    expected_button_snippet = "https://vercel.com/button"
    expected_clone_snippet = "https://vercel.com/new/clone?repository-url="
    expected_root_snippet = "root-directory=frontend"

    assert expected_button_snippet in content, "README.md missing Vercel deploy button image"
    assert expected_clone_snippet in content, "README.md missing Vercel new clone URL"
    assert expected_root_snippet in content, "README.md missing root-directory=frontend parameter in Vercel button"


def test_readme_apple_liquid_glass_section():
    """Verify README.md contains Apple Liquid Glass Streamer Dashboard section and link to guide."""
    content = README_FILE.read_text(encoding="utf-8")
    assert "Apple Liquid Glass" in content, "README.md missing Apple Liquid Glass section"
    assert "Next.js 15" in content
    assert "VERCEL_RENDER_DEPLOYMENT_GUIDE.md" in content, "README.md must link to VERCEL_RENDER_DEPLOYMENT_GUIDE.md"


def test_readme_voice_actor_and_acronyms():
    """Verify voice actor attribution and key technical acronyms in README.md."""
    content = README_FILE.read_text(encoding="utf-8")
    assert "พิพัฒน์ บุญสิทธิเลิศ" in content
    assert "Phiphat Boonsitthilert" in content

    # Check key technical terms in README
    assert "Content Delivery Network (CDN)" in content or "Single-Page Application (SPA)" in content
    assert "Web Audio Application Programming Interface (Web Audio API)" in content
