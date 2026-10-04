"""Password hashing, TOTP and request validation utilities."""

import base64
import hashlib
import hmac
import re
import secrets
import struct
import time
from datetime import date


def password_hash(password, salt=None):
    salt = salt or secrets.token_hex(16)
    digest = hashlib.scrypt(
        password.encode(), salt=bytes.fromhex(salt), n=16384, r=8, p=1
    ).hex()
    return salt + ":" + digest


def password_ok(password, stored):
    return hmac.compare_digest(password_hash(password, stored.split(":")[0]), stored)


class APIError(Exception):
    def __init__(self, status, message):
        self.status, self.message = status, message


def require(user, roles):
    if user["role"] not in roles:
        raise APIError(403, "Tài khoản không có quyền thực hiện thao tác này.")


def text_field(body, key, required=False, limit=3000):
    value = str(body.get(key, "")).strip()
    if (required and not value) or len(value) > limit:
        raise APIError(400, "Thông tin " + key + " chưa hợp lệ.")
    return value


def integer(body, key, low, high):
    value = body.get(key)
    if isinstance(value, bool):
        raise APIError(400, "Giá trị số không hợp lệ.")
    try:
        n = int(value)
        if float(value) != n or not low <= n <= high:
            raise ValueError()
        return n
    except (TypeError, ValueError):
        raise APIError(400, "Giá trị " + key + " không hợp lệ.")


def iso_date(value):
    try:
        return date.fromisoformat(str(value))
    except ValueError:
        raise APIError(400, "Ngày không hợp lệ.")


def totp_step(secret, code):
    if not re.fullmatch(r"\d{6}", str(code)):
        return None
    key = base64.b32decode(secret)
    for step in range(int(time.time() // 30) - 1, int(time.time() // 30) + 2):
        digest = hmac.new(key, struct.pack(">Q", step), hashlib.sha1).digest()
        offset = digest[-1] & 15
        number = (
            struct.unpack(">I", digest[offset : offset + 4])[0] & 0x7FFFFFFF
        ) % 1000000
        if hmac.compare_digest(f"{number:06}", str(code)):
            return step
    return None
