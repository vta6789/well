"""Wellness Farm: dependency-free local application server."""

import argparse
import base64
import csv
import hashlib
import hmac
import io
import json
import os
import re
import secrets
import sqlite3
import struct
import threading
import time
from datetime import date, datetime, timedelta, timezone
from http import cookies
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from backend.security import (
    APIError,
    require,
    text_field,
    integer,
    iso_date,
    password_hash,
    password_ok,
    totp_step,
)

from backend.records import now, uid, insert, unpack, rows, get_record, update
from backend.domain import (
    POLICY,
    CLINICAL_KINDS,
    resident_access,
    visible,
    project,
    room_available,
    validate,
)

ROOT = Path(__file__).resolve().parent
DEMO = os.environ.get("WF_DEMO") == "1"
DATA = Path(
    os.environ.get("WF_DATA_DIR", ROOT / ("data/demo" if DEMO else "data/production"))
)
COOKIE_SECURE = os.environ.get("WF_COOKIE_SECURE") == "1"
DB = DATA / "wellness.sqlite3"
LOCK = threading.RLock()
from backend.policy import ROLES, OPS, CLINICAL, FINANCE, STATES

ATTEMPTS = {}


class Database(sqlite3.Connection):
    def __exit__(self, *args):
        try:
            return super().__exit__(*args)
        finally:
            self.close()


def connect():
    db = sqlite3.connect(DB, timeout=20, factory=Database)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys=ON")
    return db


def public_user(row):
    return {
        k: row[k]
        for k in ["id", "name", "email", "phone", "role", "active", "created_at"]
    }


def audit(db, user, action, kind, record=""):
    db.execute(
        "INSERT INTO audit VALUES(?,?,?,?,?,?,?)",
        (uid(), user["id"], user["name"], action, kind, record, now()),
    )


def init_db():
    DATA.mkdir(parents=True, exist_ok=True)
    with connect() as db:
        db.executescript("""
        CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,
          phone TEXT NOT NULL,password TEXT NOT NULL,role TEXT NOT NULL,active INTEGER DEFAULT 1,created_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),csrf TEXT,expires REAL);
        CREATE TABLE IF NOT EXISTS records(id TEXT PRIMARY KEY,kind TEXT NOT NULL,owner TEXT REFERENCES users(id),
          resident TEXT,body TEXT NOT NULL,created_at TEXT,updated_at TEXT);
        CREATE INDEX IF NOT EXISTS records_kind ON records(kind);
        CREATE TABLE IF NOT EXISTS audit(id TEXT PRIMARY KEY,user_id TEXT,user_name TEXT,action TEXT,kind TEXT,record_id TEXT,at TEXT);
        CREATE TABLE IF NOT EXISTS mfa(user_id TEXT PRIMARY KEY REFERENCES users(id),secret TEXT NOT NULL,enabled INTEGER DEFAULT 0,last_step INTEGER DEFAULT -1);
        """)
        if not db.execute("SELECT 1 FROM records WHERE kind='packages'").fetchone():
            for name, price, days, desc in [
                (
                    "Gói theo ngày",
                    500000,
                    1,
                    "Trải nghiệm vườn, hai bữa ăn và dưỡng sinh",
                ),
                (
                    "Gói theo tuần",
                    3200000,
                    7,
                    "Nghỉ dưỡng, dinh dưỡng cá nhân và theo dõi sức khỏe",
                ),
                (
                    "Gói theo tháng",
                    12000000,
                    30,
                    "Lưu trú dài hạn, điều dưỡng và báo cáo gia đình",
                ),
            ]:
                insert(
                    db,
                    "packages",
                    None,
                    None,
                    dict(
                        name=name, price=price, days=days, description=desc, active=True
                    ),
                )
            for name, capacity in [
                ("Bungalow Sen 01", 2),
                ("Bungalow Trúc 02", 2),
                ("Nhà An Yên 03", 4),
            ]:
                insert(
                    db,
                    "rooms",
                    None,
                    None,
                    dict(
                        name=name,
                        capacity=capacity,
                        facility="Bình Mỹ",
                        accessible=True,
                        active=True,
                    ),
                )


