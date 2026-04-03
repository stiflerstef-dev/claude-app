"""
session.py — Manage concurrent Claude Code subprocesses via ptyprocess.
One pty session per project. Detects when Claude is waiting for approval.
"""

import asyncio
import uuid
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime
from typing import Literal, Callable

import ptyprocess

from projects import ProjectInfo

SessionStatus = Literal["active", "idle", "waiting_approval", "stopped"]

APPROVAL_PATTERNS = [
    "Do you want to proceed",
    "Allow this action?",
    "Yes/No",
    "y/n",
    "[Y/n]",
    "[y/N]",
]


@dataclass
class Session:
    id: str
    project_id: str
    project_name: str
    project_description: str
    status: SessionStatus
    started_at: datetime
    last_activity: datetime
    output_buffer: deque = field(default_factory=lambda: deque(maxlen=500))
    _process: ptyprocess.PtyProcess | None = field(default=None, repr=False)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "project_id": self.project_id,
            "project_name": self.project_name,
            "project_description": self.project_description,
            "status": self.status,
            "started_at": self.started_at.isoformat(),
            "last_activity": self.last_activity.isoformat(),
        }


class SessionManager:
    def __init__(self, on_output: Callable[[str, list[str]], None],
                 on_status_change: Callable[[str, str], None]):
        self._sessions: dict[str, Session] = {}
        self._on_output = on_output
        self._on_status_change = on_status_change

    def start_session(self, project: ProjectInfo) -> Session:
        session_id = str(uuid.uuid4())
        proc = ptyprocess.PtyProcess.spawn(
            ["claude", "--dangerously-skip-permissions"],
            cwd=str(project.path),
            env=None,
        )
        session = Session(
            id=session_id,
            project_id=project.id,
            project_name=project.name,
            project_description=project.description,
            status="active",
            started_at=datetime.now(),
            last_activity=datetime.now(),
            _process=proc,
        )
        self._sessions[session_id] = session
        asyncio.ensure_future(self._read_loop(session))
        return session

    def stop_session(self, session_id: str) -> None:
        session = self._sessions.get(session_id)
        if not session:
            return
        if session._process and session._process.isalive():
            session._process.terminate(force=True)
        session.status = "stopped"
        self._on_status_change(session_id, "stopped")

    def send_input(self, session_id: str, text: str) -> None:
        session = self._sessions.get(session_id)
        if not session or not session._process or not session._process.isalive():
            return
        if not text.endswith("\n"):
            text += "\n"
        session._process.write(text.encode())
        session.status = "active"
        session.last_activity = datetime.now()

    def approve(self, session_id: str) -> None:
        self.send_input(session_id, "y\n")

    def deny(self, session_id: str) -> None:
        self.send_input(session_id, "n\n")

    def get_all_sessions(self) -> list[Session]:
        return list(self._sessions.values())

    def get_output(self, session_id: str) -> list[str]:
        session = self._sessions.get(session_id)
        if not session:
            return []
        return list(session.output_buffer)

    async def _read_loop(self, session: Session) -> None:
        proc = session._process
        loop = asyncio.get_event_loop()
        try:
            while proc and proc.isalive():
                try:
                    data = await loop.run_in_executor(None, proc.read, 4096)
                    if not data:
                        break
                    lines = data.decode("utf-8", errors="replace").splitlines()
                    for line in lines:
                        session.output_buffer.append(line)
                        self._detect_status(session, line)
                    session.last_activity = datetime.now()
                    if lines:
                        self._on_output(session.id, lines)
                except EOFError:
                    break
                except Exception:
                    break
        finally:
            if session.status != "stopped":
                session.status = "stopped"
                self._on_status_change(session.id, "stopped")

    def _detect_status(self, session: Session, line: str) -> None:
        for pattern in APPROVAL_PATTERNS:
            if pattern.lower() in line.lower():
                if session.status != "waiting_approval":
                    session.status = "waiting_approval"
                    self._on_status_change(session.id, "waiting_approval")
                return

    def stop_all(self) -> None:
        for sid in list(self._sessions.keys()):
            self.stop_session(sid)
