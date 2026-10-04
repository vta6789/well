function metric(label, value, note) {
  return `<article class="card metric"><div class="eyebrow">${esc(label)}</div><strong>${esc(value)}</strong><span>${esc(note)}</span></article>`;
}
function dashboard() {
  const role = state.user.role,
    bookings = data("bookings"),
    residents = data("residents");
  const active = bookings.filter((b) => b.status === "Đang lưu trú");
  const paid = data("payments").reduce(
    (sum, p) => sum + p.amount * (p.type === "Hoàn tiền" ? -1 : 1),
    0,
  );
  const pending = bookings.filter((b) => b.status === "Chờ duyệt");
  const tasks = data("care").filter((t) => t.status !== "Hoàn tất");
  const alerts = data("vitals").filter((v) => v.alert);
  if (role === "ADMIN")
    return (
      header(
        "Quản trị hệ thống",
        "Quản lý tài khoản, quyền truy cập và dấu vết thao tác.",
      ) +
      `<div class="grid three">${metric("Tài khoản", state.users.length, "Tài khoản được cấp quyền")}${metric("Đang hoạt động", state.users.filter((u) => u.active).length, "Quản lý trạng thái truy cập")}${metric("Nhật ký", state.audit.length, "Tối đa 500 sự kiện gần nhất")}</div><div class="card section-title"><h2>Quyền kỹ thuật được tách riêng</h2><p class="muted">Tài khoản quản trị kỹ thuật quản lý quyền và tài khoản. Để thao tác lưu trú hoặc chăm sóc, tạo tài khoản với vai trò phù hợp.</p>${actionButton("Quản lý tài khoản", "page-users", "", "")}</div>`
    );
  const cards =
    role === "FAMILY"
      ? [
          metric("Người thân", residents.length, "Hồ sơ được liên kết với bạn"),
          metric("Đơn đăng ký", bookings.length, "Theo dõi hành trình lưu trú"),
          metric("Đang lưu trú", active.length, "Đã hoàn tất tiếp nhận"),
          metric("Báo cáo", data("reports").length, "Báo cáo được chia sẻ"),
        ]
      : [
          metric("Đang lưu trú", active.length, "Người đã check-in"),
          metric("Chờ tiếp nhận", pending.length, "Đơn cần xem xét"),
          metric(
            "Cần thực hiện",
            tasks.length,
            "Công việc chăm sóc chưa hoàn tất",
          ),
          metric("Thực thu ròng", money(paid), "Tiền thu trừ hoàn tiền"),
        ];
  return (
    header(
      role === "FAMILY"
        ? "Gia đình an tâm, mỗi ngày."
        : "Chào một ngày an yên.",
      `Xin chào ${state.user.name}. Đây là thông tin mới nhất tại Wellness Farm.`,
      can("bookings")
        ? actionButton("+ Đặt lịch lưu trú", "new", "bookings", "")
        : "",
    ) +
    `<section class="hero-panel"><div class="eyebrow">CHĂM SÓC BẰNG SỰ THẤU HIỂU</div><h2>${role === "FAMILY" ? "Luôn gần bên, dù ở xa." : "Mỗi người một hành trình.<br>Mỗi ngày một niềm vui."}</h2><p>${role === "FAMILY" ? "Theo dõi lịch lưu trú, những hoạt động và báo cáo chăm sóc của người thân trong cùng một nơi." : "Kết nối lịch lưu trú, kế hoạch chăm sóc và hoạt động hôm nay để không bỏ sót những điều cần quan tâm."}</p><span class="tag">❧ Wellness Farm · Bình Mỹ</span></section><div class="grid four">${cards.join("")}</div><div class="grid two section-title"><section class="card"><div class="row between"><h2>Lưu trú gần đây</h2><button class="small" data-page="bookings">Xem tất cả ↗</button></div>${
      bookings.length
        ? table(
            ["Người lưu trú", "Ngày đến", "Trạng thái"],
            bookings
              .slice(0, 5)
              .map((b) => [
                esc(residentName(b.resident)),
                day(b.start),
                tag(b.status),
              ]),
          )
        : empty("Chưa có lịch lưu trú")
    }</section><section class="card"><h2>${role === "FAMILY" ? "Báo cáo mới nhất" : "Công việc cần chú ý"}</h2>${
      role === "FAMILY"
        ? data("reports")
            .slice(0, 4)
            .map(
              (r) =>
                `<div class="timeline-item"><strong>${esc(r.title)}</strong><p>${esc(residentName(r.resident))} · ${day(r.created_at)}</p>${actionButton("Đọc báo cáo", "detail", r.id)}</div>`,
            )
            .join("") || empty("Chưa có báo cáo được chia sẻ")
        : tasks
            .slice(0, 4)
            .map(
              (t) =>
                `<div class="timeline-item"><strong>${esc(t.title)}</strong><p>${esc(residentName(t.resident))} · ${esc(t.due || "Chưa đặt hạn")}</p>${tag(t.status)}</div>`,
            )
            .join("") || empty("Chưa có công việc cần thực hiện")
    }</section></div>${alerts.length ? `<div class="notice warn">Có ${alerts.length} lần ghi nhận chỉ số vượt ngưỡng tham khảo trong lịch sử. Nhân viên cần xem xét từng bản ghi theo chuyên môn; trạng thái này không phải chẩn đoán.</div>` : ""}<div class="footer-note">Thông tin hiển thị theo vai trò và hồ sơ được cấp quyền.</div>`
  );
}
function table(headers, rows) {
  return `<div class="table-wrap"><table class="table"><thead><tr>${headers.map((h) => `<th scope="col">${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((cells) => `<tr>${cells.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}
function controls(kind, statuses = []) {
  return `<div class="toolbar"><input id="search" type="search" placeholder="Tìm kiếm trong ${esc(names[kind].toLowerCase())}…" aria-label="Tìm kiếm" value="${esc(state.query)}">${statuses.length ? `<select id="status-filter" aria-label="Lọc trạng thái"><option value="">Tất cả trạng thái</option>${statuses.map((s) => `<option ${state.filter === s ? "selected" : ""}>${esc(s)}</option>`).join("")}</select>` : ""}<button class="btn secondary" data-action="refresh">↻ Làm mới</button></div>`;
}
const descriptions = {
  residents: "Thông tin, nhu cầu hỗ trợ và người được phép theo dõi.",
  bookings: "Lịch lưu trú, tiếp nhận, phân phòng và kết thúc hành trình.",
  rooms: "Sức chứa, khả năng tiếp cận và số người đang lưu trú.",
  packages: "Gói dịch vụ và bảng giá dùng để tính phí tại máy chủ.",
  care: "Theo dõi công việc, mục tiêu và người phụ trách.",
  vitals: "Nhật ký chỉ số theo thời gian; cảnh báo dùng để hỗ trợ xem xét.",
  medications:
    "Chỉ định được nhập bởi bác sĩ hoặc người quản lý được cấp quyền.",
  doses: "Ghi nhận từng lần dùng thuốc và tình huống bỏ lỡ.",
  meals: "Chế độ ăn, dị ứng và ghi nhận bữa ăn.",
  incidents: "Tiếp nhận, xử lý và theo dõi sự cố chăm sóc.",
  requests: "Yêu cầu có trạng thái, ưu tiên và phản hồi.",
  visits: "Lịch thăm người thân và xác nhận của lễ tân.",
  activities: "Những hoạt động xanh, vận động và kết nối cộng đồng.",
  enrollments: "Đăng ký hoạt động theo sức chứa, theo dõi tham gia.",
  shifts: "Phân ca theo ngày, nhân viên và cơ sở.",
  handoffs: "Tình trạng, công việc còn lại và thông tin bàn giao.",
  reports: "Báo cáo chăm sóc; chủ động chọn chia sẻ cho gia đình.",
  payments: "Ghi nhận tiền đã đối soát, hoàn tiền và công nợ.",
};
function filtered(kind) {
  const q = state.query.toLocaleLowerCase("vi");
  return data(kind).filter(
    (x) =>
      (!q ||
        (JSON.stringify(x) + " " + residentName(x.resident))
          .toLocaleLowerCase("vi")
          .includes(q)) &&
      (!state.filter || x.status === state.filter),
  );
}
function recordButtons(kind, item) {
  const immutable = ["vitals", "payments", "doses", "enrollments"].includes(
    kind,
  );
  return `<div class="row">${actionButton("Chi tiết", "detail", item.id)}${can(kind) && !immutable ? actionButton(kind === "bookings" ? "Xử lý" : "Sửa", "edit", item.id) : ""}${kind === "bookings" && state.user.role === "FAMILY" && ["Chờ duyệt", "Đã xác nhận"].includes(item.status) ? actionButton("Hủy", "cancel-booking", item.id, "danger compact") : ""}</div>`;
}
function listPage(kind) {
  const records = filtered(kind);
  const statuses =
    kind === "bookings"
      ? [
          "Chờ duyệt",
          "Danh sách chờ",
          "Đã xác nhận",
          "Đang lưu trú",
          "Hoàn tất",
          "Đã hủy",
        ]
      : ["care", "requests", "incidents", "visits"].includes(kind)
        ? ["Chờ xử lý", "Đang xử lý", "Hoàn tất", "Đã xác nhận", "Đã hủy"]
        : [];
  const add = can(kind)
    ? actionButton(
        "+ " +
          (kind === "bookings"
            ? "Đặt lịch"
            : kind === "payments"
              ? "Ghi giao dịch"
              : "Tạo mới"),
        "new",
        kind,
        "",
      )
    : "";
  let content = "";
  if (kind === "residents")
    content = `<div class="grid three">${records.map((r) => `<article class="card"><div class="row between"><span class="avatar">${esc(r.name.slice(0, 2))}</span>${tag(r.consent ? "Đồng ý chia sẻ" : "Chưa chia sẻ")}</div><h2 class="section-title">${esc(r.name)}</h2><p class="muted small">Sinh ngày ${day(r.dob)} · ${esc(r.phone)}</p><p class="small">${esc(r.health || "Hồ sơ sức khỏe được bảo vệ theo quyền truy cập.")}</p><p class="small muted">Liên hệ khẩn cấp: ${esc(r.emergency || "Chưa nhập")}</p>${recordButtons(kind, r)}${actionButton("Hành trình chăm sóc", "resident-timeline", r.id)}</article>`).join("")}</div>`;
  else if (kind === "rooms")
    content = `<div class="grid three">${records
      .map((r) => {
        const occupied = data("bookings").filter(
          (b) => b.room_id === r.id && b.status === "Đang lưu trú",
        ).length;
        return `<article class="card"><div class="row between"><span class="eyebrow">${esc(r.facility)}</span>${tag(r.active ? "Đang hoạt động" : "Tạm ngừng")}</div><h2 class="section-title">${esc(r.name)}</h2><p class="small muted">${r.capacity} chỗ · ${r.accessible ? "Hỗ trợ di chuyển" : "Tiêu chuẩn"}</p><div class="room-plan">${Array.from({ length: Math.min(r.capacity, 12) }, (_, i) => `<span class="bed ${i < occupied ? "occupied" : ""}">⌂ ${i + 1}</span>`).join("")}</div><p class="small">Đang lưu trú: ${occupied}/${r.capacity}</p>${recordButtons(kind, r)}</article>`;
      })
      .join("")}</div>`;
  else if (kind === "packages")
    content = `<div class="grid three">${records.map((r, i) => `<article class="card package ${i === 1 ? "featured" : ""}">${tag(r.active ? "Nhận đăng ký" : "Tạm ngừng")}<h2 class="section-title">${esc(r.name)}</h2><p class="muted">${esc(r.description)}</p><div class="price">${money(r.price)}</div><p class="small muted">${r.days} ngày / đơn vị</p>${state.user.role === "FAMILY" ? actionButton("Đặt gói này", "book-package", r.id, "") : recordButtons(kind, r)}</article>`).join("")}</div>`;
  else if (kind === "activities")
    content = `<div class="grid three">${records
      .map((r) => {
        const count = data("enrollments").filter(
          (e) => e.activity_id === r.id,
        ).length;
        return `<article class="card"><span class="eyebrow">${day(r.date)} · ${esc(r.time)}</span><h2 class="section-title">${esc(r.name)}</h2><p class="muted small">${esc(r.description)}</p><p class="small">Địa điểm: ${esc(r.location)}<br>Đăng ký: ${count}/${r.capacity} · Phụ trách: ${esc(r.assignee || "Chưa phân công")}</p>${tag(r.active ? "Mở đăng ký" : "Đã đóng")}<div class="row section-title">${can("enrollments") && r.active ? actionButton("Đăng ký tham gia", "join-activity", r.id, "") : ""}${recordButtons(kind, r)}</div></article>`;
      })
      .join("")}</div>`;
  else {
    let headings = ["Người lưu trú", "Nội dung", "Trạng thái", "Thao tác"];
    let cells = records.map((r) => [
      esc(residentName(r.resident)),
      `<div class="wrap"><strong>${esc(r.title || r.name || "")}</strong><br><span class="muted">${esc(r.notes || r.description || "")}</span></div>`,
      tag(r.status || (r.shared ? "Đã chia sẻ" : "Đã ghi nhận")),
      recordButtons(kind, r),
    ]);
    if (kind === "bookings") {
      headings = [
        "Mã / Người lưu trú",
        "Gói & lịch",
        "Trạng thái",
        "Tổng phí",
        "Thao tác",
      ];
      cells = records.map((r) => [
        `<strong>${esc(r.code)}</strong><br><span class="muted">${esc(residentName(r.resident))}</span>`,
        `<strong>${esc(r.package_name)}</strong><br><span class="muted">${day(r.start)} → ${day(r.end)}</span><br><span class="small">${esc(lookup("rooms", r.room_id)?.name || "Chưa phân phòng")}</span>`,
        tag(r.status),
        money(r.total),
        recordButtons(kind, r),
      ]);
    }
    if (kind === "vitals") {
      headings = [
        "Người / Ngày ghi",
        "Huyết áp",
        "Mạch / SpO₂",
        "Theo dõi",
        "Thao tác",
      ];
      cells = records.map((r) => [
        `${esc(residentName(r.resident))}<br><span class="muted">${day(r.created_at)}</span>`,
        `${r.systolic}/${r.diastolic} mmHg`,
        `${r.pulse} bpm / ${r.spo2}%`,
        tag(r.alert ? "Cần theo dõi" : "Đã ghi nhận"),
        recordButtons(kind, r),
      ]);
    }
    if (kind === "medications") {
      headings = [
        "Người lưu trú",
        "Thuốc / Liều",
        "Lịch dùng",
        "Người chỉ định",
        "Thao tác",
      ];
      cells = records.map((r) => [
        esc(residentName(r.resident)),
        `<strong>${esc(r.title)}</strong><br>${esc(r.dose)}`,
        esc(r.schedule),
        esc(r.prescribed_by),
        `<div class="row">${recordButtons(kind, r)}${can("doses") ? actionButton("Ghi lần dùng", "record-dose", r.id, "") : ""}</div>`,
      ]);
    }
    if (kind === "doses") {
      headings = [
        "Người lưu trú",
        "Thuốc",
        "Thời điểm",
        "Trạng thái",
        "Thao tác",
      ];
      cells = records.map((r) => [
        esc(residentName(r.resident)),
        esc(
          lookup("medications", r.medication_id)?.title ||
            "Thuốc theo chỉ định",
        ),
        esc(r.time),
        tag(r.status),
        recordButtons(kind, r),
      ]);
    }
    if (kind === "care") {
      headings = [
        "Người lưu trú",
        "Công việc",
        "Hạn / Phụ trách",
        "Trạng thái",
        "Thao tác",
      ];
      cells = records.map((r) => [
        esc(residentName(r.resident)),
        `<div class="wrap"><strong>${esc(r.title)}</strong><br>${esc(r.notes)}</div>`,
        `${day(r.due)}<br>${esc(r.assignee)}`,
        tag(r.status),
        recordButtons(kind, r),
      ]);
    }
    if (kind === "meals") {
      headings = [
        "Người lưu trú",
        "Bữa / Ngày",
        "Thực đơn",
        "Ăn được",
        "Thao tác",
      ];
      cells = records.map((r) => [
        esc(residentName(r.resident)),
        `${esc(r.title)}<br>${day(r.date)}`,
        `<div class="wrap">${esc(r.menu)}<br><span class="muted">${esc(r.notes)}</span></div>`,
        esc(r.intake),
        recordButtons(kind, r),
      ]);
    }
    if (kind === "visits") {
      headings = [
        "Người lưu trú",
        "Người thăm",
        "Lịch",
        "Trạng thái",
        "Thao tác",
      ];
      cells = records.map((r) => [
        esc(residentName(r.resident)),
        esc(r.visitor),
        `${day(r.date)} · ${esc(r.time)}`,
        tag(r.status),
        recordButtons(kind, r),
      ]);
    }
    if (kind === "enrollments") {
      headings = [
        "Người lưu trú",
        "Hoạt động",
        "Tham gia",
        "Ngày đăng ký",
        "Thao tác",
      ];
      cells = records.map((r) => [
        esc(residentName(r.resident)),
        esc(lookup("activities", r.activity_id)?.name),
        tag(r.status || "Đã đăng ký"),
        day(r.created_at),
        `<div class="row">${actionButton("Chi tiết", "detail", r.id)}${can(kind) && r.status !== "Đã hủy" ? actionButton("Cập nhật tham gia", "edit", r.id) : ""}</div>`,
      ]);
    }
    if (kind === "shifts") {
      headings = ["Ngày / Ca", "Nhân viên", "Cơ sở", "Ghi chú", "Thao tác"];
      cells = records.map((r) => [
        `${day(r.date)} · ${esc(r.shift)}`,
        esc(r.staff),
        esc(r.facility),
        `<div class="wrap">${esc(r.notes)}</div>`,
        recordButtons(kind, r),
      ]);
    }
    if (kind === "payments") {
      headings = ["Mã đơn", "Loại", "Số tiền", "Mã đối soát", "Thao tác"];
      cells = records.map((r) => [
        esc(lookup("bookings", r.booking_id)?.code),
        tag(r.type),
        money(r.amount),
        `${esc(r.reference)}<br><span class="muted">${day(r.created_at)}</span>`,
        recordButtons(kind, r),
      ]);
    }
    if (["requests", "incidents"].includes(kind)) {
      headings = [
        "Người lưu trú",
        "Nội dung / Phản hồi",
        "Ưu tiên",
        "Trạng thái",
        "Thao tác",
      ];
      cells = records.map((r) => [
        esc(residentName(r.resident)),
        `<div class="wrap"><strong>${esc(r.title)}</strong><br>${esc(r.notes)}<br><span class="muted">${esc(r.response || "Chưa phản hồi")}</span></div>`,
        tag(r.priority),
        tag(r.status),
        recordButtons(kind, r),
      ]);
    }
    if (kind === "reports") {
      headings = [
        "Người lưu trú",
        "Báo cáo",
        "Chia sẻ",
        "Ngày tạo",
        "Thao tác",
      ];
      cells = records.map((r) => [
        esc(residentName(r.resident)),
        esc(r.title),
        tag(r.shared ? "Đã chia sẻ" : "Nội bộ"),
        day(r.created_at),
        recordButtons(kind, r),
      ]);
    }
    if (kind === "attachments") {
      headings = [
        "Người lưu trú",
        "Tài liệu",
        "Dung lượng",
        "Chia sẻ",
        "Thao tác",
      ];
      cells = records.map((r) => [
        esc(residentName(r.resident)),
        `${esc(r.title)}<br><span class="muted">${esc(r.filename)}</span>`,
        Math.round(r.size / 1024) + " KB",
        tag(r.shared ? "Đã chia sẻ" : "Nội bộ"),
        `<a class="btn secondary compact" href="/api/attachments/${r.id}/download" download>↓ Tải tệp</a>`,
      ]);
    }
    content = `<div class="card">${table(headings, cells)}</div>`;
  }
  const notice =
    kind === "payments"
      ? '<div class="notice warn section-title">Giao dịch được nhập sau khi nhân viên đối soát ngân hàng. Chưa kết nối cổng thanh toán hoặc webhook tự động.</div>'
      : kind === "vitals"
        ? '<div class="notice section-title">Ngưỡng tham khảo: huyết áp tâm thu ≥180 hoặc &lt;90, SpO₂ &lt;94%. Cần đánh giá bởi nhân viên chuyên môn; tính năng này không thay thế theo dõi y tế trực tiếp.</div>'
        : kind === "incidents"
          ? '<div class="notice warn section-title">Trong tình huống khẩn cấp, gọi trực tiếp nhân viên trực hoặc cấp cứu. Chưa kết nối hệ thống báo động bên ngoài.</div>'
          : "";
  return (
    header(names[kind], descriptions[kind], add) +
    controls(kind, statuses) +
    notice +
    (records.length
      ? content
      : `<div class="card">${empty("Chưa có bản ghi phù hợp", can(kind) ? "Chọn “Tạo mới” để bắt đầu." : "Thông tin sẽ xuất hiện khi được ghi nhận hoặc cấp quyền.")}</div>`)
  );
}
function calendarPage() {
  const first = new Date(state.year, state.month, 1),
    days = new Date(state.year, state.month + 1, 0).getDate(),
    offset = (first.getDay() + 6) % 7;
  const events = [];
  for (const b of data("bookings").filter((b) => b.status !== "Đã hủy")) {
    events.push({
      date: b.start,
      label: "Nhận: " + residentName(b.resident),
      id: b.id,
    });
    events.push({
      date: b.end,
      label: "Trả: " + residentName(b.resident),
      id: b.id,
    });
  }
  for (const v of data("visits").filter((v) => v.status !== "Đã hủy"))
    events.push({ date: v.date, label: "Thăm: " + v.visitor, id: v.id });
  for (const a of data("activities").filter((a) => a.active))
    events.push({ date: a.date, label: a.name, id: a.id });
  for (const t of data("care").filter((t) => t.status !== "Hoàn tất"))
    events.push({ date: t.due, label: "Chăm sóc: " + t.title, id: t.id });
  return (
    header(
      "Lịch tổng hợp",
      "Ngày đến, ngày về, lịch thăm, hoạt động và công việc chăm sóc.",
    ) +
    `<section class="card"><div class="row between section-title"><h2>Tháng ${state.month + 1}, ${state.year}</h2><div class="row">${actionButton("←", "prev-month")}${actionButton("Hôm nay", "current-month")}${actionButton("→", "next-month")}</div></div><div class="calendar-grid">${["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((x) => `<div class="calendar-day">${x}</div>`).join("")}${Array.from({ length: offset }, () => "<div></div>").join("")}${Array.from(
      { length: days },
      (_, i) => {
        const dt = `${state.year}-${String(state.month + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
        return `<div class="calendar-cell ${dt === today() ? "today" : ""}"><strong>${i + 1}</strong>${events
          .filter((e) => e.date === dt)
          .map(
            (e) =>
              `<button class="calendar-event" data-action="detail" data-id="${e.id}">${esc(e.label)}</button>`,
          )
          .join("")}</div>`;
      },
    ).join("")}</div></section>`
  );
}
function analytics() {
  const bookings = data("bookings"),
    payments = data("payments"),
    valid = bookings.filter((b) => b.status !== "Đã hủy");
  const net = payments.reduce(
      (sum, p) => sum + p.amount * (p.type === "Hoàn tiền" ? -1 : 1),
      0,
    ),
    expected = valid.reduce((sum, b) => sum + b.total, 0);
  const outstanding = valid.reduce(
    (sum, b) => sum + Math.max(0, b.total - paidFor(b.id)),
    0,
  );
  const capacity = data("rooms")
      .filter((r) => r.active)
      .reduce((sum, r) => sum + r.capacity, 0),
    occupied = bookings.filter((b) => b.status === "Đang lưu trú").length;
  return (
    header(
      "Báo cáo vận hành",
      "Số liệu từ đơn đăng ký và giao dịch đã được ghi nhận.",
      ["MANAGER", "ACCOUNTANT"].includes(state.user.role)
        ? '<a class="btn secondary" href="/api/export" download>↓ Xuất CSV tài chính</a>'
        : "",
    ) +
    `<div class="grid four">${metric("Giá trị đơn", money(expected), "Tổng đơn chưa hủy")}${metric("Thực thu ròng", money(net), "Thu tiền trừ hoàn tiền")}${metric("Công nợ", money(outstanding), "Phần chưa thu của đơn chưa hủy")}${metric("Công suất hiện tại", capacity ? Math.round((occupied / capacity) * 100) + "%" : "—", `${occupied}/${capacity} chỗ đang lưu trú`)}</div><div class="grid two section-title"><article class="card"><h2>Trạng thái lưu trú</h2><div class="bar-chart">${[
      "Chờ duyệt",
      "Đã xác nhận",
      "Đang lưu trú",
      "Hoàn tất",
      "Đã hủy",
    ]
      .map((s) => {
        const n = bookings.filter((b) => b.status === s).length;
        return `<div class="bar-row"><span>${s}</span><div class="bar-track"><div class="bar-fill" data-width="${bookings.length ? (n / bookings.length) * 100 : 0}"></div></div><strong>${n}</strong></div>`;
      })
      .join(
        "",
      )}</div></article><article class="card"><h2>Chất lượng vận hành</h2><dl class="detail"><div><dt>Tỷ lệ hủy</dt><dd>${bookings.length ? Math.round((bookings.filter((b) => b.status === "Đã hủy").length / bookings.length) * 100) : 0}%</dd></div><div><dt>Yêu cầu chưa hoàn tất</dt><dd>${data("requests").filter((r) => r.status !== "Hoàn tất").length}</dd></div><div><dt>Công việc quá hạn</dt><dd>${data("care").filter((r) => r.due && r.due < today() && r.status !== "Hoàn tất").length}</dd></div><div><dt>Sự cố chưa hoàn tất</dt><dd>${data("incidents").filter((r) => r.status !== "Hoàn tất").length}</dd></div></dl></article></div><article class="card"><h2>Công nợ theo đơn</h2>${table(
      ["Mã đơn", "Gói", "Tổng phí", "Đã thu ròng", "Còn nợ"],
      valid.map((b) => [
        esc(b.code),
        esc(b.package_name),
        money(b.total),
        money(paidFor(b.id)),
        money(Math.max(0, b.total - paidFor(b.id))),
      ]),
    )}</article>`
  );
}
function paidFor(id) {
  return data("payments")
    .filter((p) => p.booking_id === id)
    .reduce((sum, p) => sum + p.amount * (p.type === "Hoàn tiền" ? -1 : 1), 0);
}
function userPage() {
  return (
    header(
      "Tài khoản & quyền",
      "Tạo tài khoản nhân viên, cấp vai trò hoặc thu hồi quyền truy cập.",
      state.user.role === "ADMIN"
        ? actionButton("+ Tạo tài khoản", "new-user", "", "")
        : "",
    ) +
    `<div class="notice section-title">Nhân viên chăm sóc còn cần được quản lý phân công vào từng hồ sơ. Thay đổi quyền hoặc khóa tài khoản sẽ thu hồi các phiên đang đăng nhập.</div><div class="card">${table(
      ["Họ tên", "Liên hệ", "Vai trò", "Trạng thái", "Thao tác"],
      state.users.map((u) => [
        esc(u.name),
        `${esc(u.email)}<br>${esc(u.phone)}`,
        esc(roleNames[u.role]),
        tag(u.active ? "Hoạt động" : "Đã khóa"),
        state.user.role === "ADMIN" && u.id !== state.user.id
          ? actionButton("Cấp quyền / khóa", "edit-user", u.id)
          : "—",
      ]),
    )}</div>`
  );
}
function auditPage() {
  return (
    header(
      "Nhật ký hệ thống",
      "500 sự kiện gần nhất; không ghi mật khẩu hoặc nội dung sức khỏe.",
    ) +
    `<div class="card">${table(
      ["Thời gian", "Người thao tác", "Hành động", "Module", "Mã bản ghi"],
      state.audit.map((a) => [
        esc(new Date(a.at).toLocaleString("vi-VN")),
        esc(a.user_name),
        esc(a.action),
        esc(names[a.kind] || a.kind),
        esc(a.record_id),
      ]),
    )}</div>`
  );
}
function settings() {
  return (
    header("Cài đặt & bảo mật", "Thông tin tài khoản và trạng thái dịch vụ.") +
    `<div class="grid two"><article class="card"><h2>Tài khoản của bạn</h2><dl class="detail"><div><dt>Họ tên</dt><dd>${esc(state.user.name)}</dd></div><div><dt>Vai trò</dt><dd>${esc(roleNames[state.user.role])}</dd></div><div><dt>Email</dt><dd>${esc(state.user.email)}</dd></div><div><dt>Điện thoại</dt><dd>${esc(state.user.phone)}</dd></div></dl>${actionButton("Đổi mật khẩu", "password", "", "")}<p class="small muted section-title">Đổi mật khẩu sẽ đăng xuất tất cả phiên của tài khoản.</p></article><article class="card"><h2>Tích hợp dịch vụ</h2>${table(
      ["Dịch vụ", "Trạng thái"],
      [
        ["Thanh toán tự động", tag("Chưa kết nối")],
        ["Email / Zalo", tag("Chưa kết nối")],
        ["Thiết bị y tế", tag("Chưa kết nối")],
        ["MFA / xác minh email", tag("Chưa kết nối")],
        ["Cơ sở dữ liệu", tag("SQLite cục bộ")],
      ],
    )}<p class="small muted section-title">Xem README để cấu hình sao lưu và các yêu cầu trước khi vận hành công khai.</p></article><article class="card"><h2>Quyền riêng tư</h2><p class="small muted">Chủ hồ sơ có thể bật hoặc thu hồi sự đồng ý chia sẻ trong hồ sơ người lưu trú. Báo cáo chỉ xuất hiện cho gia đình khi nhân viên chọn chia sẻ và hồ sơ cho phép.</p>${actionButton("Xem hồ sơ", "page-residents")}</article><article class="card"><h2>Trải nghiệm đọc</h2><p class="small muted">Thay đổi cỡ chữ để dễ theo dõi. Giao diện hỗ trợ màn hình nhỏ và điều hướng bằng bàn phím.</p>${actionButton("Đổi cỡ chữ Aᴀ", "font")}</article></div>`
  );
}
function renderPage() {
  const main = $("#main");
  if (!main) return;
  if (state.page === "dashboard") main.innerHTML = dashboard();
  else if (state.page === "calendar") main.innerHTML = calendarPage();
  else if (state.page === "analytics") main.innerHTML = analytics();
  else if (state.page === "users") main.innerHTML = userPage();
  else if (state.page === "audit") main.innerHTML = auditPage();
  else if (state.page === "settings") main.innerHTML = settings();
  else if (state.page === "notifications") main.innerHTML = notificationsPage();
  else main.innerHTML = listPage(state.page);
  syncFontButtons();
  $$("[data-width]", main).forEach(
    (el) => (el.style.width = el.dataset.width + "%"),
  );
  if (state.page === "settings") {
    const first = $(".grid .card", main);
    first.insertAdjacentHTML(
      "beforeend",
      `<div class="row section-title">${tag(state.user.mfa ? "MFA đã bật" : "MFA chưa bật")}${!state.user.mfa ? actionButton("Bật xác thực hai bước", "mfa", "", "secondary") : ""}</div>`,
    );
    const mfaRow = $$("tr", main).find((r) =>
      r.textContent.includes("MFA / xác minh email"),
    );
    if (mfaRow)
      mfaRow.innerHTML = `<td>MFA TOTP</td><td>${tag(state.user.mfa ? "Đã bật" : "Sẵn sàng thiết lập")}</td>`;
  }
}
function notificationsPage() {
  const items = [
    ...data("reports").map((r) => ({
      id: r.id,
      title: "Báo cáo · " + r.title,
      at: r.created_at,
      desc: residentName(r.resident),
    })),
    ...data("requests")
      .filter((r) => r.response || r.status !== "Hoàn tất")
      .map((r) => ({
        id: r.id,
        title: "Yêu cầu · " + r.title,
        at: r.updated_at,
        desc: r.response || r.status,
      })),
    ...data("care")
      .filter((r) => r.status !== "Hoàn tất")
      .map((r) => ({
        id: r.id,
        title: "Nhắc việc · " + r.title,
        at: r.updated_at,
        desc: residentName(r.resident) + " · Hạn " + day(r.due),
      })),
    ...data("bookings").map((r) => ({
      id: r.id,
      title: "Lưu trú · " + r.code,
      at: r.updated_at,
      desc: r.status + " · " + day(r.start),
    })),
    ...data("incidents")
      .filter((r) => r.status !== "Hoàn tất")
      .map((r) => ({
        id: r.id,
        title: "Sự cố · " + r.title,
        at: r.updated_at,
        desc: r.priority + " · " + r.status,
      })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  return (
    header(
      "Thông báo & nhắc việc",
      "Cập nhật và công việc từ các hồ sơ bạn được phép theo dõi.",
      actionButton("↻ Cập nhật", "refresh"),
    ) +
    `<div class="card">${items.length ? `<div class="timeline">${items.map((i) => `<div class="timeline-item"><strong>${esc(i.title)}</strong><p>${esc(i.desc)} · ${day(i.at)}</p>${actionButton("Xem chi tiết", "detail", i.id)}</div>`).join("")}</div>` : empty("Chưa có cập nhật")}</div>`
  );
}
