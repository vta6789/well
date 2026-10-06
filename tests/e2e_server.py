"""E2E server with an ephemeral database; never reads workspace data."""

import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

with tempfile.TemporaryDirectory(prefix="wellness-e2e-") as directory:
    os.environ["WF_DATA_DIR"] = directory
    os.environ.pop("WF_COOKIE_SECURE", None)
    os.environ.pop("WF_DEMO", None)
    import server

    server.init_db()
    with server.connect() as db:
        db.execute(
            "INSERT INTO users VALUES(?,?,?,?,?,?,?,?)",
            ("e2e-admin", "Test Administrator", "admin@e2e.test", "", server.password_hash("Admin-e2e-test-12345"), "ADMIN", 1, server.now()),
        )
    sys.argv = ["server.py", "--port", "8123"]
    server.main()
