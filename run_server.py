#!/usr/bin/env python3
from __future__ import annotations

import http.server
import socket
import socketserver
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)


def find_port(start: int = 8765, limit: int = 40) -> int:
    for port in range(start, start + limit):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            try:
                sock.bind(("127.0.0.1", port))
            except OSError:
                continue
            return port
    raise RuntimeError("No free localhost port found.")


if __name__ == "__main__":
    port = find_port()
    url = f"http://127.0.0.1:{port}/"
    with socketserver.TCPServer(("127.0.0.1", port), Handler) as httpd:
        print(f"Serving {ROOT}")
        print(url)
        webbrowser.open(url)
        httpd.serve_forever()
