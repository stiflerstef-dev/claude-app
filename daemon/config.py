"""
config.py — Load and validate daemon configuration from ~/.claude-remote/config.json.
Creates a default config template if not found and prints setup instructions.
"""

import json
import os
import uuid
from pathlib import Path
from dataclasses import dataclass

CONFIG_DIR = Path.home() / ".claude-remote"
CONFIG_FILE = CONFIG_DIR / "config.json"

DEFAULT_CONFIG = {
    "projects_dir": "~/projects",
    "relay_url": "wss://your-relay.example.com",
    "auth_token": "your-secret-token",
    "device_id": str(uuid.uuid4()),
}


@dataclass
class Config:
    projects_dir: Path
    relay_url: str
    auth_token: str
    device_id: str


def load_config() -> Config:
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)

    if not CONFIG_FILE.exists():
        CONFIG_FILE.write_text(json.dumps(DEFAULT_CONFIG, indent=2))
        print(
            "\n⚠️  No config found. Created template at:\n"
            f"   {CONFIG_FILE}\n\n"
            "Edit the file and set:\n"
            "  • projects_dir  — path to your projects folder\n"
            "  • relay_url     — wss://your-relay-server\n"
            "  • auth_token    — secret token matching DAEMON_TOKEN on relay\n\n"
            "Then re-run the daemon.\n"
        )
        raise SystemExit(1)

    raw = json.loads(CONFIG_FILE.read_text())

    # Only relay_url and auth_token must differ from placeholder defaults
    placeholder_defaults = {
        "relay_url": "wss://your-relay.example.com",
        "auth_token": "your-secret-token",
    }
    required = ["projects_dir", "relay_url", "auth_token"]
    missing = [
        k for k in required
        if not raw.get(k) or raw[k] == placeholder_defaults.get(k, "")
    ]
    if missing:
        raise ValueError(
            f"Config incomplete. Please fill in: {', '.join(missing)}\n"
            f"Config file: {CONFIG_FILE}"
        )

    # Auto-assign device_id if absent
    if not raw.get("device_id"):
        raw["device_id"] = str(uuid.uuid4())
        CONFIG_FILE.write_text(json.dumps(raw, indent=2))

    return Config(
        projects_dir=Path(raw["projects_dir"]).expanduser().resolve(),
        relay_url=raw["relay_url"],
        auth_token=raw["auth_token"],
        device_id=raw["device_id"],
    )
