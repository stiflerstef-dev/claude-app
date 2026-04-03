"""
relay_client.py — Persistent WebSocket connection to the relay server.
Authenticates on connect, streams session state and output,
and forwards commands to the SessionManager.
Auto-reconnects with exponential backoff.
"""

import asyncio
import json
import logging
from typing import Callable

import websockets
from websockets.exceptions import ConnectionClosed

from projects import ProjectInfo, ProjectScanner
from session import SessionManager

logger = logging.getLogger(__name__)

MAX_BACKOFF = 30


class RelayClient:
    def __init__(
        self,
        relay_url: str,
        auth_token: str,
        device_id: str,
        session_manager: SessionManager,
        project_scanner: ProjectScanner,
    ):
        self._url = relay_url
        self._token = auth_token
        self._device_id = device_id
        self._sm = session_manager
        self._ps = project_scanner
        self._ws: websockets.WebSocketClientProtocol | None = None
        self._connected = False
        self._send_queue: asyncio.Queue = asyncio.Queue()

    async def run(self) -> None:
        backoff = 1
        while True:
            try:
                async with websockets.connect(self._url) as ws:
                    self._ws = ws
                    self._connected = True
                    backoff = 1
                    logger.info("Connected to relay")
                    await self._authenticate()
                    await self._send_session_list()
                    await asyncio.gather(
                        self._recv_loop(ws),
                        self._send_loop(ws),
                        self._heartbeat(ws),
                    )
            except (ConnectionClosed, OSError, Exception) as e:
                logger.warning(f"Relay disconnected: {e}. Retrying in {backoff}s")
                self._connected = False
                self._ws = None
            await asyncio.sleep(backoff)
            backoff = min(backoff * 2, MAX_BACKOFF)

    async def _authenticate(self) -> None:
        await self._ws.send(json.dumps({
            "type": "auth",
            "token": self._token,
            "device_id": self._device_id,
        }))

    async def _send_session_list(self) -> None:
        sessions = [s.to_dict() for s in self._sm.get_all_sessions()]
        await self._ws.send(json.dumps({"type": "session_list", "sessions": sessions}))

    async def _recv_loop(self, ws) -> None:
        async for raw in ws:
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue
            await self._handle_message(msg)

    async def _send_loop(self, ws) -> None:
        while True:
            msg = await self._send_queue.get()
            if ws.open:
                await ws.send(json.dumps(msg))

    async def _heartbeat(self, ws) -> None:
        while True:
            await asyncio.sleep(30)
            if ws.open:
                await ws.send(json.dumps({"type": "ping"}))

    async def _handle_message(self, msg: dict) -> None:
        t = msg.get("type")

        if t == "pong":
            return

        if t == "send_input":
            self._sm.send_input(msg["session_id"], msg["text"])

        elif t == "approve":
            self._sm.approve(msg["session_id"])

        elif t == "deny":
            self._sm.deny(msg["session_id"])

        elif t == "start_session":
            project_id = msg.get("project_id")
            projects = self._ps.get()
            project = next((p for p in projects if p.id == project_id), None)
            if project:
                session = self._sm.start_session(project)
                await self.send_session_list()

        elif t == "stop_session":
            self._sm.stop_session(msg["session_id"])
            await self.send_session_list()

        elif t == "list_projects":
            projects = [
                {"id": p.id, "name": p.name, "description": p.description}
                for p in self._ps.get()
            ]
            self._send_queue.put_nowait({"type": "project_list", "projects": projects})

    def send_output(self, session_id: str, lines: list[str]) -> None:
        self._send_queue.put_nowait({
            "type": "output",
            "session_id": session_id,
            "lines": lines,
        })

    def send_status_change(self, session_id: str, status: str) -> None:
        self._send_queue.put_nowait({
            "type": "status_change",
            "session_id": session_id,
            "status": status,
        })

    async def send_session_list(self) -> None:
        sessions = [s.to_dict() for s in self._sm.get_all_sessions()]
        self._send_queue.put_nowait({"type": "session_list", "sessions": sessions})
