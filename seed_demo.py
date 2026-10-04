"""Create explicitly fictional sample records in an empty local database."""

import secrets
from datetime import date, timedelta
import os

os.environ["WF_DEMO"] = "1"
import server


def main():
    if os.environ.get("WF_DATA_DIR"):
        raise SystemExit(
            "Demo seed refuses WF_DATA_DIR. Use the isolated data/demo directory."
        )
    server.init_db()
    password = secrets.token_urlsafe(15)
    with server.connect() as db:
        if db.execute("SELECT 1 FROM users").fetchone():
            raise SystemExit(
                "Database already has accounts. Demo seed refused to preserve existing data."
            )
        ids = {}
        for role, name in [
            ("ADMIN", "Demo quản trị"),
            ("MANAGER", "Demo quản lý"),
            ("NURSE", "Demo điều dưỡng"),
            ("DOCTOR", "Demo bác sĩ"),
            ("RECEPTION", "Demo lễ tân"),
            ("ACCOUNTANT", "Demo kế toán"),
            ("FAMILY", "Demo gia đình"),
        ]:
            record = server.uid()
            ids[role] = record
            db.execute(
                "INSERT INTO users VALUES(?,?,?,?,?,?,?,?)",
                (
                    record,
                    name,
                    role.lower() + "@demo.wellness.local",
                    "090000" + str(len(ids)).zfill(4),
                    server.password_hash(password),
                    role,
                    1,
                    server.now(),
                ),
            )

        def add(kind, body, resident=None, owner="MANAGER"):
            return server.insert(db, kind, ids[owner], resident, body)

        residents = []
        for name, dob, health, allergy in [
            (
                "Cư dân mẫu An",
                "1951-03-12",
                "Dữ liệu giả: theo dõi huyết áp",
                "Đậu phộng",
            ),
            (
                "Cư dân mẫu Bình",
                "1948-08-21",
                "Dữ liệu giả: cần hỗ trợ đi lại",
                "Chưa ghi nhận",
            ),
            (
                "Cư dân mẫu Chi",
                "1957-11-05",
                "Dữ liệu giả: nghỉ dưỡng ngắn hạn",
                "Hải sản",
            ),
        ]:
            residents.append(
                add(
                    "residents",
                    dict(
                        name=name,
                        dob=dob,
                        phone="0900123456",
                        emergency="Người thân mẫu · 0900123456",
                        health=health,
                        allergies=allergy,
                        diet="Ít muối, đủ rau xanh",
                        mobility="Cần hỗ trợ",
                        habits="Đọc sách, đi dạo buổi sáng",
                        consent=True,
                        staff_ids=[ids["NURSE"], ids["DOCTOR"]],
                        family_ids=[],
                    ),
                    owner="FAMILY",
                )
            )
        packages = server.rows(db, "packages")
        rooms = server.rows(db, "rooms")
        today = date.today()
        bookings = []
        for i, status in enumerate(["Đang lưu trú", "Đã xác nhận", "Chờ duyệt"]):
            p = next(p for p in packages if p["days"] == 7)
            start = today + timedelta(days=-1 if i == 0 else 2 + i)
            bookings.append(
                add(
                    "bookings",
                    dict(
                        package_id=p["id"],
                        package_name=p["name"],
                        duration=1,
                        start=start.isoformat(),
                        end=(start + timedelta(days=7)).isoformat(),
                        total=p["price"],
                        code="WF-DEMO-" + str(i + 1),
                        status=status,
                        room_id=rooms[i]["id"] if i < 2 else "",
                        assessment="Hồ sơ mẫu đã được tiếp nhận",
                        contract="HD-DEMO-" + str(i + 1),
                        notes="Chỉ là dữ liệu minh họa",
                    ),
                    residents[i],
                    owner="FAMILY",
                )
            )
        for i, r in enumerate(residents):
            add(
                "care",
                dict(
                    title=[
                        "Kiểm tra chỉ số buổi sáng",
                        "Hỗ trợ vận động nhẹ",
                        "Đánh giá tiếp nhận",
                    ][i],
                    due=today.isoformat(),
                    assignee="Demo điều dưỡng",
                    goal="Duy trì sinh hoạt an toàn",
                    status="Chờ xử lý" if i else "Đang xử lý",
                    notes="Dữ liệu minh họa",
                ),
                r,
            )
            add(
                "vitals",
                dict(
                    systolic=125 + i * 8,
                    diastolic=78,
                    pulse=72,
                    spo2=98,
                    alert=False,
                    recorded_by="Demo điều dưỡng",
                ),
                r,
            )
            add(
                "meals",
                dict(
                    title="Bữa trưa",
                    date=today.isoformat(),
                    menu="Cơm mềm, rau hấp và cá kho nhạt",
                    intake="Khoảng 75%",
                    notes="Kiểm tra dị ứng trước khi phục vụ",
                ),
                r,
            )
        med = add(
            "medications",
            dict(
                title="Thuốc minh họa — không sử dụng",
                dose="Theo đơn chuyên môn",
                schedule="08:00 sau ăn",
                instruction="Bản ghi giả phục vụ thử nghiệm",
                prescribed_by="Demo bác sĩ",
            ),
            residents[0],
        )
        add(
            "doses",
            dict(
                medication_id=med,
                time=today.isoformat() + "T08:00",
                status="Đã dùng",
                notes="Dữ liệu giả",
                recorded_by="Demo điều dưỡng",
            ),
            residents[0],
        )
        add(
            "reports",
            dict(
                title="Báo cáo chăm sóc tuần",
                period="Tuần minh họa",
                summary="Dữ liệu mẫu: sinh hoạt ổn định, tham gia vận động nhẹ và hoạt động vườn.",
                recommendation="Tiếp tục theo dõi theo kế hoạch chuyên môn.",
                shared=True,
            ),
            residents[0],
        )
        add(
            "requests",
            dict(
                title="Đặt lịch trao đổi với điều dưỡng",
                priority="Thông thường",
                status="Đang xử lý",
                notes="Gia đình muốn trao đổi về sinh hoạt tuần này.",
                response="Nhân viên đang sắp xếp lịch.",
                assignee="Demo điều dưỡng",
            ),
            residents[0],
            owner="FAMILY",
        )
        add(
            "visits",
            dict(
                visitor="Người thân mẫu",
                date=(today + timedelta(days=1)).isoformat(),
                time="09:00",
                phone="0900123456",
                status="Đã xác nhận",
                notes="Thăm tại khu sinh hoạt",
            ),
            residents[0],
            owner="FAMILY",
        )
        add(
            "incidents",
            dict(
                title="Yêu cầu kiểm tra tay vịn",
                priority="Cần theo dõi",
                status="Đang xử lý",
                notes="Tình huống giả để minh họa quy trình",
                response="Đã phân công kiểm tra",
                assignee="Demo quản lý",
            ),
            residents[1],
        )
        activity = add(
            "activities",
            dict(
                name="Một buổi sáng trong vườn",
                date=(today + timedelta(days=1)).isoformat(),
                time="07:30",
                location="Vườn rau sinh thái",
                capacity=12,
                assignee="Demo điều dưỡng",
                description="Trải nghiệm làm vườn nhẹ nhàng theo khả năng.",
                active=True,
            ),
        )
        add(
            "enrollments",
            dict(activity_id=activity, notes="Cần hỗ trợ di chuyển"),
            residents[0],
            owner="FAMILY",
        )
        add(
            "shifts",
            dict(
                date=today.isoformat(),
                shift="Sáng 06:00–14:00",
                staff="Demo điều dưỡng",
                facility="Bình Mỹ",
                notes="Theo dõi các hồ sơ được phân công",
            ),
        )
        add(
            "handoffs",
            dict(
                title="Bàn giao ca sáng",
                from_staff="Demo điều dưỡng",
                to_staff="Demo bác sĩ",
                condition="Dữ liệu giả: sinh hoạt ổn định",
                remaining="Theo dõi bữa ăn và lịch thăm",
                notes="Bản ghi thử nghiệm",
            ),
            residents[0],
        )
        for i, b in enumerate(bookings[:2]):
            add(
                "payments",
                dict(
                    booking_id=b,
                    type="Thu tiền",
                    amount=1600000,
                    reference="DEMO-TRANSFER-" + str(i + 1),
                    method="Chuyển khoản",
                    recorded_by="Demo kế toán",
                    notes="Giao dịch giả, không có tiền thật",
                ),
                residents[i],
                owner="FAMILY",
            )
    print("Fictional demo created. No real payments or clinical records.")
    print("Shared password for these LOCAL DEMO accounts only:", password)
    for role in ids:
        print(role + ": " + role.lower() + "@demo.wellness.local")


if __name__ == "__main__":
    main()