class Handler(BaseHTTPRequestHandler):
    server_version = "WellnessFarm"

    @staticmethod
    def session_cookie(token, max_age):
        return (
            f"wf_session={token}; HttpOnly; SameSite=Strict; Path=/; Max-Age={max_age}"
            + ("; Secure" if COOKIE_SECURE else "")
        )

    def log_message(self, fmt, *args):
        # Do not log request paths or health content.
        pass

    def send(
        self,
        status,
        payload,
        content_type="application/json; charset=utf-8",
        extra=None,
    ):
        data = (
            json.dumps(payload, ensure_ascii=False).encode()
            if isinstance(payload, (dict, list))
            else payload
        )
        if isinstance(data, str):
            data = data.encode()
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "same-origin")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
        )
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        try:
            self.end_headers()
            self.wfile.write(data)
        except ConnectionError:
            # A navigation/reload can disconnect while a response is in flight.
            self.close_connection = True

    def do_GET(self):
        self.handle_request("GET")

    def do_POST(self):
        self.handle_request("POST")

    def do_PATCH(self):
        self.handle_request("PATCH")

    def session(self, db):
        jar = cookies.SimpleCookie()
        try:
            jar.load(self.headers.get("Cookie", ""))
        except cookies.CookieError:
            raise APIError(401, "Phiên không hợp lệ.")
        token = jar.get("wf_session")
        session = db.execute(
            "SELECT * FROM sessions WHERE token=? AND expires>?",
            (token.value if token else "", time.time()),
        ).fetchone()
        if not session:
            raise APIError(401, "Vui lòng đăng nhập.")
        row = db.execute(
            "SELECT * FROM users WHERE id=? AND active=1", (session["user_id"],)
        ).fetchone()
        if not row:
            raise APIError(401, "Tài khoản đã bị vô hiệu hóa.")
        return public_user(row), session

    def handle_request(self, method):
        try:
            path = self.path.split("?")[0]
            host = self.headers.get("Host", "")
            if host not in [
                f"127.0.0.1:{self.server.server_port}",
                f"localhost:{self.server.server_port}",
            ]:
                raise APIError(400, "Host không được phép.")
            if not path.startswith("/api/"):
                if method != "GET":
                    raise APIError(405, "Phương thức không được hỗ trợ.")
                assets = {
                    "/": ("index.html", "text/html; charset=utf-8"),
                    "/wellness_farm_web_app.html": (
                        "index.html",
                        "text/html; charset=utf-8",
                    ),
                    "/app.js": ("app.js", "application/javascript; charset=utf-8"),
                    "/style.css": ("style.css", "text/css; charset=utf-8"),
                    "/design-tokens.css": (
                        "design-tokens.css",
                        "text/css; charset=utf-8",
                    ),
                    "/original-theme.css": (
                        "original-theme.css",
                        "text/css; charset=utf-8",
                    ),
                }
                if path == "/index.html":
                    assets[path] = ("index.html", "text/html; charset=utf-8")
                elif re.fullmatch(
                    r"/frontend/(core|components|navigation|pages|forms|account|events|bootstrap)\.js",
                    path,
                ):
                    assets[path] = (path[1:], "application/javascript; charset=utf-8")
                elif path == "/assets/images/farm.jpg":
                    assets[path] = (path[1:], "image/jpeg")
                elif path == "/assets/fonts/fonts.css":
                    assets[path] = (path[1:], "text/css; charset=utf-8")
                elif re.fullmatch(r"/assets/fonts/[a-zA-Z0-9-]+\.woff2", path):
                    assets[path] = (path[1:], "font/woff2")
                if path == "/assets/fontawesome/css/all.min.css":
                    assets[path] = (
                        "assets/fontawesome/css/all.min.css",
                        "text/css; charset=utf-8",
                    )
                elif re.fullmatch(
                    r"/assets/fontawesome/webfonts/[a-zA-Z0-9-]+\.(woff2|ttf)", path
                ):
                    assets[path] = (
                        path[1:],
                        "font/woff2" if path.endswith(".woff2") else "font/ttf",
                    )
                if path not in assets:
                    raise APIError(404, "Không tìm thấy trang.")
                filename, mime = assets[path]
                return self.send(200, (ROOT / filename).read_bytes(), mime)
            body = {}
            if method != "GET":
                if (
                    self.headers.get("Origin")
                    != f"{'https' if COOKIE_SECURE else 'http'}://{host}"
                ):
                    raise APIError(403, "Nguồn yêu cầu không hợp lệ.")
                if "application/json" not in self.headers.get("Content-Type", ""):
                    raise APIError(415, "Cần nội dung JSON.")
                size = int(self.headers.get("Content-Length", "0"))
                if (
                    size > (8 * 1024 * 1024 if path == "/api/attachments" else 100000)
                    or size < 0
                ):
                    raise APIError(413, "Nội dung quá lớn.")
                body = json.loads(self.rfile.read(size) or "{}")
                if not isinstance(body, dict):
                    raise APIError(400, "Nội dung không hợp lệ.")
            with LOCK, connect() as db:
                if path in ["/api/login", "/api/register"] and method == "POST":
                    return self.auth(db, path, body)
                if path == "/api/public" and method == "GET":
                    return self.send(
                        200,
                        {
                            "demo": DEMO,
                            "packages": rows(db, "packages"),
                            "rooms": rows(db, "rooms"),
                            "activities": rows(db, "activities"),
                        },
                    )
                user, session = self.session(db)
                if method != "GET" and not hmac.compare_digest(
                    self.headers.get("X-CSRF-Token", ""), session["csrf"]
                ):
                    raise APIError(403, "Mã bảo vệ phiên không hợp lệ.")
                if path == "/api/me" and method == "GET":
                    mfa = db.execute(
                        "SELECT enabled FROM mfa WHERE user_id=?", (user["id"],)
                    ).fetchone()
                    return self.send(
                        200,
                        {
                            "user": dict(user, mfa=bool(mfa and mfa["enabled"])),
                            "csrf": session["csrf"],
                            "demo": DEMO,
                        },
                    )
                if path in ["/api/mfa/setup", "/api/mfa/enable"] and method == "POST":
                    stored = db.execute(
                        "SELECT password FROM users WHERE id=?", (user["id"],)
                    ).fetchone()[0]
                    if not password_ok(str(body.get("password", "")), stored):
                        raise APIError(400, "Mật khẩu hiện tại không đúng.")
                    mfa = db.execute(
                        "SELECT * FROM mfa WHERE user_id=?", (user["id"],)
                    ).fetchone()
                    if mfa and mfa["enabled"]:
                        raise APIError(400, "MFA đã được bật.")
                    if path.endswith("setup"):
                        secret = base64.b32encode(secrets.token_bytes(20)).decode()
                        db.execute(
                            "INSERT OR REPLACE INTO mfa VALUES(?,?,0,-1)",
                            (user["id"], secret),
                        )
                        return self.send(200, {"secret": secret})
                    step = totp_step(mfa["secret"], body.get("otp")) if mfa else None
                    if step is None:
                        raise APIError(400, "Mã xác thực không đúng.")
                    db.execute(
                        "UPDATE mfa SET enabled=1,last_step=? WHERE user_id=?",
                        (step, user["id"]),
                    )
                    db.execute(
                        "DELETE FROM sessions WHERE user_id=? AND token<>?",
                        (user["id"], session["token"]),
                    )
                    audit(
                        db, user, "Bật MFA và thu hồi phiên khác", "users", user["id"]
                    )
                    return self.send(200, {"ok": True})
                if path == "/api/logout" and method == "POST":
                    db.execute(
                        "DELETE FROM sessions WHERE token=?", (session["token"],)
                    )
                    return self.send(
                        200,
                        {"ok": True},
                        extra={"Set-Cookie": self.session_cookie("", 0)},
                    )
                if path == "/api/password" and method == "POST":
                    stored = db.execute(
                        "SELECT password FROM users WHERE id=?", (user["id"],)
                    ).fetchone()[0]
                    if not password_ok(str(body.get("current", "")), stored):
                        raise APIError(400, "Mật khẩu hiện tại không đúng.")
                    password = str(body.get("password", ""))
                    if not 12 <= len(password) <= 128:
                        raise APIError(400, "Mật khẩu cần 12–128 ký tự.")
                    db.execute(
                        "UPDATE users SET password=? WHERE id=?",
                        (password_hash(password), user["id"]),
                    )
                    db.execute("DELETE FROM sessions WHERE user_id=?", (user["id"],))
                    audit(
                        db, user, "Đổi mật khẩu, thu hồi mọi phiên", "users", user["id"]
                    )
                    return self.send(200, {"ok": True})
                if path == "/api/users":
                    if method == "GET":
                        require(user, ["ADMIN", "MANAGER"])
                        return self.send(
                            200,
                            [
                                public_user(r)
                                for r in db.execute(
                                    "SELECT * FROM users ORDER BY created_at DESC"
                                )
                            ],
                        )
                    if method == "POST":
                        require(user, ["ADMIN"])
                        return self.create_user(db, body, user)
                if path.startswith("/api/users/") and method == "PATCH":
                    require(user, ["ADMIN"])
                    target = path.rsplit("/", 1)[1]
                    if target == user["id"]:
                        raise APIError(
                            400, "Không thể tự khóa hoặc đổi vai trò của mình."
                        )
                    role = body.get("role")
                    if role not in ROLES or not isinstance(body.get("active"), bool):
                        raise APIError(400, "Vai trò không hợp lệ.")
                    if not db.execute(
                        "SELECT 1 FROM users WHERE id=?", (target,)
                    ).fetchone():
                        raise APIError(404, "Không tìm thấy tài khoản.")
                    db.execute(
                        "UPDATE users SET role=?,active=? WHERE id=?",
                        (role, int(body["active"]), target),
                    )
                    db.execute("DELETE FROM sessions WHERE user_id=?", (target,))
                    audit(db, user, "Cập nhật quyền / khóa tài khoản", "users", target)
                    return self.send(200, {"ok": True})
                if path == "/api/audit" and method == "GET":
                    require(user, ["ADMIN", "MANAGER"])
                    return self.send(
                        200,
                        [
                            dict(r)
                            for r in db.execute(
                                "SELECT * FROM audit ORDER BY at DESC LIMIT 500"
                            )
                        ],
                    )
                if (
                    path.startswith("/api/attachments/")
                    and path.endswith("/download")
                    and method == "GET"
                ):
                    record = path.split("/")[3]
                    attachment = get_record(db, record, "attachments")
                    if not visible(db, user, "attachments", attachment):
                        raise APIError(403, "Không có quyền tải tệp.")
                    audit(db, user, "Tải hồ sơ đính kèm", "attachments", record)
                    return self.send(
                        200,
                        base64.b64decode(attachment["content"]),
                        attachment["mime"],
                        {
                            "Content-Disposition": 'attachment; filename="wellness-document.'
                            + {
                                "application/pdf": "pdf",
                                "image/png": "png",
                                "image/jpeg": "jpg",
                            }[attachment["mime"]]
                            + '"'
                        },
                    )
                if path == "/api/export" and method == "GET":
                    require(user, FINANCE)
                    output = io.StringIO()
                    writer = csv.writer(output)
                    writer.writerow(
                        [
                            "Ma don",
                            "Goi",
                            "Ngay den",
                            "Ngay ve",
                            "Trang thai",
                            "Tong phi",
                            "Da thu",
                            "Con no",
                        ]
                    )
                    payments = rows(db, "payments")
                    for b in rows(db, "bookings"):
                        paid = sum(
                            p["amount"] * (-1 if p["type"] == "Hoàn tiền" else 1)
                            for p in payments
                            if p["booking_id"] == b["id"]
                        )
                        values = [
                            b["code"],
                            b["package_name"],
                            b["start"],
                            b["end"],
                            b["status"],
                            b["total"],
                            paid,
                            max(0, b["total"] - paid) if b["status"] != "Đã hủy" else 0,
                        ]
                        writer.writerow(
                            [
                                (
                                    "'" + str(v)
                                    if str(v).startswith(("=", "+", "-", "@"))
                                    else v
                                )
                                for v in values
                            ]
                        )
                    audit(db, user, "Xuất báo cáo tài chính", "bookings")
                    return self.send(
                        200,
                        "\ufeff" + output.getvalue(),
                        "text/csv; charset=utf-8",
                        {
                            "Content-Disposition": "attachment; filename=wellness-report.csv"
                        },
                    )
                parts = path.strip("/").split("/")
                if len(parts) not in [2, 3] or parts[1] not in POLICY:
                    raise APIError(404, "Không tìm thấy API.")
                kind = parts[1]
                if method == "GET":
                    result = [
                        project(user, kind, item)
                        for item in rows(db, kind)
                        if visible(db, user, kind, item)
                    ]
                    if kind in CLINICAL_KINDS + ["residents"]:
                        audit(db, user, "Đọc danh sách hồ sơ", kind)
                    return self.send(200, result)
                require(user, POLICY[kind])
                old = get_record(db, parts[2], kind) if len(parts) == 3 else None
                if method == "PATCH" and not old:
                    raise APIError(404, "Thiếu bản ghi.")
                if old and not visible(db, user, kind, old):
                    raise APIError(403, "Không có quyền với bản ghi này.")
                if old and kind in ["payments", "vitals", "doses", "attachments"]:
                    raise APIError(
                        403,
                        "Bản ghi này được lưu bất biến; cần ghi nhận nghiệp vụ bổ sung.",
                    )
                resident_id = old["resident"] if old else body.get("resident")
                if resident_id:
                    resident_access(db, user, resident_id, kind in CLINICAL_KINDS)
                if (
                    kind
                    not in [
                        "packages",
                        "rooms",
                        "activities",
                        "shifts",
                        "residents",
                        "payments",
                    ]
                    and not resident_id
                ):
                    raise APIError(400, "Cần chọn người lưu trú.")
                if (
                    old
                    and kind == "residents"
                    and user["role"] == "FAMILY"
                    and old["owner"] != user["id"]
                ):
                    raise APIError(
                        403, "Chỉ chủ hồ sơ được thay đổi thông tin và sự đồng ý."
                    )
                merged = dict(old or {}, **body)
                if kind == "residents" and user["role"] == "RECEPTION" and old:
                    for key in [
                        "health",
                        "allergies",
                        "diet",
                        "medication_notes",
                        "consent",
                    ]:
                        merged[key] = old.get(key)
                clean = validate(db, user, kind, merged, old)
                owner = user["id"]
                if kind == "bookings" and not old and resident_id:
                    owner = get_record(db, resident_id, "residents")["owner"]
                if kind == "payments":
                    booking = get_record(db, clean["booking_id"], "bookings")
                    owner, resident_id = booking["owner"], booking["resident"]
                if old:
                    update(db, old["id"], clean)
                    record = old["id"]
                else:
                    clean = {
                        k: v
                        for k, v in clean.items()
                        if k
                        not in ["id", "owner", "created_at", "updated_at", "resident"]
                    }
                    record = insert(db, kind, owner, resident_id, clean)
                audit(db, user, "Cập nhật" if old else "Tạo mới", kind, record)
                return self.send(200, project(user, kind, get_record(db, record, kind)))
        except APIError as e:
            self.send(e.status, {"error": e.message})
        except (ValueError, TypeError, KeyError, json.JSONDecodeError):
            self.send(400, {"error": "Dữ liệu không hợp lệ."})
        except sqlite3.IntegrityError:
            self.send(409, {"error": "Dữ liệu bị trùng hoặc không hợp lệ."})
        except Exception:
            self.send(500, {"error": "Không thể xử lý yêu cầu. Vui lòng thử lại."})

    def auth(self, db, path, body):
        address = self.client_address[0]
        recent = [t for t in ATTEMPTS.get(address, []) if t > time.time() - 900]
        ATTEMPTS[address] = recent
        if len(recent) >= 15:
            raise APIError(429, "Quá nhiều lần thử. Vui lòng chờ 15 phút.")
        recent.append(time.time())
        if path == "/api/register":
            self.create_user(db, dict(body, role="FAMILY"), None, respond=False)
        email = text_field(body, "email", True, 254).lower()
        row = db.execute(
            "SELECT * FROM users WHERE (email=? OR phone=?) AND active=1",
            (email, email),
        ).fetchone()
        if not row or not password_ok(str(body.get("password", "")), row["password"]):
            raise APIError(401, "Thông tin đăng nhập không đúng.")
        mfa = db.execute("SELECT * FROM mfa WHERE user_id=?", (row["id"],)).fetchone()
        if mfa and mfa["enabled"]:
            step = totp_step(mfa["secret"], body.get("otp"))
            if step is None or step <= mfa["last_step"]:
                raise APIError(401, "Cần mã MFA mới từ ứng dụng xác thực.")
            db.execute("UPDATE mfa SET last_step=? WHERE user_id=?", (step, row["id"]))
        token, csrf = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
        db.execute("DELETE FROM sessions WHERE expires<?", (time.time(),))
        db.execute(
            "INSERT INTO sessions VALUES(?,?,?,?)",
            (token, row["id"], csrf, time.time() + 8 * 3600),
        )
        audit(db, public_user(row), "Đăng nhập", "users", row["id"])
        ATTEMPTS[address] = []
        return self.send(
            200,
            {
                "user": dict(public_user(row), mfa=bool(mfa and mfa["enabled"])),
                "csrf": csrf,
            },
            extra={"Set-Cookie": self.session_cookie(token, 28800)},
        )

    def create_user(self, db, body, actor=None, respond=True):
        name = text_field(body, "name", True, 120)
        email = text_field(body, "email", True, 254).lower()
        phone = text_field(body, "phone", True, 30)
        password = str(body.get("password", ""))
        role = body.get("role", "FAMILY")
        if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email) or not re.fullmatch(
            r"[+\d ()-]{8,30}", phone
        ):
            raise APIError(400, "Email hoặc điện thoại không hợp lệ.")
        if not 12 <= len(password) <= 128 or role not in ROLES:
            raise APIError(400, "Mật khẩu cần 12–128 ký tự; vai trò phải hợp lệ.")
        if db.execute(
            "SELECT 1 FROM users WHERE email=? OR phone=?", (email, phone)
        ).fetchone():
            raise APIError(409, "Email hoặc điện thoại đã được sử dụng.")
        record = uid()
        db.execute(
            "INSERT INTO users VALUES(?,?,?,?,?,?,?,?)",
            (record, name, email, phone, password_hash(password), role, 1, now()),
        )
        if actor:
            audit(db, actor, "Tạo tài khoản", "users", record)
        if respond:
            return self.send(200, {"id": record})


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--create-user", action="store_true")
    parser.add_argument("--backup", action="store_true")
    parser.add_argument("--reset-password", action="store_true")
    args = parser.parse_args()
    init_db()
    if args.reset_password:
        import getpass

        email = input("Account email: ").strip().lower()
        password = getpass.getpass("New password (minimum 12 characters): ")
        if not 12 <= len(password) <= 128:
            raise SystemExit("Invalid password length.")
        with connect() as db:
            user = db.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
            if not user:
                raise SystemExit("Account not found.")
            db.execute(
                "UPDATE users SET password=? WHERE id=?",
                (password_hash(password), user["id"]),
            )
            db.execute("DELETE FROM sessions WHERE user_id=?", (user["id"],))
            db.execute("DELETE FROM mfa WHERE user_id=?", (user["id"],))
            audit(
                db,
                public_user(user),
                "Khôi phục mật khẩu / MFA qua CLI",
                "users",
                user["id"],
            )
        print("Password reset; MFA cleared; sessions revoked.")
        return
    if args.backup:
        destination = DATA / (
            "backup-" + datetime.now().strftime("%Y%m%d-%H%M%S") + ".sqlite3"
        )
        with connect() as source, sqlite3.connect(
            destination, factory=Database
        ) as target:
            source.backup(target)
        print("Backup created in data directory:", destination.name)
        return
    if args.create_user:
        import getpass

        name = input("Name: ").strip()
        email = input("Email: ").strip().lower()
        phone = input("Phone: ").strip()
        role = (
            input("Role (ADMIN / MANAGER / DOCTOR / NURSE / RECEPTION / ACCOUNTANT): ")
            .strip()
            .upper()
        )
        password = getpass.getpass("Password (minimum 12 characters): ")
        if (
            role not in ROLES
            or len(password) < 12
            or not name
            or not email
            or not phone
        ):
            raise SystemExit("Invalid user information.")
        with connect() as db:
            db.execute(
                "INSERT INTO users VALUES(?,?,?,?,?,?,?,?)",
                (uid(), name, email, phone, password_hash(password), role, 1, now()),
            )
        print("Account created.")
        return
    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print(f"Wellness Farm: http://127.0.0.1:{args.port}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
