"""Access control, capacity and business validation independent of HTTP."""

import base64
import re
import secrets
from pathlib import Path
from datetime import date, timedelta
from .policy import ROLES, OPS, CLINICAL, FINANCE, STATES
from .security import APIError, require, text_field, integer, iso_date
from .records import get_record, rows, now, uid
from .learning import LEARNERS, LEARNING_KINDS, LEARNING_MANAGERS, TOPICS, expert_access, validate_learning
from .packages import validate_package, package_entitlements


def resident_access(db, user, resident_id, clinical=False):
    resident = get_record(db, resident_id, "residents")
    role = user["role"]
    if role in LEARNERS:
        linked = user["id"] in resident.get("family_ids", [])
        if resident["owner"] != user["id"] and not linked:
            raise APIError(403, "Bạn không được truy cập hồ sơ này.")
        if clinical and not resident.get("consent", False):
            raise APIError(403, "Chưa có đồng ý chia sẻ báo cáo sức khỏe.")
    elif role == "EXPERT":
        if clinical:
            raise APIError(403, "Chuyên gia workshop không có quyền xem hồ sơ y tế.")
        expert_access(db, user, resident_id)
    elif role in ["NURSE", "DOCTOR"]:
        if user["id"] not in resident.get("staff_ids", []):
            raise APIError(403, "Hồ sơ chưa được phân công cho bạn.")
    elif clinical and role not in CLINICAL:
        raise APIError(403, "Không có quyền xem thông tin chăm sóc.")
    return resident


POLICY = {
    "residents": ["FAMILY"] + OPS + CLINICAL,
    "bookings": ["FAMILY"] + OPS,
    "packages": OPS,
    "rooms": OPS,
    "care": CLINICAL,
    "vitals": CLINICAL,
    "medications": ["DOCTOR", "MANAGER", "ADMIN"],
    "doses": CLINICAL,
    "meals": CLINICAL,
    "incidents": CLINICAL,
    "requests": ["FAMILY"] + OPS + CLINICAL,
    "visits": ["FAMILY"] + OPS,
    "activities": OPS + CLINICAL,
    "enrollments": ["FAMILY"] + OPS + CLINICAL,
    "shifts": ["MANAGER", "ADMIN"],
    "handoffs": CLINICAL,
    "reports": CLINICAL,
    "payments": FINANCE,
    "attachments": CLINICAL + OPS + ["FAMILY"],
}
for kind in ["residents", "bookings", "requests", "visits", "enrollments", "attachments"]:
    POLICY[kind] = list(dict.fromkeys(POLICY[kind] + ["SENIOR"]))
POLICY["activities"] += ["EXPERT"]
POLICY["enrollments"] += ["EXPERT"]
for kind in ["gardens", "products", "practice", "skills", "tour_bookings", "expert_applications"]:
    POLICY[kind] = LEARNERS + ["EXPERT"] + LEARNING_MANAGERS
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
    if role == "ADMIN":
        return True
    if kind in ["expert_applications", "tour_bookings"]:
        return role in LEARNING_MANAGERS or item["owner"] == user["id"]
    if role == "EXPERT" and kind not in ["residents", "activities", "enrollments"] + LEARNING_KINDS:
        return False
    if role == "EXPERT" and kind == "enrollments":
        if get_record(db, item["activity_id"], "activities").get("expert_id") != user["id"]:
            return False
    if kind in ["packages", "rooms", "activities"]:
        return True
    if kind == "shifts":
        return role in ["MANAGER", "NURSE", "DOCTOR", "RECEPTION"]
    if kind in ["bookings", "payments"] and role in FINANCE + OPS:
        return True
    if kind == "payments" and role in LEARNERS:
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
                and role in LEARNERS
                and item["owner"] != user["id"]
                and not item.get("shared")
            ):
                return False
            if role in LEARNERS and kind in ["handoffs", "incidents"]:
                return False
            if role in LEARNERS and kind == "reports":
                return item.get("shared", False)
            return True
        except APIError:
            return False
    return role in ["MANAGER"] or (item["owner"] == user["id"])


def case_service_priority(db, resident):
    return max((2 if b.get("health_tier") == "month" else 0 for b in rows(db, "bookings")
        if b.get("resident") == resident and b.get("status") in ["Đã xác nhận", "Đang lưu trú"]
        and b.get("end", "") >= date.today().isoformat()), default=0)


