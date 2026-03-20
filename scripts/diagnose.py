#!/usr/bin/env python
"""Diagnostic script to verify Railway container can start a server.

This is a TEMPORARY diagnostic tool. It:
1. Prints environment info
2. Tests if the ASGI app can be imported
3. Starts a minimal HTTP server on $PORT to test healthcheck connectivity

If the healthcheck passes with this script, the problem is in gunicorn/daphne.
If it fails, the problem is networking/PORT.
"""
import http.server
import os
import sys

print("=" * 60, flush=True)
print("DIAGNOSTIC MODE — Railway Container Health Test", flush=True)
print("=" * 60, flush=True)
print(f"Python:    {sys.version}", flush=True)
print(f"CWD:       {os.getcwd()}", flush=True)
print(f"PORT:      {os.environ.get('PORT', 'NOT SET')}", flush=True)
print(f"PYTHONPATH: {os.environ.get('PYTHONPATH', 'NOT SET')}", flush=True)
print(f"SETTINGS:  {os.environ.get('DJANGO_SETTINGS_MODULE', 'NOT SET')}", flush=True)
print(f"USER:      {os.environ.get('USER', 'NOT SET')}", flush=True)
print(f"HOME:      {os.environ.get('HOME', 'NOT SET')}", flush=True)

# Test ASGI import
print("\n--- Testing ASGI import ---", flush=True)
try:
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.production")
    import django

    django.setup()
    print(f"Django setup OK: {django.get_version()}", flush=True)

    from config.asgi import application

    print(f"ASGI app OK: {type(application).__name__}", flush=True)
except Exception as e:
    print(f"ASGI FAIL: {e}", flush=True)
    import traceback

    traceback.print_exc()
    print("(continuing anyway to test healthcheck connectivity)", flush=True)

# Test gunicorn/daphne binary presence
print("\n--- Checking server binaries ---", flush=True)
import shutil

for binary in ["gunicorn", "daphne", "uvicorn"]:
    path = shutil.which(binary)
    print(f"  {binary}: {path or 'NOT FOUND'}", flush=True)

# Start minimal HTTP server
port = int(os.environ.get("PORT", "8080"))
print(f"\n--- Starting diagnostic HTTP server on 0.0.0.0:{port} ---", flush=True)


class DiagnosticHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        print(f"HEALTHCHECK HIT: {self.path}", flush=True)
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(b'{"status": "healthy"}')

    def log_message(self, fmt, *args):
        print(f"HTTP: {fmt % args}", flush=True)


server = http.server.HTTPServer(("0.0.0.0", port), DiagnosticHandler)
print(f"Listening on 0.0.0.0:{port} — waiting for healthcheck...", flush=True)
server.serve_forever()
