"""Access control, capacity and business validation independent of HTTP."""

import base64
import re
import secrets
from pathlib import Path
from datetime import date, timedelta
from .policy import ROLES, OPS, CLINICAL, FINANCE, STATES
from .security import APIError, require, text_field, integer, iso_date
from .records import get_record, rows, now, uid


def resident_access(db, user, resident_id, clinical=False):
    resident = get_record(db, resident_id, "residents")
    role = user["role"]
    if role == "FAMILY":
        linked = user["id"] in resident.get("family_ids", [])
        if resident["owner"] != user["id"] and not linked:
            raise APIError(403, "Bạn không được truy cập hồ sơ này.")
        if clinical and not resident.get("consent", False):
            raise APIError(403, "Chưa có đồng ý chia sẻ báo cáo sức khỏe.")
    elif role in ["NURSE", "DOCTOR"]:
        if user["id"] not in resident.get("staff_ids", []):
            raise APIError(403, "Hồ sơ chưa được phân công cho bạn.")
    elif role == "ADMIN" or (clinical and role not in CLINICAL):
        raise APIError(403, "Không có quyền xem thông tin chăm sóc.")
    return resident


POLICY = {
    "residents": ["FAMILY"] + OPS + CLINICAL,
    "bookings": ["FAMILY"] + OPS,
    "packages": OPS,
    "rooms": OPS,
    "care": CLINICAL,
    "vitals": CLINICAL,
    "medications": ["DOCTOR", "MANAGER"],
    "doses": CLINICAL,
    "meals": CLINICAL,
    "incidents": CLINICAL,
    "requests": ["FAMILY"] + OPS + CLINICAL,
    "visits": ["FAMILY"] + OPS,
    "activities": OPS + CLINICAL,
    "enrollments": ["FAMILY"] + OPS + CLINICAL,
    "shifts": ["MANAGER"],
    "handoffs": CLINICAL,
    "reports": CLINICAL,
    "payments": FINANCE,
    "attachments": CLINICAL + OPS + ["FAMILY"],
}
CLINICAL_KINDS = [
    "care",
    "vitals",
    "medications",
    "doses",
    "meals",
    "incidents",
    "handoffs",
    "reports",
]


def visible(db, user, kind, item):
    role = user["role"]
    if kind in ["packages", "rooms", "activities"]:
        return True
    if kind == "shifts":
        return role in ["MANAGER", "NURSE", "DOCTOR", "RECEPTION"]
    if role == "ADMIN":
        return False
    if kind in ["bookings", "payments"] and role in FINANCE + OPS:
        return True
    if kind == "payments" and role == "FAMILY":
        try:
            resident_access(db, user, item["resident"])
            return True
        except APIError:
            return False
    if kind == "residents":
        try:
            resident_access(db, user, item["id"])
            return role != "ACCOUNTANT"
        except APIError:
            return False
    if kind == "requests" and item["owner"] == user["id"]:
        return True
    if item.get("resident"):
        try:
            if (
                kind == "attachments"
                and role == "RECEPTION"
                and item["owner"] != user["id"]
            ):
                return False
            resident_access(
                db,
                user,
                item["resident"],
                kind in CLINICAL_KINDS
                or (kind == "attachments" and item["owner"] != user["id"]),
            )
            if (
                kind == "attachments"
                and role == "FAMILY"
                and item["owner"] != user["id"]
                and not item.get("shared")
            ):
                return False
            if role == "FAMILY" and kind in ["handoffs", "incidents"]:
                return False
            if role == "FAMILY" and kind == "reports":
                return item.get("shared", False)
            return True
        except APIError:
            return False
    return role in ["MANAGER"] or (item["owner"] == user["id"])


