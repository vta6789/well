"""Versioned visitor packages and immutable booking entitlements."""
from .records import rows, update
from .security import APIError, integer, text_field

TIERS = {
    "day": {"name": "Gói Ngày", "name_en": "Day Package", "days": 1, "price": 450000, "priority": 0,
            "description": "Sàng lọc cơ bản huyết áp, nhịp tim; đồ ăn và nước uống.",
            "description_en": "Basic blood pressure and heart rate screening; food and drinks.",
            "monitoring_per_day": 0, "nutrition": "none", "expert_checkups": False},
    "week": {"name": "Gói Tuần", "name_en": "Week Package", "days": 7, "price": 2000000, "priority": 1,
             "description": "Sàng lọc cơ bản, theo dõi chỉ số 2 lần/ngày trong 7 ngày, tư vấn dinh dưỡng và ưu tiên đặt lịch.",
             "description_en": "Basic screening, health monitoring twice a day for seven days, nutrition advice and priority booking.",
             "monitoring_per_day": 2, "nutrition": "consultation", "expert_checkups": False},
    "month": {"name": "Gói Tháng", "name_en": "Month Package", "days": 30, "price": 9000000, "priority": 2,
              "description": "Sàng lọc cơ bản, chuyên gia khám định kỳ, tư vấn dinh dưỡng mỗi tuần và ưu tiên cao nhất khi đặt lịch, xử lý hồ sơ.",
              "description_en": "Basic screening, regular expert check-ups, weekly nutrition advice and highest priority for bookings and case processing.",
              "monitoring_per_day": 0, "nutrition": "weekly", "expert_checkups": True},
}


def package_entitlements(package):
    tier = package.get("health_tier", "day")
    plan = TIERS[tier]
    return {"tier": tier, "priority": plan["priority"], "basic_screening": True,
            "food_and_drinks": True, "all_activities": True, "workshops": True, "talkshows": True,
            "monitoring_per_day": plan["monitoring_per_day"], "monitoring_days": 7 if tier == "week" else 0,
            "nutrition": plan["nutrition"], "expert_checkups": plan["expert_checkups"]}


def validate_package(body):
    tier = body.get("health_tier") or {1: "day", 7: "week", 30: "month"}.get(body.get("days"))
    if tier not in TIERS:
        raise APIError(400, "Cần chọn gói Ngày, Tuần hoặc Tháng.")
    plan = TIERS[tier]
    return dict(body, health_tier=tier, days=plan["days"], price=integer(body, "price", 1, 1000000000),
                name_en=text_field(body, "name_en", False, 150) or plan["name_en"],
                description_en=text_field(body, "description_en", False, 3000), catalog_version=3)


def migrate_packages(db):
    old_names = {"Gói theo ngày": "day", "Trải nghiệm": "day", "Gói Ngày": "day",
                 "Gói theo tuần": "week", "Học nghề": "week", "Gói Tuần": "week",
                 "Gói theo tháng": "month", "Nghệ nhân bạc": "month", "Gói Tháng": "month"}
    for package in rows(db, "packages"):
        tier = old_names.get(package["name"])
        if not tier or package.get("catalog_version", 0) >= 3:
            continue
        plan = TIERS[tier]
        package.update({k: plan[k] for k in ["name", "name_en", "days", "price", "description", "description_en"]})
        package.update(health_tier=tier, catalog_version=3)
        update(db, package["id"], package)
