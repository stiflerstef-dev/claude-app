"""
main.py — Async entry point for the claude-remote daemon.
Starts config → project scanner → session manager → relay client.
Logs to ~/.claude-remote/daemon.log with rotation.
"""

import asyncio
import logging
import logging.handlers
import signal
import sys
from pathlib import Path

import colorlog

from config import load_config
from projects import ProjectScanner
from session import SessionManager
from relay_client import RelayClient

LOG_DIR = Path.home() / ".claude-remote"
LOG_FILE = LOG_DIR / "daemon.log"


def setup_logging() -> None:
    LOG_DIR.mkdir(parents=True, exist_ok=True)

    file_handler = logging.handlers.RotatingFileHandler(
        LOG_FILE, maxBytes=10 * 1024 * 1024, backupCount=3, encoding="utf-8"
    )
    file_handler.setFormatter(logging.Formatter(
        "%(asctime)s %(levelname)s %(name)s: %(message)s"
    ))

    console_handler = colorlog.StreamHandler()
    console_handler.setFormatter(colorlog.ColoredFormatter(
        "%(log_color)s%(levelname)s%(reset)s %(message)s",
        log_colors={
            "DEBUG": "cyan",
            "INFO": "green",
            "WARNING": "yellow",
            "ERROR": "red",
            "CRITICAL": "bold_red",
        },
    ))

    root = logging.getLogger()
    root.setLevel(logging.INFO)
    root.addHandler(file_handler)
    root.addHandler(console_handler)


def print_status(message: str, ok: bool = True) -> None:
    symbol = "✓" if ok else "✗"
    color = "\033[32m" if ok else "\033[31m"
    reset = "\033[0m"
    print(f"  {color}{symbol}{reset} {message}")


async def main() -> None:
    setup_logging()

    # Load config
    try:
        config = load_config()
        print_status("Config loaded")
    except (ValueError, SystemExit) as e:
        print(f"\033[31m✗ Config error: {e}\033[0m")
        sys.exit(1)

    # Shared relay_client reference (set after construction)
    relay_ref: dict = {}

    def on_output(session_id: str, lines: list[str]) -> None:
        if relay_ref.get("client"):
            relay_ref["client"].send_output(session_id, lines)

    def on_status_change(session_id: str, status: str) -> None:
        if relay_ref.get("client"):
            relay_ref["client"].send_status_change(session_id, status)
            asyncio.ensure_future(relay_ref["client"].send_session_list())

    session_manager = SessionManager(
        on_output=on_output,
        on_status_change=on_status_change,
    )

    def on_projects_change(projects) -> None:
        logging.getLogger(__name__).info(f"Projects updated: {len(projects)} found")
        if relay_ref.get("client"):
            asyncio.ensure_future(relay_ref["client"].send_session_list())

    scanner = ProjectScanner(config.projects_dir, on_change=on_projects_change)

    # Do initial scan
    from projects import scan_projects
    initial_projects = scan_projects(config.projects_dir)
    scanner._last = initial_projects
    print_status(f"Found {len(initial_projects)} project(s)")

    relay = RelayClient(
        relay_url=config.relay_url,
        auth_token=config.auth_token,
        device_id=config.device_id,
        session_manager=session_manager,
        project_scanner=scanner,
    )
    relay_ref["client"] = relay

    scanner.start()

    # Graceful shutdown
    loop = asyncio.get_running_loop()
    stop_event = asyncio.Event()

    def _shutdown(sig):
        print(f"\n  Received {sig.name}, shutting down...")
        session_manager.stop_all()
        stop_event.set()

    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, _shutdown, sig)

    print_status("Connected to relay (connecting...)")
    print("\n  Daemon running. Press Ctrl+C to stop.\n")

    try:
        await asyncio.gather(
            relay.run(),
            stop_event.wait(),
            return_exceptions=True,
        )
    finally:
        scanner.stop()
        session_manager.stop_all()


if __name__ == "__main__":
    asyncio.run(main())
