"""Tests for the Rich terminal live dashboard."""

import io

from rich.console import Console
from rich.layout import Layout

from src.dashboard import DashboardMetrics, LiveDashboard


def _metrics(**overrides) -> DashboardMetrics:
    base = dict(
        connected_channel="@streamer",
        connection_status="Connected",
        total_comments=12,
        total_gifts=3,
        queue_size=1,
        current_speaking="สวัสดีครับผู้ชม",
        active_engine="Fish Audio (s2.1-pro-free)",
        emergency_hotkey="F9",
    )
    base.update(overrides)
    return DashboardMetrics(**base)


def _text(dashboard: LiveDashboard) -> str:
    console = Console(file=io.StringIO(), width=100, height=30, force_terminal=False)
    console.print(dashboard.render())
    return console.file.getvalue()


def test_dashboard_layout_render():
    layout = LiveDashboard(_metrics()).render()
    assert isinstance(layout, Layout)


def test_render_contains_all_fields():
    out = _text(LiveDashboard(_metrics()))
    for expected in ("@streamer", "Connected", "12", "3", "สวัสดีครับผู้ชม",
                     "Fish Audio (s2.1-pro-free)", "F9"):
        assert expected in out


def test_render_empty_current_speaking_ok():
    out = _text(LiveDashboard(_metrics(current_speaking="")))
    assert "@streamer" in out


def test_device_warning_shown_only_when_set():
    assert "No Virtual Cable" not in _text(LiveDashboard(_metrics()))
    out = _text(LiveDashboard(_metrics(device_warning="No Virtual Cable")))
    assert "No Virtual Cable" in out


def test_render_reflects_mutation_and_is_pure():
    metrics = _metrics()
    dashboard = LiveDashboard(metrics)
    metrics.total_comments = 99
    assert "99" in _text(dashboard)
    assert metrics.total_comments == 99


def test_stop_before_start_and_double_stop_are_noops():
    dashboard = LiveDashboard(_metrics())
    dashboard.stop()
    dashboard.stop()


def test_start_stop_lifecycle_without_real_terminal(monkeypatch):
    import src.dashboard as mod

    started = []

    class FakeLive:
        def __init__(self, *args, **kwargs):
            self.kwargs = kwargs

        def start(self):
            started.append("start")

        def stop(self):
            started.append("stop")

    monkeypatch.setattr(mod, "Live", FakeLive)
    dashboard = LiveDashboard(_metrics())
    dashboard.start()
    dashboard.start()  # idempotent
    dashboard.stop()
    dashboard.stop()
    assert started == ["start", "stop"]
