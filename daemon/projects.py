"""
projects.py — Scan projects_dir for valid Claude Code projects.
A valid project contains a CLAUDE.md file.
Rescans every 30 seconds automatically.
"""

import asyncio
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Callable


@dataclass
class ProjectInfo:
    id: str          # uuid5 derived from path
    name: str        # directory name
    path: Path
    description: str


def _extract_description(claude_md: Path) -> str:
    try:
        lines = claude_md.read_text(encoding="utf-8", errors="replace").splitlines()
    except OSError:
        return ""

    # Check first 20 lines for "description:" key
    for line in lines[:20]:
        stripped = line.strip()
        lower = stripped.lower()
        if lower.startswith("description:"):
            val = stripped[len("description:"):].strip()
            if val:
                return val[:80]

    # Fallback: first non-empty, non-heading line
    for line in lines:
        stripped = line.strip()
        if stripped and not stripped.startswith("#"):
            return stripped[:80]

    return ""


def scan_projects(projects_dir: Path) -> list[ProjectInfo]:
    if not projects_dir.is_dir():
        return []

    results: list[ProjectInfo] = []
    for entry in sorted(projects_dir.iterdir()):
        if not entry.is_dir():
            continue
        claude_md = entry / "CLAUDE.md"
        if not claude_md.exists():
            continue
        proj_id = str(uuid.uuid5(uuid.NAMESPACE_URL, str(entry.resolve())))
        desc = _extract_description(claude_md)
        results.append(ProjectInfo(
            id=proj_id,
            name=entry.name,
            path=entry.resolve(),
            description=desc,
        ))

    return results


class ProjectScanner:
    def __init__(self, projects_dir: Path, on_change: Callable[[list[ProjectInfo]], None]):
        self._dir = projects_dir
        self._on_change = on_change
        self._last: list[ProjectInfo] = []
        self._task: asyncio.Task | None = None

    def start(self) -> None:
        self._task = asyncio.ensure_future(self._loop())

    async def _loop(self) -> None:
        while True:
            current = scan_projects(self._dir)
            if self._changed(current):
                self._last = current
                self._on_change(current)
            await asyncio.sleep(30)

    def _changed(self, new: list[ProjectInfo]) -> bool:
        if len(new) != len(self._last):
            return True
        return any(a.id != b.id for a, b in zip(new, self._last))

    def get(self) -> list[ProjectInfo]:
        return self._last

    def stop(self) -> None:
        if self._task:
            self._task.cancel()
