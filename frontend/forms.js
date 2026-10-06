const F = (key, label, type = "text", options = {}) => ({
  key,
  label,
  type,
  ...options,
});
const statusOptions = ["Chờ xử lý", "Đang xử lý", "Hoàn tất"];
function schema(kind, old = {}, preset = {}) {
  if (learningKinds.includes(kind)) return learningSchema(kind, old);
  const resident = F("resident", "Người lưu trú", "select", {
    options: data("residents").map((r) => [r.id, r.name]),
    required: true,
  });
  const notes = F("notes", "Ghi chú", "textarea", { wide: true });
  const staff = F("assignee", "Người phụ trách");
  const status = F("status", "Trạng thái", "select", {
    options: statusOptions,
  });
  const title = F("title", "Tiêu đề", "text", { required: true });
  const fields = {
    residents: [
      F("name", "Họ tên", "text", { required: true }),
      F("dob", "Ngày sinh", "date", { required: true, max: today() }),
      F("phone", "Số điện thoại liên hệ", "tel"),
      F("emergency", "Liên hệ khẩn cấp", "text"),
      F("health", "Tình trạng sức khỏe", "textarea", { wide: true }),
      F("allergies", "Dị ứng / Thực phẩm cần tránh", "textarea"),
      F("diet", "Nhu cầu dinh dưỡng", "textarea"),
      F("mobility", "Khả năng di chuyển", "select", {
        options: ["Tự đi lại", "Cần hỗ trợ", "Xe lăn"],
      }),
      F("habits", "Thói quen và nhu cầu đặc biệt", "textarea", { wide: true }),
      F(
        "consent",
        "Tôi đồng ý chia sẻ thông tin chăm sóc với các thành viên gia đình được cấp quyền.",
        "checkbox",
        { wide: true },
      ),
    ],
    bookings: old.id
      ? [
          F("status", "Trạng thái", "select", {
            options: [
              "Chờ duyệt",
              "Đã xác nhận",
              "Đang lưu trú",
              "Hoàn tất",
              "Đã hủy",
            ],
          }),
          F("room_id", "Phân phòng", "select", {
            options: [
              ["", "Chưa phân phòng"],
              ...data("rooms")
                .filter((r) => r.active)
                .map((r) => [r.id, r.name + " · " + r.capacity + " chỗ"]),
            ],
          }),
          F("assessment", "Đánh giá tiếp nhận", "textarea", { wide: true }),
          F("contract", "Mã hợp đồng / xác nhận đồng ý"),
          notes,
        ]
      : [
          resident,
          F("package_id", "Gói dịch vụ", "select", {
            options: data("packages")
              .filter((p) => p.active)
              .map((p) => [p.id, localized(p) + " · " + money(p.price)]),
            required: true,
          }),
          F("start", "Ngày đến", "date", {
            required: true,
            min: today(),
            value: today(),
          }),
          F("duration", "Số đơn vị thời lượng", "number", {
            min: 1,
            max: 12,
            value: 1,
            required: true,
          }),
          notes,
        ],
    packages: [
      F("name", "Tên gói", "text", { required: true }),
      F("health_tier", "Loại gói", "select", { required: true, options: [["day", "Gói Ngày"], ["week", "Gói Tuần"], ["month", "Gói Tháng"]] }),
      F("price", "Giá gói (VNĐ)", "number", { min: 1, max: 1000000000, required: true }),
      F("name_en", "Tên tiếng Anh", "text"),
      F("description", "Quyền lợi và mô tả", "textarea", { wide: true }),
      F("description_en", "Mô tả tiếng Anh", "textarea", { wide: true }),
      F("active", "Đang nhận đăng ký", "checkbox", { value: true }),
    ],
    rooms: [
      F("name", "Tên phòng", "text", { required: true }),
      F("facility", "Cơ sở", "text", { required: true, value: "Bình Mỹ" }),
      F("capacity", "Sức chứa", "number", {
        min: 1,
        max: 1000,
        required: true,
      }),
      F("accessible", "Hỗ trợ người khó di chuyển", "checkbox", {
        value: true,
      }),
      F("active", "Đang hoạt động", "checkbox", { value: true }),
    ],
    care: [
      resident,
      title,
      F("due", "Hạn thực hiện", "date", { required: true, value: today() }),
      staff,
      F("goal", "Mục tiêu chăm sóc"),
      status,
      notes,
    ],
    vitals: [
      resident,
      F("systolic", "Huyết áp tâm thu (mmHg)", "number", {
        min: 40,
        max: 300,
        required: true,
      }),
      F("diastolic", "Huyết áp tâm trương (mmHg)", "number", {
        min: 20,
        max: 200,
        required: true,
      }),
      F("pulse", "Mạch (bpm)", "number", { min: 20, max: 250, required: true }),
      F("spo2", "SpO₂ (%)", "number", { min: 40, max: 100, required: true }),
      notes,
    ],
    medications: [
      resident,
      F("title", "Tên thuốc", "text", { required: true }),
      F("dose", "Liều theo chỉ định", "text", { required: true }),
      F("schedule", "Lịch dùng", "text", {
        required: true,
        placeholder: "Ví dụ: 08:00 và 20:00, sau ăn",
      }),
      F("instruction", "Hướng dẫn / nguồn chỉ định", "textarea", {
        wide: true,
        required: true,
      }),
    ],
    doses: [
      resident,
      F("medication_id", "Thuốc theo chỉ định", "select", {
        options: data("medications").map((m) => [
          m.id,
          residentName(m.resident) + " · " + m.title,
        ]),
        required: true,
      }),
      F("time", "Thời điểm dùng", "datetime-local", { required: true }),
      F("status", "Kết quả", "select", {
        options: ["Đã dùng", "Bỏ lỡ", "Từ chối"],
      }),
      notes,
    ],
    meals: [
      resident,
      F("title", "Bữa ăn", "select", {
        options: ["Bữa sáng", "Bữa trưa", "Bữa tối", "Bữa phụ"],
      }),
      F("date", "Ngày", "date", { required: true, value: today() }),
      F("menu", "Thực đơn / chế độ ăn", "textarea", {
        wide: true,
        required: true,
      }),
      F("intake", "Lượng ăn", "select", {
        options: [
          "Chưa ghi nhận",
          "Ăn hết",
          "Khoảng 75%",
          "Khoảng 50%",
          "Khoảng 25%",
          "Không ăn",
        ],
      }),
      notes,
    ],
    incidents: [
      resident,
      title,
      F("priority", "Mức ưu tiên", "select", {
        options: ["Thông thường", "Cần theo dõi", "Khẩn cấp"],
      }),
      status,
      staff,
      notes,
      F("response", "Xử lý / kết quả / thời gian phản hồi", "textarea", {
        wide: true,
      }),
    ],
    requests: [
      resident,
      title,
      F("priority", "Mức ưu tiên", "select", {
        options: ["Thông thường", "Cần theo dõi", "Khẩn cấp"],
      }),
      notes,
      ...(isLearner()
        ? []
        : [
            status,
            staff,
            F("response", "Phản hồi", "textarea", { wide: true }),
          ]),
    ],
    visits: [
      resident,
      F("visitor", "Người thăm", "text", { required: true }),
      F("date", "Ngày thăm", "date", { min: today(), required: true }),
      F("time", "Giờ thăm", "time", { required: true }),
      F("phone", "Điện thoại", "tel", { required: true }),
      ...(isLearner()
        ? []
        : [
            F("status", "Trạng thái", "select", {
              options: ["Chờ duyệt", "Đã xác nhận", "Đã hủy", "Hoàn tất"],
            }),
          ]),
      notes,
    ],
    activities: [
      F("name_en", "Tên tiếng Anh (tùy chọn)"), F("description_en", "Mô tả tiếng Anh (tùy chọn)", "textarea", { wide: true }), F("name", "Tên hoạt động", "text", { required: true }),
      F("topic", "Chủ đề", "select", { options: ["Nông nghiệp", "Sức khỏe", "Số hóa", "Thủ công"] }),
      F("format", "Hình thức", "select", { options: ["Workshop", "Talkshow"] }),
      F("fitness", "Mức vận động phù hợp", "select", { options: ["Nhẹ nhàng", "Vừa sức", "Cần hỗ trợ"] }),
      ...(state.user.role === "EXPERT" ? [] : [F("expert_id", "Chuyên gia phụ trách", "select", { options: [["", "Chưa phân công"], ...(state.public?.experts || []).map((u) => [u.id, u.name])] })]),
      F("date", "Ngày", "date", { required: true }),
      F("time", "Giờ", "time", { required: true }),
      F("location", "Địa điểm", "text", { required: true }),
      F("capacity", "Số người tối đa", "number", {
        min: 1,
        max: 1000,
        required: true,
      }),
      staff,
      F("description", "Mô tả / yêu cầu hỗ trợ", "textarea", { wide: true }),
      F("active", "Mở đăng ký", "checkbox", { value: true }),
    ],
    enrollments: [
      resident,
      F("activity_id", "Hoạt động", "select", {
        options: data("activities")
          .filter((a) => a.active)
          .map((a) => [a.id, a.name + " · " + day(a.date)]),
        required: true,
      }),
      F("waitlist", "Vào danh sách chờ nếu workshop đã đủ chỗ", "checkbox", { value: false }),
      notes,
      ...(old.id && !isLearner() ? [F("status", "Trạng thái tham gia", "select", { options: ["Đã đăng ký", "Danh sách chờ", "Đã tham gia", "Vắng mặt", "Đã hủy"] })] : []),
    ],
    shifts: [
      F("date", "Ngày", "date", { required: true, value: today() }),
      F("shift", "Ca", "select", {
        options: ["Sáng 06:00–14:00", "Chiều 14:00–22:00", "Đêm 22:00–06:00"],
      }),
      F("staff", "Nhân viên", "text", { required: true }),
      F("facility", "Cơ sở / khu vực", "text", {
        required: true,
        value: "Bình Mỹ",
      }),
      notes,
    ],
    handoffs: [
      resident,
      title,
      F("from_staff", "Người bàn giao", "text", {
        required: true,
        value: state.user.name,
      }),
      F("to_staff", "Người nhận", "text", { required: true }),
      F("condition", "Tình trạng hiện tại", "textarea", {
        wide: true,
        required: true,
      }),
      F("remaining", "Công việc còn lại / cần chú ý", "textarea", {
        wide: true,
      }),
      notes,
    ],
    reports: [
      resident,
      title,
      F("period", "Kỳ báo cáo", "text", {
        required: true,
        placeholder: "Ví dụ: 01–07/10/2026",
      }),
      F("summary", "Đánh giá / nội dung báo cáo", "textarea", {
        wide: true,
        required: true,
      }),
      F("recommendation", "Kế hoạch tiếp theo", "textarea", { wide: true }),
      F("shared", "Chia sẻ báo cáo cho gia đình được cấp quyền", "checkbox", {
        value: false,
      }),
    ],
    payments: [
      F("booking_id", "Đơn lưu trú", "select", {
        options: data("bookings").map((b) => [
          b.id,
          b.code + " · " + money(b.total),
        ]),
        required: true,
      }),
      F("type", "Loại giao dịch", "select", {
        options: ["Thu tiền", "Hoàn tiền"],
      }),
      F("amount", "Số tiền (VNĐ)", "number", {
        min: 1,
        max: 1000000000,
        required: true,
      }),
      F("reference", "Mã đối soát ngân hàng", "text", { required: true }),
      F("method", "Phương thức", "select", {
        options: ["Chuyển khoản", "Tiền mặt", "Khác"],
      }),
      notes,
    ],
  };
  if (kind === "bookings" && old.id)
    fields.bookings[0].options = [
      "Chờ duyệt",
      "Danh sách chờ",
      "Đã xác nhận",
      "Đang lưu trú",
      "Hoàn tất",
      "Đã hủy",
    ];
  if (kind === "enrollments" && old.id)
    fields.enrollments = [
      F("status", "Tham gia", "select", {
        options:
          isLearner()
            ? ["Đã hủy"]
            : ["Đã đăng ký", "Đã tham gia", "Vắng mặt", "Đã hủy"],
      }),
      notes,
    ];
  fields.attachments = [
    resident,
    title,
    F("file", "Tệp PDF / PNG / JPEG, tối đa 5 MB", "file", {
      wide: true,
      required: true,
    }),
    F("shared", "Chia sẻ tệp cho gia đình được cấp quyền", "checkbox", {
      value: false,
    }),
  ];
  if (kind === "residents" && ["MANAGER", "ADMIN"].includes(state.user.role))
    fields.residents.push(
      F("staff_ids", "Phân công nhân viên chăm sóc", "multi", {
        wide: true,
        options: state.users
          .filter((u) => ["NURSE", "DOCTOR"].includes(u.role) && u.active)
          .map((u) => [u.id, u.name + " · " + roleNames[u.role]]),
      }),
      F("family_ids", "Gia đình được liên kết", "multi", {
        wide: true,
        options: state.users
          .filter((u) => ["FAMILY", "SENIOR"].includes(u.role) && u.active)
          .map((u) => [u.id, u.name + " · " + u.email]),
      }),
    );
  if (kind === "residents" && state.user.role === "RECEPTION")
    fields.residents = fields.residents.filter(
      (f) => !["health", "allergies", "diet", "consent"].includes(f.key),
    );
  if (kind === "residents" && ["NURSE", "DOCTOR"].includes(state.user.role))
    fields.residents = fields.residents.filter((f) => f.key !== "consent");
  return fields[kind] || [];
}
function fieldHTML(f, values) {
  const value = values[f.key] ?? f.value ?? "",
    attr = `name="${f.key}" id="field-${f.key}" ${f.required ? "required" : ""} ${f.min !== undefined ? `min="${esc(f.min)}"` : ""} ${f.max !== undefined ? `max="${esc(f.max)}"` : ""} ${f.placeholder ? `placeholder="${esc(t(f.placeholder))}"` : ""}`;
  if (f.type === "checkbox")
    return `<label class="check-field ${f.wide ? "wide" : ""}"><input type="checkbox" ${attr} ${value ? "checked" : ""}><span>${esc(t(f.label))}</span></label>`;
  if (f.type === "multi")
    return `<fieldset class="wide card"><legend class="small">${esc(t(f.label))}</legend>${f.options.length ? f.options.map(([id, label]) => `<label class="check-field"><input name="${f.key}" type="checkbox" value="${id}" ${(Array.isArray(value) ? value : []).includes(id) ? "checked" : ""}>${esc(t(label))}</label>`).join("") : '<p class="muted small">Chưa có tài khoản phù hợp. Quản trị kỹ thuật cần tạo tài khoản trước.</p>'}</fieldset>`;
  let input;
  if (f.type === "textarea")
    input = `<textarea ${attr} rows="4" maxlength="10000">${esc(value)}</textarea>`;
  else if (f.type === "select")
    input = `<select ${attr}>${(f.options || [])
      .map((option) => {
        const [id, label] = Array.isArray(option) ? option : [option, option];
        return `<option value="${esc(id)}" ${String(value) === String(id) ? "selected" : ""}>${esc(t(label))}</option>`;
      })
      .join("")}</select>`;
  else
    input = `<input type="${f.type}" ${attr} ${f.type === "file" ? 'accept="application/pdf,image/png,image/jpeg"' : `value="${esc(value)}"`} ${f.type === "number" ? 'step="1"' : ""} ${f.type === "text" ? 'maxlength="500"' : ""}>`;
  return `<label class="field ${f.wide ? "wide" : ""}" for="field-${f.key}">${esc(t(f.label))}${f.required ? " *" : ""}${input}${f.help ? `<small>${esc(t(f.help))}</small>` : ""}</label>`;
}
function editForm(kind, id = "", preset = {}) {
  const old = id ? lookup(kind, id) : {},
    values = { ...old, ...preset };
  if (!can(kind)) return toast("Không có quyền thực hiện.", true);
  if (kind === "bookings" && id && isLearner())
    return detail(id);
  if (kind === "requests" && !values.status) values.status = "Chờ xử lý";
  if (kind === "visits" && !values.status) values.status = "Chờ duyệt";
  const fields = schema(kind, old, preset);
  const noResidents =
    !data("residents").length &&
    ![
      "residents",
      "rooms",
      "packages",
      "activities",
      "shifts",
      "payments",
      "expert_applications",
      "tour_bookings",
    ].includes(kind);
  modal(
    t(id ? "Cập nhật · " : "Tạo mới · ") + t(names[kind]),
    noResidents
      ? `<div class="notice">${esc(t("Cần tạo hồ sơ người lưu trú trước."))}</div><div class="form-actions">${actionButton("Tạo hồ sơ", "new", "residents", "")}</div>`
      : `${kind === "bookings" && id ? `<div class="notice section-title">${esc(old.code)} · ${day(old.start)} → ${day(old.end)} · ${money(old.total)}. Máy chủ kiểm tra sức chứa trước khi xác nhận phòng.</div>` : ""}${kind === "medications" ? '<div class="notice warn section-title">Nhập đúng chỉ định đã được chuyên môn duyệt. Hệ thống không tự đề xuất thuốc hoặc liều.</div>' : ""}<form id="record-form" data-kind="${kind}" data-id="${id}"><div class="form-grid">${renderRecordFields(fields, values, kind)}</div>${kind === "bookings" && !id ? '<div id="quote" class="notice section-title"></div>' : ""}${kind === "payments" ? '<div id="payment-balance" class="notice section-title"></div>' : ""}${kind === "meals" ? '<div id="diet-notice" class="notice section-title"></div>' : ""}<p id="form-error" class="error-text" role="alert"></p><div class="form-actions">${actionButton("Đóng", "close")}<button class="btn" type="submit">${esc(t(id ? "Lưu thay đổi" : "Xác nhận tạo"))}</button></div></form>`,
  );
  if (!noResidents) {
    $("#record-form").addEventListener("submit", saveForm);
    if (kind === "bookings" && !id) {
      $("#record-form").addEventListener("input", quote);
      quote();
    }
    if (kind === "payments") {
      $("#record-form").addEventListener("input", paymentBalance);
      paymentBalance();
    }
    if (kind === "meals") {
      $("#field-resident").addEventListener("change", dietNotice);
      dietNotice();
    }
  }
}
function quote() {
  const p = lookup("packages", $("#field-package_id")?.value),
    duration = Number($("#field-duration")?.value || 1),
    start = $("#field-start")?.value;
  if (!p || !start) return;
  const end = new Date(start + "T12:00:00");
  end.setDate(end.getDate() + duration * p.days);
  $("#quote").textContent =
    t("Dự kiến {days} ngày · Ngày về {end} · Tổng phí {price}. Lịch cần được đội ngũ xác nhận theo sức chứa.", { days: duration * p.days, end: end.toLocaleDateString(uiLocale()), price: money(p.price * duration) });
}
function paymentBalance() {
  const b = lookup("bookings", $("#field-booking_id")?.value);
  if (b)
    $("#payment-balance").textContent =
      `${b.code} · Tổng phí ${money(b.total)} · Đã thu ròng ${money(paidFor(b.id))} · Còn thiếu ${money(Math.max(0, b.total - paidFor(b.id)))}.`;
}
function dietNotice() {
  const r = lookup("residents", $("#field-resident")?.value);
  $("#diet-notice").textContent =
    `Dị ứng: ${r?.allergies || "Chưa ghi nhận"} · Chế độ ăn: ${r?.diet || "Chưa ghi nhận"}`;
}
async function saveForm(e) {
  e.preventDefault();
  const form = e.currentTarget,
    kind = form.dataset.kind,
    id = form.dataset.id,
    old = id ? lookup(kind, id) : {},
    fields = schema(kind, old),
    values = {};
  for (const f of fields) {
    if (f.type === "file") continue;
    if (f.type === "multi")
      values[f.key] = $$(`input[name="${f.key}"]:checked`, form).map(
        (x) => x.value,
      );
    else if (f.type === "checkbox")
      values[f.key] = form.elements[f.key].checked;
    else
      values[f.key] =
        f.type === "number"
          ? Number(form.elements[f.key].value)
          : form.elements[f.key].value;
  }
  if (kind === "requests" && isLearner())
    values.status = old?.status || "Chờ xử lý";
  if (kind === "visits" && isLearner())
    values.status = old?.status || "Chờ duyệt";
  const button = $('button[type="submit"]', form);
  button.disabled = true;
  try {
    if (kind === "attachments") {
      const file = form.elements.file.files[0];
      if (!file || file.size > 5 * 1024 * 1024)
        throw new Error("Tệp tối đa 5 MB.");
      values.filename = file.name;
      values.mime = file.type;
      values.content = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = () => reject(new Error("Không thể đọc tệp."));
        reader.readAsDataURL(file);
      });
    }
    await api(kind + (id ? "/" + id : ""), id ? "PATCH" : "POST", values);
    await refresh();
    closeModal();
    if (kind === "bookings") state.page = "bookings";
    shell();
    if (kind === "residents" && state.pendingWorkshop) {
      const workshopId = state.pendingWorkshop;
      state.pendingWorkshop = "";
      await learningIntent("learning-enroll", workshopId);
    }
    if (kind === "residents" && state.pendingBookingPackage) {
      const packageId = state.pendingBookingPackage;
      state.pendingBookingPackage = "";
      editForm("bookings", "", { package_id: packageId });
    }
    toast("Đã lưu thành công.");
  } catch (error) {
    $("#form-error").textContent = error.message;
    button.disabled = false;
  }
}
