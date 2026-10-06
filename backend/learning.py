"""Learning, craft portfolios and visitor experiences on the existing record store."""
from datetime import date
from .records import rows, get_record
from .security import APIError, text_field, integer, iso_date

LEARNERS = ["FAMILY", "SENIOR"]
LEARNING_MANAGERS = ["ADMIN", "MANAGER"]
LEARNING_KINDS = ["gardens", "skills", "practice", "products", "tour_bookings", "expert_applications"]
TOPICS = ["Nông nghiệp", "Sức khỏe", "Số hóa", "Thủ công"]


def expert_access(db, user, resident_id):
    if user["role"] != "EXPERT":
        return
    assigned = {r["id"] for r in rows(db, "activities") if r.get("expert_id") == user["id"]}
    if not any(e["activity_id"] in assigned and e["resident"] == resident_id
               and e.get("status") != "Đã hủy" for e in rows(db, "enrollments")):
        raise APIError(403, "Học viên chưa tham gia workshop do bạn phụ trách.")


def validate_learning(db, user, kind, body, old=None):
    role = user["role"]
    manager = role in LEARNING_MANAGERS
    if kind == "expert_applications":
        body = {k: text_field(body, k, True, 3000) for k in ["specialty", "bio"]} | {
            "status": body.get("status", "Chờ duyệt"),
            "response": text_field(body, "response", False, 3000),
        }
        if not old and any(r["owner"] == user["id"] and r.get("status") in ["Chờ duyệt", "Đã duyệt"] for r in rows(db, kind)):
            raise APIError(409, "Bạn đã gửi hồ sơ chuyên gia. Vui lòng chờ quản trị viên xử lý.")
        if not manager:
            if old and old["owner"] != user["id"]:
                raise APIError(403, "Không có quyền sửa hồ sơ này.")
            body["status"] = old.get("status", "Chờ duyệt") if old else "Chờ duyệt"
            body["response"] = old.get("response", "") if old else ""
        if body["status"] not in ["Chờ duyệt", "Đã duyệt", "Từ chối"]:
            raise APIError(400, "Trạng thái hồ sơ chuyên gia không hợp lệ.")
        if manager and old and body["status"] == "Đã duyệt" and old.get("status") != "Đã duyệt":
            applicant = db.execute("SELECT role,active FROM users WHERE id=?", (old["owner"],)).fetchone()
            if not applicant or not applicant["active"] or applicant["role"] not in LEARNERS + ["EXPERT"]:
                raise APIError(400, "Tài khoản này không phù hợp để chuyển sang chuyên gia.")
            db.execute("UPDATE users SET role='EXPERT' WHERE id=?", (old["owner"],))
            db.execute("DELETE FROM sessions WHERE user_id=?", (old["owner"],))
        return body
    if kind == "tour_bookings":
        artisan = get_record(db, body.get("artisan_id"), "gardens")
        if not artisan.get("public_consent") or artisan.get("publication") != "Đã duyệt":
            raise APIError(400, "Vườn này chưa mở tham quan công khai.")
        visit_date = iso_date(body.get("date"))
        if visit_date < date.today() and not old:
            raise APIError(400, "Ngày tham quan phải từ hôm nay trở đi.")
        body = {"artisan_id": artisan["id"], "date": visit_date.isoformat(),
                "guests": integer(body, "guests", 1, 50), "contact": text_field(body, "contact", True, 120),
                "notes": text_field(body, "notes", False, 3000),
                "status": body.get("status", "Chờ duyệt"), "response": text_field(body, "response", False, 3000)}
        if not manager:
            body["status"] = old.get("status", "Chờ duyệt") if old else "Chờ duyệt"
            body["response"] = old.get("response", "") if old else ""
        if body["status"] not in ["Chờ duyệt", "Đã xác nhận", "Đã tham quan", "Đã hủy"]:
            raise APIError(400, "Trạng thái tham quan không hợp lệ.")
        return body
    resident_id = old["resident"] if old else body.get("resident")
    if kind == "gardens":
        if not old and any(r["resident"] == resident_id for r in rows(db, kind)):
            raise APIError(409, "Học viên đã có hồ sơ vườn riêng.")
        body = {"name": text_field(body, "name", True, 150), "story": text_field(body, "story", False, 3000),
                "story_en": text_field(body, "story_en", False, 3000), "focus_en": text_field(body, "focus_en", False, 200),
                "focus": text_field(body, "focus", True, 200), "location": text_field(body, "location", False, 200),
                "public_consent": body.get("public_consent") is True,
                "publication": body.get("publication", "Chờ duyệt")}
        if not manager:
            body["publication"] = "Chờ duyệt" if not old or any(body[k] != old.get(k, "") for k in ["name", "story", "focus", "location", "story_en", "focus_en"]) else old.get("publication", "Chờ duyệt")
        if body["publication"] not in ["Chờ duyệt", "Đã duyệt", "Ẩn"]:
            raise APIError(400, "Trạng thái công khai không hợp lệ.")
    elif kind == "skills":
        activity = get_record(db, body.get("activity_id"), "activities")
        if role == "EXPERT" and activity.get("expert_id") != user["id"]:
            raise APIError(403, "Bạn chỉ xác nhận kỹ năng từ workshop của mình.")
        if not any(e["activity_id"] == activity["id"] and e["resident"] == resident_id and e.get("status") not in ["Đã hủy", "Danh sách chờ"] for e in rows(db, "enrollments")):
            raise APIError(400, "Học viên cần đăng ký workshop trước khi ghi nhận kỹ năng.")
        body = {"title": text_field(body, "title", True, 200), "activity_id": activity["id"],
                "notes": text_field(body, "notes", False, 3000), "status": body.get("status", "Chờ xác nhận")}
        if role in LEARNERS:
            body["status"] = "Chờ xác nhận"
        if body["status"] not in ["Chờ xác nhận", "Đã học"]:
            raise APIError(400, "Trạng thái kỹ năng không hợp lệ.")
        body["verified_by"] = user["name"] if body["status"] == "Đã học" else ""
    elif kind == "practice":
        body = {"title": text_field(body, "title", True, 200), "date": iso_date(body.get("date")).isoformat(),
                "notes": text_field(body, "notes", True, 5000), "result": text_field(body, "result", False, 3000)}
    elif kind == "products":
        body = {"name": text_field(body, "name", True, 150), "description": text_field(body, "description", True, 3000),
                "name_en": text_field(body, "name_en", False, 150), "description_en": text_field(body, "description_en", False, 3000),
                "quantity": integer(body, "quantity", 1, 100000), "unit": text_field(body, "unit", True, 50),
                "public_consent": body.get("public_consent") is True, "publication": body.get("publication", "Chờ duyệt")}
        if not manager:
            body["publication"] = "Chờ duyệt" if not old or any(body[k] != old.get(k, "") for k in ["name", "description", "quantity", "unit", "name_en", "description_en"]) else old.get("publication", "Chờ duyệt")
        if body["publication"] not in ["Chờ duyệt", "Đã duyệt", "Ẩn"]:
            raise APIError(400, "Trạng thái công khai không hợp lệ.")
    if kind in ["gardens", "products"] and role == "EXPERT":
        body["public_consent"] = old.get("public_consent", False) if old else False
    return body


