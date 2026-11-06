"""Unit and integration tests for OpenCode CLI autonomous task handoff runner."""

from pathlib import Path
import subprocess

REPO_ROOT = Path(__file__).resolve().parent.parent
SKILL_PATH = Path(r"C:\Users\iznamu\.agents\skills\opencode-worker\SKILL.md")
RUNNER_SCRIPT = REPO_ROOT / "scripts" / "run_opencode_task.ps1"


def test_opencode_worker_skill_exists_and_documents_omniroute():
    """Verify the opencode-worker skill exists and references OmniRoute best-coding."""
    assert SKILL_PATH.exists(), "opencode-worker SKILL.md must exist"
    content = SKILL_PATH.read_text(encoding="utf-8")
    assert "name: opencode-worker" in content
    assert "omniroute/auto/best-coding" in content
    assert "opencode run --auto" in content


def test_run_opencode_task_script_dry_run():
    """Verify scripts/run_opencode_task.ps1 supports -DryRun and resolves configuration."""
    assert RUNNER_SCRIPT.exists(), "scripts/run_opencode_task.ps1 must exist"
    res = subprocess.run(
        [
            "powershell",
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            str(RUNNER_SCRIPT),
            "-Prompt",
            "Verify DryRun handoff",
            "-DryRun",
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    assert res.returncode == 0, f"DryRun failed: {res.stderr}"
    assert "omniroute/auto/best-coding" in res.stdout
    assert "Verify DryRun handoff" in res.stdout
