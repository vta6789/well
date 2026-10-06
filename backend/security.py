"""Password hashing and request validation utilities."""

import hashlib
import hmac
import re
import secrets
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
