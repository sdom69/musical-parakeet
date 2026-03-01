#!/usr/bin/env python3
"""Simple API + static file server for a legitimate Remote Administration Tool demo."""

from __future__ import annotations

import json
import os
import time
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Lock
from urllib.parse import urlparse

HOST = "0.0.0.0"
PORT = 4173

ADMIN_TOKEN = os.environ.get("RAT_ADMIN_TOKEN", "change-me")
SERVER_STARTED_AT = time.time()
STATE_LOCK = Lock()

STATE = {
    "maintenanceMode": False,
    "serviceMessage": "All systems operational.",
    "allowedOrigins": ["127.0.0.1"],
}


class AppHandler(SimpleHTTPRequestHandler):
    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)

        if parsed.path == "/api/public/status":
            self._send_json(public_status())
            return

        if parsed.path == "/api/admin/status":
            if not self._is_authorized_admin():
                self._send_json({"error": "Unauthorized"}, status=HTTPStatus.UNAUTHORIZED)
                return
            self._send_json(admin_status())
            return

        if parsed.path == "/api/admin/config":
            if not self._is_authorized_admin():
                self._send_json({"error": "Unauthorized"}, status=HTTPStatus.UNAUTHORIZED)
                return
            self._send_json(current_config())
            return

        return super().do_GET()

    def do_POST(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)

        if parsed.path != "/api/admin/config":
            self.send_error(HTTPStatus.NOT_FOUND, "Unknown endpoint")
            return

        if not self._is_authorized_admin():
            self._send_json({"error": "Unauthorized"}, status=HTTPStatus.UNAUTHORIZED)
            return

        content_length = int(self.headers.get("Content-Length", "0"))
        raw_payload = self.rfile.read(content_length)

        try:
            payload = json.loads(raw_payload.decode("utf-8"))
            apply_config_update(payload)
        except json.JSONDecodeError:
            self._send_json({"error": "Invalid JSON body."}, status=HTTPStatus.BAD_REQUEST)
            return
        except (KeyError, TypeError, ValueError):
            self._send_json({"error": "Invalid config payload."}, status=HTTPStatus.BAD_REQUEST)
            return

        self._send_json({"ok": True, "config": current_config()})

    def _is_authorized_admin(self) -> bool:
        provided_token = self.headers.get("X-Admin-Token", "")
        return bool(provided_token) and provided_token == ADMIN_TOKEN

    def _send_json(self, payload: dict, status: HTTPStatus = HTTPStatus.OK) -> None:
        content = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)


def public_status() -> dict:
    with STATE_LOCK:
        return {
            "maintenanceMode": STATE["maintenanceMode"],
            "serviceMessage": STATE["serviceMessage"],
        }


def admin_status() -> dict:
    with STATE_LOCK:
        return {
            "service": "Remote Administration Tool",
            "uptimeSeconds": round(time.time() - SERVER_STARTED_AT, 2),
            "maintenanceMode": STATE["maintenanceMode"],
            "allowedOrigins": STATE["allowedOrigins"],
            "adminTokenConfigured": ADMIN_TOKEN != "change-me",
        }


def current_config() -> dict:
    with STATE_LOCK:
        return {
            "maintenanceMode": STATE["maintenanceMode"],
            "serviceMessage": STATE["serviceMessage"],
            "allowedOrigins": STATE["allowedOrigins"],
        }


def apply_config_update(payload: dict) -> None:
    maintenance_mode = payload["maintenanceMode"]
    service_message = payload["serviceMessage"]
    allowed_origins = payload["allowedOrigins"]

    if not isinstance(maintenance_mode, bool):
        raise TypeError("maintenanceMode must be boolean")
    if not isinstance(service_message, str) or len(service_message.strip()) < 3:
        raise ValueError("serviceMessage must be a meaningful string")
    if not isinstance(allowed_origins, list) or not allowed_origins:
        raise ValueError("allowedOrigins must be a non-empty list")

    normalized_origins = [str(item).strip() for item in allowed_origins if str(item).strip()]
    if not normalized_origins:
        raise ValueError("allowedOrigins must contain at least one non-empty origin")

    with STATE_LOCK:
        STATE["maintenanceMode"] = maintenance_mode
        STATE["serviceMessage"] = service_message.strip()
        STATE["allowedOrigins"] = normalized_origins


def main() -> None:
    web_root = Path(__file__).resolve().parent
    server = ThreadingHTTPServer((HOST, PORT), AppHandler)
    print(f"Serving Remote Administration Tool at http://127.0.0.1:{PORT}")
    print(f"Static root: {web_root}")
    server.serve_forever()


if __name__ == "__main__":
    main()