def project(user, kind, item):
    item = dict(item)
    item.pop("content", None)
    if kind == "residents" and user["role"] == "RECEPTION":
        for key in ["health", "allergies", "diet", "medication_notes"]:
            item.pop(key, None)
    if (
        kind == "residents"
        and user["role"] == "FAMILY"
        and item["owner"] != user["id"]
        and not item.get("consent")
    ):
        for key in ["health", "allergies", "diet", "habits"]:
            item.pop(key, None)
    if kind == "bookings" and user["role"] == "ACCOUNTANT":
        item = {
            k: v
            for k, v in item.items()
            if k
            in [
                "id",
                "owner",
                "resident",
                "code",
                "total",
                "status",
                "start",
                "end",
                "package_name",
                "duration",
                "created_at",
            ]
        }
    return item


def room_available(db, room_id, start, end, exclude=None):
    room = get_record(db, room_id, "rooms")
    if not room.get("active"):
        return False
    overlapping = [
        b
        for b in rows(db, "bookings")
        if b["id"] != exclude
        and b.get("room_id") == room_id
        and b["status"] in ["Đã xác nhận", "Đang lưu trú"]
        and b["start"] < end
        and b["end"] > start
    ]
    events = [(max(b["start"], start), 1) for b in overlapping] + [
        (min(b["end"], end), -1) for b in overlapping
    ]
    count = peak = 0
    for _, delta in sorted(events, key=lambda x: (x[0], x[1])):
        count += delta
        peak = max(peak, count)
    return peak < room["capacity"]


