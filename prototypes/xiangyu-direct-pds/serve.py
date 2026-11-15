"""Tiny static server for the prototype (no Node needed).

    python serve.py          -> http://127.0.0.1:8123
    python serve.py 9000     -> another port

Forces correct MIME types for ES modules (some Windows registries map .js to text/plain).
"""
import http.server
import os
import sys


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".css": "text/css",
        ".html": "text/html",
        ".json": "application/json",
    }

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8123
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    print(f"Serving prototype at http://127.0.0.1:{port}")
    http.server.ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