def project(user, kind, item, db=None):
    item = dict(item)
    item.pop("content", None)
    if kind == "requests" and db is not None:
        item["service_priority"] = case_service_priority(db, item.get("resident"))
    if kind == "residents" and user["role"] == "EXPERT":
        return {k: item[k] for k in ["id", "name", "owner", "resident", "created_at", "updated_at"]}
    if kind == "residents" and user["role"] == "RECEPTION":
        for key in ["health", "allergies", "diet", "medication_notes"]:
            item.pop(key, None)
    if (
        kind == "residents"
        and user["role"] in LEARNERS
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
    if kind in LEARNING_KINDS:
        return validate_learning(db, user, kind, body, old)
    if kind == "residents":
        body["name"] = text_field(body, "name", True, 120)
        birthday = iso_date(body.get("dob"))
        if birthday > date.today():
            raise APIError(400, "Ngày sinh phải ở quá khứ.")
        body["phone"] = text_field(body, "phone", False, 30)
        if body["phone"] and not re.fullmatch(r"[+\d ()-]{8,30}", body["phone"]):
            raise APIError(400, "Số điện thoại không hợp lệ.")
        if user["role"] not in ["MANAGER", "ADMIN"]:
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
            if not row or not row["active"] or row["role"] not in LEARNERS:
                raise APIError(400, "Thành viên gia đình không hợp lệ.")
        body["consent"] = body.get("consent") is True
        if user["role"] in ["NURSE", "DOCTOR", "RECEPTION"]:
            body["consent"] = old.get("consent", False) if old else False
    elif kind in ["packages", "rooms", "activities"]:
        body["name"] = text_field(body, "name", True, 150)
        body["active"] = body.get("active") is True
        if kind == "packages":
            body = validate_package(body)
        if kind in ["rooms", "activities"]:
            body["capacity"] = integer(body, "capacity", 1, 1000)
        if kind == "activities":
            iso_date(body.get("date"))
            if user["role"] == "EXPERT":
                if old and old.get("expert_id") != user["id"]:
                    raise APIError(403, "Bạn chỉ được sửa workshop do mình phụ trách.")
                body["expert_id"] = user["id"]
            expert_id = body.get("expert_id", "")
            if expert_id:
                expert = db.execute("SELECT role,active FROM users WHERE id=?", (expert_id,)).fetchone()
                if not expert or not expert["active"] or expert["role"] != "EXPERT":
                    raise APIError(400, "Cần chọn tài khoản chuyên gia đang hoạt động.")
            body["expert_id"] = expert_id
            body["topic"] = body.get("topic", "Nông nghiệp")
            body["format"] = body.get("format", "Workshop")
            body["fitness"] = body.get("fitness", "Nhẹ nhàng")
            if body["topic"] not in TOPICS or body["format"] not in ["Workshop", "Talkshow"] or body["fitness"] not in ["Nhẹ nhàng", "Vừa sức", "Cần hỗ trợ"]:
                raise APIError(400, "Thông tin chủ đề, hình thức hoặc mức vận động không hợp lệ.")
            body["time"] = text_field(body, "time", False, 50)
            body["description"] = text_field(body, "description", False, 3000)
            body["name_en"] = text_field(body, "name_en", False, 150)
            body["description_en"] = text_field(body, "description_en", False, 3000)
            body["location"] = text_field(body, "location", False, 200)
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
                "health_tier",
                "service_priority",
                "health_entitlements",
                "package_name_en",
            ]:
                if key in old:
                    body[key] = old[key]
                else:
                    body.pop(key, None)
            target = body.get("status", old["status"])
            if user["role"] in LEARNERS:
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
                package_name_en=package.get("name_en", package["name"]),
                health_tier=package.get("health_tier", "day"),
                service_priority=package_entitlements(package)["priority"],
                health_entitlements=package_entitlements(package),
                duration=duration,
                start=start.isoformat(),
                end=(start + timedelta(days=duration * package["days"])).isoformat(),
                total=package["price"] * duration,
                status="Chờ duyệt",
                code="WF-" + secrets.token_hex(5).upper(),
                room_id="",
            )
            body["health_entitlements"]["monitoring_days"] *= duration
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
        activity = get_record(db, old["activity_id"] if old else body.get("activity_id"), "activities")
        if user["role"] == "EXPERT" and activity.get("expert_id") != user["id"]:
            raise APIError(403, "Bạn chỉ quản lý đăng ký workshop do mình phụ trách.")
        if old:
            body["activity_id"] = old["activity_id"]
            if user["role"] in LEARNERS and (
                old["owner"] != user["id"] or body.get("status") != "Đã hủy"
            ):
                raise APIError(403, "Gia đình chỉ được hủy đăng ký của mình.")
            if body.get("status") not in [
                "Đã đăng ký",
                "Danh sách chờ",
                "Đã tham gia",
                "Vắng mặt",
                "Đã hủy",
            ]:
                raise APIError(400, "Trạng thái tham gia không hợp lệ.")
            if body.get("status") in ["Đã đăng ký", "Đã tham gia"] and old.get("status") in ["Danh sách chờ", "Vắng mặt"]:
                activity = get_record(db, old["activity_id"], "activities")
                occupied = sum(e["id"] != old["id"] and e["activity_id"] == activity["id"] and e.get("status") not in ["Đã hủy", "Danh sách chờ"] for e in rows(db, "enrollments"))
                if occupied >= activity["capacity"]:
                    raise APIError(409, "Workshop đã đủ chỗ. Chưa thể xác nhận học viên này.")
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
        occupied = sum(e.get("status") != "Danh sách chờ" for e in enrolled)
        if occupied >= activity["capacity"] and body.get("waitlist") is not True:
            raise APIError(409, "Workshop đã đủ chỗ. Bạn có thể đăng ký danh sách chờ.")
        body["status"] = "Danh sách chờ" if occupied >= activity["capacity"] else "Đã đăng ký"
        body.pop("waitlist", None)
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
        if kind == "requests":
            # Only confirmed, unexpired registrations grant case priority.
            body["service_priority"] = case_service_priority(db, body.get("resident"))
        if kind == "requests" and user["role"] in LEARNERS:
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
    if kind == "visits" and user["role"] in LEARNERS:
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