def public_learning(db):
    gardens = [g for g in rows(db, "gardens") if g.get("public_consent") and g.get("publication") == "Đã duyệt"]
    garden_by_resident = {g["resident"]: g for g in gardens}
    products = [{"id": p["id"], "name": p["name"], "description": p["description"], "quantity": p["quantity"],
                 "name_en": p.get("name_en", ""), "description_en": p.get("description_en", ""),
                 "unit": p["unit"], "artisan_id": garden_by_resident[p["resident"]]["id"]}
                for p in rows(db, "products") if p["resident"] in garden_by_resident and p.get("public_consent") and p.get("publication") == "Đã duyệt"]
    skills = rows(db, "skills")
    artisans = [{"id": g["id"], "name": g["name"], "story": g.get("story", ""), "focus": g["focus"],
                 "location": g.get("location", ""), "focus_en": g.get("focus_en", ""), "story_en": g.get("story_en", ""),
                 "skills_count": sum(s["resident"] == g["resident"] and s.get("status") == "Đã học" for s in skills),
                 "products": [p for p in products if p["artisan_id"] == g["id"]]} for g in gardens]
    enrollment = rows(db, "enrollments")
    users = {r["id"]: r for r in db.execute("SELECT id,name,role,active FROM users")}
    workshops = []
    for activity in rows(db, "activities"):
        if not activity.get("active") or activity.get("date", "") < date.today().isoformat():
            continue
        expert = users.get(activity.get("expert_id"))
        count = sum(e["activity_id"] == activity["id"] and e.get("status") not in ["Đã hủy", "Danh sách chờ"] for e in enrollment)
        workshops.append({k: activity.get(k, "") for k in ["id", "name", "name_en", "description", "description_en", "date", "time", "location", "topic", "format", "fitness", "capacity"]} | {
            "remaining": max(0, activity["capacity"] - count), "expert_name": expert["name"] if expert and expert["active"] else activity.get("assignee", "Chưa phân công")})
    today = date.today().isoformat()
    completed_tours = [t for t in rows(db, "tour_bookings") if t.get("status") == "Đã tham quan"]
    impact = {"workshops_month": sum(a.get("date", "").startswith(today[:7]) for a in rows(db, "activities")),
              "learners": len({e["resident"] for e in enrollment if e.get("status") in ["Đã đăng ký", "Đã tham gia"]}),
              "products": len(rows(db, "products")), "visitors": sum(t["guests"] for t in completed_tours)}
    return {"workshops": sorted(workshops, key=lambda a: (a["date"], a.get("time", ""))), "artisans": artisans,
            "products": products, "impact": impact,
            "experts": [{"id": u["id"], "name": u["name"]} for u in users.values() if u["role"] == "EXPERT" and u["active"]]}
