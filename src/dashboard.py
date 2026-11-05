"""Rich terminal live dashboard: real-time monitoring for the TikTok Live Text-to-Speech (TTS) bot.

Shows the connected channel and connection status (header), queue size and active TTS engine
(left body), chat comment and gift statistics plus the current speech (right body), and the
emergency hotkey and any audio device warning (footer).

``DashboardMetrics`` is mutated from the asyncio event loop and read by ``render()``;
``render()`` never mutates it. ``rich.live.Live`` handles periodic refresh.
"""

import logging
from dataclasses import dataclass
from typing import Optional

from rich.layout import Layout
from rich.live import Live
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

logger = logging.getLogger(__name__)

_REFRESH_PER_SECOND = 4


@dataclass
class DashboardMetrics:
    """Mutable snapshot of runtime state displayed by the dashboard."""

    connected_channel: str
    connection_status: str
    total_comments: int
    total_gifts: int
    queue_size: int
    current_speaking: str
    active_engine: str  # e.g. "Fish Audio (s2.1-pro-free)" or "edge-tts"
    emergency_hotkey: str
    # Shown in the footer so a missing Virtual Audio Cable is visible to the streamer.
    device_warning: str = ""
    colab_tunnel_url: Optional[str] = None
    prefer_colab_tts: bool = False


def _kv_table(rows: list) -> Table:
    table = Table.grid(padding=(0, 2))
    table.add_column(style="bold cyan")
    table.add_column()
    for key, value in rows:
        table.add_row(key, Text(str(value)))
    return table


class LiveDashboard:
    """Builds the dashboard Layout and wraps ``rich.live.Live`` for dynamic refresh."""

    def __init__(self, metrics: DashboardMetrics) -> None:
        self.metrics = metrics
        self._live: Optional[Live] = None

    def render(self) -> Layout:
        """Build a fresh Layout from the current metrics (side-effect free)."""
        m = self.metrics
        status_style = "green" if m.connection_status.lower() == "connected" else "yellow"

        header = Text.assemble(
            ("Channel: ", "bold"), m.connected_channel, "   ",
            ("Status: ", "bold"), (m.connection_status, status_style),
        )
        left_rows = [("Queue size", m.queue_size), ("Active engine", m.active_engine)]
        if m.colab_tunnel_url:
            left_rows.append(("Colab tunnel", "Active" if m.prefer_colab_tts else "Standby"))

        left = _kv_table(left_rows)
        right = _kv_table([
            ("Comments", m.total_comments),
            ("Gifts", m.total_gifts),
            ("Speaking", m.current_speaking or "-"),
        ])
        footer = Text.assemble(
            ("Emergency Stop hotkey: ", "bold"), (m.emergency_hotkey, "bold red"),
        )
        if m.device_warning:
            footer.append("\n")
            footer.append(f"Warning: {m.device_warning}", style="bold yellow")

        layout = Layout()
        layout.split_column(
            Layout(Panel(header, title="TikTok Live TTS Bot"), name="header", size=3),
            Layout(name="body"),
            Layout(Panel(footer), name="footer", size=4 if m.device_warning else 3),
        )
        layout["body"].split_row(
            Layout(Panel(left, title="Queue & Engine"), name="left"),
            Layout(Panel(right, title="Stats"), name="right"),
        )
        return layout

    def start(self) -> None:
        """Start live refresh; a second call while running is a no-op."""
        if self._live is not None:
            return
        self._live = Live(
            get_renderable=self.render,
            refresh_per_second=_REFRESH_PER_SECOND,
            screen=False,
        )
        self._live.start()
        logger.info("Dashboard started")

    def stop(self) -> None:
        """Stop live refresh; safe before start() and when called repeatedly."""
        if self._live is None:
            return
        live, self._live = self._live, None
        try:
            live.stop()
        except Exception:  # terminal may already be gone; never crash shutdown
            logger.exception("Dashboard stop failed")
        logger.info("Dashboard stopped")
