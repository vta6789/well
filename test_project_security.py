"""Deployment settings and public route boundaries."""

import http.client
import os
from pathlib import Path
import subprocess
import sys
import threading
import unittest
from unittest.mock import patch
import server


class DeploymentTests(unittest.TestCase):
    def test_secure_cookie_for_login_and_clear(self):
        with patch.object(server, "COOKIE_SECURE", True):
            for token, age in [("abc", 28800), ("", 0)]:
                cookie = server.Handler.session_cookie(token, age)
                self.assertIn("; Secure", cookie)
                self.assertIn("HttpOnly", cookie)
                self.assertIn("SameSite=Strict", cookie)
        with patch.object(server, "COOKIE_SECURE", False):
            self.assertNotIn("; Secure", server.Handler.session_cookie("abc", 28800))

    def test_demo_and_production_defaults_are_isolated(self):
        env = dict(os.environ)
        env["PYTHONUTF8"] = "1"
        env.pop("WF_DATA_DIR", None)
        for mode, suffix in [("0", "production"), ("1", "demo")]:
            env["WF_DEMO"] = mode
            path = subprocess.check_output(
                [sys.executable, "-c", "import server; print(server.DATA)"],
                env=env,
                text=True,
                encoding="utf-8",
            ).strip()
            self.assertEqual(Path(path), server.ROOT / "data" / suffix)

    def test_canonical_routes_local_csp_and_private_files(self):
        test_http = server.ThreadingHTTPServer(("127.0.0.1", 0), server.Handler)
        thread = threading.Thread(target=test_http.serve_forever, daemon=True)
        thread.start()
        try:
            results = []
            for path in ["/", "/index.html", "/wellness_farm_web_app.html"]:
                connection = http.client.HTTPConnection(
                    "127.0.0.1", test_http.server_port
                )
                connection.request("GET", path)
                response = connection.getresponse()
                self.assertEqual(response.status, 200)
                self.assertNotIn(
                    "https://", response.getheader("Content-Security-Policy")
                )
                results.append(response.read())
                connection.close()
            self.assertEqual(results[0], results[1])
            self.assertEqual(results[1], results[2])
            for path in [
                "/frontend/core.js",
                "/assets/fonts/fonts.css",
                "/assets/images/farm.jpg",
                "/server.py",
                "/data/wellness.sqlite3",
                "/assets/../server.py",
            ]:
                connection = http.client.HTTPConnection(
                    "127.0.0.1", test_http.server_port
                )
                connection.request("GET", path)
                response = connection.getresponse()
                self.assertEqual(
                    response.status,
                    (
                        200
                        if path.startswith(
                            ("/frontend/", "/assets/fonts/", "/assets/images/")
                        )
                        else 404
                    ),
                )
                response.read()
                connection.close()
        finally:
            test_http.shutdown()
            test_http.server_close()
            thread.join()