def validate(db, user, kind, body, old=None):
    body = dict(body)
    for key, value in body.items():
        if (
            isinstance(value, str)
            and len(value) > 10000
            and not (kind == "attachments" and key == "content")
        ):
            raise APIError(400, "Nội dung quá dài.")
    if kind == "residents":
        body["name"] = text_field(body, "name", True, 120)
        birthday = iso_date(body.get("dob"))
        if birthday > date.today():
            raise APIError(400, "Ngày sinh phải ở quá khứ.")
        body["phone"] = text_field(body, "phone", True, 30)
        if not re.fullmatch(r"[+\d ()-]{8,30}", body["phone"]):
            raise APIError(400, "Số điện thoại không hợp lệ.")
        if user["role"] != "MANAGER":
            body["staff_ids"] = old.get("staff_ids", []) if old else []
            body["family_ids"] = old.get("family_ids", []) if old else []
        for staff_id in body.get("staff_ids", []):
            row = db.execute(
                "SELECT role,active FROM users WHERE id=?", (staff_id,)
            ).fetchone()
            if not row or not row["active"] or row["role"] not in ["NURSE", "DOCTOR"]:
                raise APIError(400, "Nhân viên chăm sóc không hợp lệ.")
        for family_id in body.get("family_ids", []):
            row = db.execute(
                "SELECT role,active FROM users WHERE id=?", (family_id,)
            ).fetchone()
            if not row or not row["active"] or row["role"] != "FAMILY":
                raise APIError(400, "Thành viên gia đình không hợp lệ.")
        body["consent"] = body.get("consent") is True
        if user["role"] in ["NURSE", "DOCTOR", "RECEPTION"]:
            body["consent"] = old.get("consent", False) if old else False
    elif kind in ["packages", "rooms", "activities"]:
        body["name"] = text_field(body, "name", True, 150)
        body["active"] = body.get("active") is True
        if kind == "packages":
            body["price"] = integer(body, "price", 1000, 1000000000)
            body["days"] = integer(body, "days", 1, 365)
        if kind in ["rooms", "activities"]:
            body["capacity"] = integer(body, "capacity", 1, 1000)
        if kind == "activities":
            iso_date(body.get("date"))
    elif kind == "bookings":
        if old:
            # Dates and financial quotation remain immutable once submitted.
            for key in [
                "package_id",
                "package_name",
                "duration",
                "start",
                "end",
                "total",
                "code",
            ]:
                body[key] = old[key]
            target = body.get("status", old["status"])
            if user["role"] == "FAMILY":
                if (
                    old["owner"] != user["id"]
                    or target != "Đã hủy"
                    or old["status"]
                    not in ["Chờ duyệt", "Danh sách chờ", "Đã xác nhận"]
                ):
                    raise APIError(
                        403, "Chỉ được hủy đơn của mình trước khi nhận phòng."
                    )
                body = dict(old, status="Đã hủy")
            else:
                transitions = {
                    "Chờ duyệt": ["Danh sách chờ", "Đã xác nhận", "Đã hủy"],
                    "Danh sách chờ": ["Đã xác nhận", "Đã hủy"],
                    "Đã xác nhận": ["Đang lưu trú", "Đã hủy"],
                    "Đang lưu trú": ["Hoàn tất"],
                    "Hoàn tất": [],
                    "Đã hủy": [],
                }
                if target != old["status"] and target not in transitions[old["status"]]:
                    raise APIError(400, "Không thể chuyển trạng thái này.")
            if target in ["Đã xác nhận", "Đang lưu trú"]:
                room_id = body.get("room_id")
                if not room_id or not room_available(
                    db, room_id, body["start"], body["end"], old["id"]
                ):
                    raise APIError(
                        409, "Cần chọn phòng còn chỗ trong toàn bộ thời gian lưu trú."
                    )
        else:
            package = get_record(db, body.get("package_id"), "packages")
            if not package.get("active"):
                raise APIError(400, "Gói đã ngừng nhận đăng ký.")
            duration = integer(body, "duration", 1, 12)
            start = iso_date(body.get("start"))
            if start < date.today():
                raise APIError(400, "Ngày đến không được ở quá khứ.")
            body.update(
                package_name=package["name"],
                duration=duration,
                start=start.isoformat(),
                end=(start + timedelta(days=duration * package["days"])).isoformat(),
                total=package["price"] * duration,
                status="Chờ duyệt",
                code="WF-" + secrets.token_hex(5).upper(),
                room_id="",
            )
    elif kind == "payments":
        booking = get_record(db, body.get("booking_id"), "bookings")
        body["amount"] = integer(body, "amount", 1, 1000000000)
        if body.get("type") not in ["Thu tiền", "Hoàn tiền"]:
            raise APIError(400, "Loại giao dịch không hợp lệ.")
        if not body.get("reference"):
            raise APIError(400, "Cần mã đối soát giao dịch.")
        if any(p.get("reference") == body["reference"] for p in rows(db, "payments")):
            raise APIError(409, "Mã đối soát đã được ghi nhận.")
        paid = sum(
            p["amount"] * (-1 if p["type"] == "Hoàn tiền" else 1)
            for p in rows(db, "payments")
            if p["booking_id"] == booking["id"]
        )
        if body["type"] == "Hoàn tiền" and body["amount"] > paid:
            raise APIError(400, "Hoàn tiền vượt số tiền đã thu.")
        if body["type"] == "Thu tiền" and (
            booking["status"] == "Đã hủy" or paid + body["amount"] > booking["total"]
        ):
            raise APIError(400, "Không thể thu tiền cho đơn hủy hoặc vượt tổng phí.")
        body["recorded_by"] = user["name"]
    elif kind == "vitals":
        for key, low, high in [
            ("systolic", 40, 300),
            ("diastolic", 20, 200),
            ("pulse", 20, 250),
            ("spo2", 40, 100),
        ]:
            body[key] = integer(body, key, low, high)
        body["alert"] = (
            body["systolic"] >= 180 or body["systolic"] < 90 or body["spo2"] < 94
        )
        body["recorded_by"] = user["name"]
    elif kind == "doses":
        medication = get_record(db, body.get("medication_id"), "medications")
        if medication["resident"] != body.get("resident"):
            raise APIError(400, "Thuốc không thuộc hồ sơ này.")
        if body.get("status") not in ["Đã dùng", "Bỏ lỡ", "Từ chối"]:
            raise APIError(400, "Trạng thái dùng thuốc không hợp lệ.")
        body["recorded_by"] = user["name"]
    elif kind == "enrollments":
        if old:
            body["activity_id"] = old["activity_id"]
            if user["role"] == "FAMILY" and (
                old["owner"] != user["id"] or body.get("status") != "Đã hủy"
            ):
                raise APIError(403, "Gia đình chỉ được hủy đăng ký của mình.")
            if body.get("status") not in [
                "Đã đăng ký",
                "Đã tham gia",
                "Vắng mặt",
                "Đã hủy",
            ]:
                raise APIError(400, "Trạng thái tham gia không hợp lệ.")
            if old.get("status") == "Đã hủy":
                raise APIError(
                    400, "Đăng ký đã hủy không thể phục hồi; hãy tạo đăng ký mới."
                )
            return body
        activity = get_record(db, body.get("activity_id"), "activities")
        if not activity.get("active") or iso_date(activity["date"]) < date.today():
            raise APIError(400, "Hoạt động đã đóng.")
        enrolled = [
            e
            for e in rows(db, "enrollments")
            if e["activity_id"] == activity["id"] and e.get("status") != "Đã hủy"
        ]
        if any(e["resident"] == body.get("resident") for e in enrolled):
            raise APIError(409, "Người lưu trú đã đăng ký hoạt động này.")
        if len(enrolled) >= activity["capacity"]:
            raise APIError(409, "Hoạt động đã đủ số lượng.")
        body["status"] = "Đã đăng ký"
    elif kind in ["visits", "shifts"]:
        iso_date(body.get("date"))
        if kind == "visits" and iso_date(body["date"]) < date.today():
            raise APIError(400, "Ngày thăm không được ở quá khứ.")
    if kind in [
        "care",
        "medications",
        "meals",
        "incidents",
        "requests",
        "handoffs",
        "reports",
    ]:
        body["title"] = text_field(body, "title", True, 200)
    if kind == "medications":
        text_field(body, "dose", True)
        text_field(body, "schedule", True)
        body["prescribed_by"] = user["name"]
    if kind == "reports":
        body["shared"] = body.get("shared") is True
    if kind in ["care", "incidents", "requests"]:
        if kind == "requests" and user["role"] == "FAMILY":
            if old and old["owner"] != user["id"]:
                raise APIError(403, "Chỉ người gửi được sửa yêu cầu.")
            for key in ["status", "response", "assignee"]:
                body[key] = (
                    old.get(key, "")
                    if old
                    else ("Chờ xử lý" if key == "status" else "")
                )
        if body.get("status") not in ["Chờ xử lý", "Đang xử lý", "Hoàn tất"]:
            raise APIError(400, "Trạng thái công việc không hợp lệ.")
        if kind == "care":
            iso_date(body.get("due"))
    if kind == "visits" and user["role"] == "FAMILY":
        if old and old["owner"] != user["id"]:
            raise APIError(403, "Chỉ người đặt được sửa lịch thăm.")
        body["status"] = old.get("status", "Chờ duyệt") if old else "Chờ duyệt"
    if kind == "attachments":
        encoded = body.get("content", "")
        try:
            content = base64.b64decode(encoded, validate=True)
        except (ValueError, TypeError):
            raise APIError(400, "Tệp không hợp lệ.")
        allowed = {
            "application/pdf": b"%PDF-",
            "image/png": b"\x89PNG\r\n\x1a\n",
            "image/jpeg": b"\xff\xd8\xff",
        }
        if (
            body.get("mime") not in allowed
            or not content.startswith(allowed[body["mime"]])
            or not 1 <= len(content) <= 5 * 1024 * 1024
        ):
            raise APIError(400, "Chỉ nhận PDF, PNG hoặc JPEG, tối đa 5 MB.")
        body["filename"] = Path(text_field(body, "filename", True, 200)).name
        body["size"] = len(content)
        body["shared"] = body.get("shared") is True
        body["title"] = text_field(body, "title", True, 200)
    return body
