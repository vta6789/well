"""SQLite record helpers operating on explicit database connections."""

import json
import secrets
from datetime import datetime, timezone
from .security import APIError


def now():
    return datetime.now(timezone.utc).isoformat()


def uid():
    return secrets.token_hex(12)


def insert(db, kind, owner, resident, body):
    record = uid()
    db.execute(
        "INSERT INTO records VALUES(?,?,?,?,?,?,?)",
        (
            record,
            kind,
            owner,
            resident,
            json.dumps(body, ensure_ascii=False),
            now(),
            now(),
        ),
    )
    return record


def unpack(row):
    return dict(
        json.loads(row["body"]),
        id=row["id"],
        owner=row["owner"],
        resident=row["resident"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def rows(db, kind):
    return [
        unpack(r)
        for r in db.execute(
            "SELECT * FROM records WHERE kind=? ORDER BY created_at DESC", (kind,)
        )
    ]


def get_record(db, record, kind=None):
    row = db.execute("SELECT * FROM records WHERE id=?", (record,)).fetchone()
    if not row or (kind and row["kind"] != kind):
        raise APIError(404, "Không tìm thấy bản ghi.")
    return unpack(row)


def update(db, record, body):
    clean = {
        k: v
        for k, v in body.items()
        if k not in ["id", "owner", "resident", "created_at", "updated_at"]
    }
    db.execute(
        "UPDATE records SET body=?,updated_at=? WHERE id=?",
        (json.dumps(clean, ensure_ascii=False), now(), record),
    )
