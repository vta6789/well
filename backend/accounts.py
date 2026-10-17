"""Account activity summaries for administrators; never expose credentials."""
from .records import rows
from .security import APIError, require


def account_overview(db, actor, account_id):
    require(actor, ["ADMIN"])
    account = db.execute("SELECT * FROM users WHERE id=?", (account_id,)).fetchone()
    if not account:
        raise APIError(404, "Không tìm thấy tài khoản.")
    profiles = [r for r in rows(db, "residents")
                if r["owner"] == account_id or account_id in r.get("family_ids", [])]
    profile_names = {r["id"]: r["name"] for r in profiles}

    def related(kind):
        # The expert who records a learner's result is not its beneficiary.
        return [r for r in rows(db, kind)
                if r["resident"] in profile_names
                or (not r["resident"] and r["owner"] == account_id)
                or (kind == "bookings" and r["owner"] == account_id)]

    def selected(records, fields):
        return [{**{k: r[k] for k in ["id", "created_at", *fields] if k in r},
                 "learner": profile_names.get(r["resident"], "")}
                for r in records[:50]]

    bookings = related("bookings")
    skills = related("skills")
    practice = related("practice")
    products = related("products")
    enrollments = related("enrollments")
    posts = [r for r in rows(db, "forum_posts") if r["owner"] == account_id]
    activities = {r["id"]: r for r in rows(db, "activities")}
    events = selected(enrollments, ["activity_id", "status"])
    for event in events:
        activity = activities.get(event["activity_id"], {})
        event.update({key: activity.get(key, "") for key in ["name", "name_en", "date", "time", "format"]})
    hosted = [r for r in activities.values() if r.get("expert_id") == account_id]
    return {
        "account": {k: account[k] for k in ["id", "name", "email", "phone", "role", "active", "created_at"]},
        "profiles": [{"id": r["id"], "name": r["name"]} for r in profiles],
        "counts": {
            "bookings": sum(r.get("status") != "Đã hủy" for r in bookings),
            "posts": len(posts), "skills": sum(r.get("status") == "Đã học" and bool(r.get("verified_by")) for r in skills),
            "practice": len(practice), "products": len(products),
            "attended_events": len({r["activity_id"] for r in enrollments if r.get("status") == "Đã tham gia"}),
            "registered_events": len({r["activity_id"] for r in enrollments if r.get("status") not in ["Đã hủy", "Danh sách chờ"]}),
            "hosted_events": len(hosted),
        },
        "bookings": selected(bookings, ["package_name", "package_name_en", "start", "end", "status", "total"]),
        "posts": selected(posts, ["title", "content"]),
        "skills": selected(skills, ["title", "status", "verified_by", "notes"]),
        "practice": selected(practice, ["title", "date", "notes", "result"]),
        "products": selected(products, ["name", "name_en", "description", "quantity", "unit", "publication"]),
        "events": events,
        "hosted_events": selected(hosted, ["name", "name_en", "date", "time", "format"]),
        "recent_activity": [dict(r) for r in db.execute(
            "SELECT action,at FROM audit WHERE user_id=? ORDER BY at DESC LIMIT 20", (account_id,))],
    }
