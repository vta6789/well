const labels = {
  name: "Họ tên / tên",
  dob: "Ngày sinh",
  phone: "Điện thoại",
  emergency: "Liên hệ khẩn cấp",
  health: "Sức khỏe",
  allergies: "Dị ứng",
  diet: "Dinh dưỡng",
  mobility: "Khả năng di chuyển",
  habits: "Thói quen",
  consent: "Đồng ý chia sẻ",
  staff_ids: "Nhân viên được phân công",
  family_ids: "Gia đình liên kết",
  package_name: "Gói",
  start: "Ngày đến",
  end: "Ngày về",
  duration: "Thời lượng",
  total: "Tổng phí",
  code: "Mã đơn",
  status: "Trạng thái",
  room_id: "Phòng",
  assessment: "Đánh giá tiếp nhận",
  contract: "Mã hợp đồng",
  notes: "Ghi chú",
  title: "Tiêu đề",
  due: "Hạn thực hiện",
  assignee: "Phụ trách",
  goal: "Mục tiêu",
  systolic: "Tâm thu (mmHg)",
  diastolic: "Tâm trương (mmHg)",
  pulse: "Mạch (bpm)",
  spo2: "SpO₂ (%)",
  alert: "Vượt ngưỡng tham khảo",
  recorded_by: "Người ghi nhận",
  dose: "Liều",
  schedule: "Lịch dùng",
  instruction: "Chỉ định / hướng dẫn",
  prescribed_by: "Người nhập chỉ định",
  time: "Thời điểm",
  date: "Ngày",
  menu: "Thực đơn",
  intake: "Lượng ăn",
  priority: "Mức ưu tiên",
  response: "Phản hồi / xử lý",
  visitor: "Người thăm",
  description: "Mô tả",
  capacity: "Sức chứa",
  location: "Địa điểm",
  facility: "Cơ sở",
  accessible: "Hỗ trợ di chuyển",
  active: "Hoạt động",
  shift: "Ca",
  staff: "Nhân viên",
  from_staff: "Bàn giao",
  to_staff: "Người nhận",
  condition: "Tình trạng",
  remaining: "Công việc còn lại",
  period: "Kỳ báo cáo",
  summary: "Nội dung",
  recommendation: "Kế hoạch tiếp theo",
  shared: "Chia sẻ gia đình",
  amount: "Số tiền",
  reference: "Mã đối soát",
  method: "Phương thức",
  type: "Loại giao dịch",
  price: "Đơn giá",
  days: "Ngày / đơn vị",
  created_at: "Ngày tạo",
  updated_at: "Ngày cập nhật",
  resident: "Người lưu trú",
  medication_id: "Thuốc",
  activity_id: "Hoạt động",
  booking_id: "Đơn lưu trú",
};
function find(id) {
  for (const kind of kinds) {
    const item = lookup(kind, id);
    if (item) return { kind, item };
  }
  return null;
}
function displayValue(key, value) {
  if (["total", "amount", "price"].includes(key)) return money(value);
  if (
    ["start", "end", "dob", "date", "due", "created_at", "updated_at"].includes(
      key,
    )
  )
    return day(value);
  if (key === "resident") return residentName(value);
  if (key === "room_id")
    return lookup("rooms", value)?.name || "Chưa phân phòng";
  if (key === "medication_id")
    return lookup("medications", value)?.title || value;
  if (key === "activity_id") return lookup("activities", value)?.name || value;
  if (key === "booking_id") return lookup("bookings", value)?.code || value;
  if (["staff_ids", "family_ids"].includes(key))
    return (
      (value || [])
        .map(
          (id) =>
            state.users.find((u) => u.id === id)?.name ||
            "Thành viên được cấp quyền",
        )
        .join(", ") || "Chưa liên kết"
    );
  if (typeof value === "boolean") return value ? "Có" : "Không";
  return String(value ?? "—");
}
function detail(id) {
  const result = find(id);
  if (!result) return toast("Không tìm thấy bản ghi.", true);
  const { kind, item } = result;
  const fields = Object.entries(item).filter(([k]) => labels[k]);
  let extra = "";
  if (kind === "bookings") {
    const paid = paidFor(id);
    extra = `<div class="notice section-title">Đã thu ròng: ${money(paid)} · Còn nợ: ${money(item.status === "Đã hủy" ? 0 : Math.max(0, item.total - paid))}. Nếu cần hủy sau thanh toán, nhân viên xử lý hoàn tiền riêng.</div>`;
  }
  modal(
    names[kind],
    `<dl class="detail">${fields.map(([key, value]) => `<div><dt>${esc(labels[key])}</dt><dd>${esc(displayValue(key, value))}</dd></div>`).join("")}</dl>${extra}<div class="form-actions">${actionButton("Đóng", "close")}${kind === "reports" ? actionButton("Xem bản in", "print-report", id, "") : ""}${kind === "bookings" ? actionButton("In biên nhận", "print-booking", id, "") : ""}${kind === "residents" ? actionButton("Xem hành trình", "resident-timeline", id, "") : ""}</div>`,
  );
}
function timeline(id) {
  const resident = lookup("residents", id);
  if (!resident) return;
  const events = kinds
    .filter(
      (k) =>
        !["residents", "packages", "rooms", "activities", "shifts"].includes(k),
    )
    .flatMap((kind) =>
      data(kind)
        .filter((r) => r.resident === id)
        .map((r) => ({ ...r, kind })),
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  modal(
    "Hành trình · " + resident.name,
    events.length
      ? `<div class="timeline">${events.map((e) => `<div class="timeline-item"><div class="eyebrow">${esc(names[e.kind])} · ${day(e.created_at)}</div><strong>${esc(e.title || e.package_name || e.type || names[e.kind])}</strong><p>${esc(e.notes || e.summary || e.status || "")}</p>${actionButton("Chi tiết", "detail", e.id)}</div>`).join("")}</div>`
      : empty("Chưa có lịch sử chăm sóc"),
  );
}
function authForm(register = false) {
  modal(
    register ? "Tạo tài khoản gia đình" : "Chào mừng trở lại",
    `<p class="small muted">${register ? "Tạo tài khoản để quản lý hồ sơ và đặt lịch cho người thân." : "Đăng nhập để tiếp tục hành trình cùng Wellness Farm."}</p><form id="auth-form"><div class="form-grid">${register ? fieldHTML(F("name", "Họ tên", "text", { required: true }), {}) : ""}${fieldHTML(F("email", register ? "Email" : "Email hoặc số điện thoại", register ? "email" : "text", { required: true }), {})}${register ? fieldHTML(F("phone", "Số điện thoại", "tel", { required: true }), {}) : ""}<label class="field ${register ? "" : "wide"}">Mật khẩu *<input name="password" type="password" required ${register ? 'minlength="12"' : ""} maxlength="128" autocomplete="${register ? "new-password" : "current-password"}"><small>${register ? "Tối thiểu 12 ký tự." : "Nếu quên mật khẩu, liên hệ quản trị viên; email khôi phục chưa kết nối."}</small></label></div><p id="auth-error" class="error-text" role="alert"></p><div class="form-actions">${actionButton(register ? "Đã có tài khoản" : "Tạo tài khoản", register ? "login" : "register")}<button class="btn" type="submit">${register ? "Đăng ký" : "Đăng nhập"}</button></div></form>`,
  );
  if (!register)
    $(".form-grid", $("#auth-form")).insertAdjacentHTML(
      "beforeend",
      fieldHTML(
        F("otp", "Mã MFA (nếu đã bật)", "text", {
          wide: true,
          placeholder: "6 chữ số trong ứng dụng xác thực",
        }),
        {},
      ),
    );
  $("#auth-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.currentTarget,
      button = $('button[type="submit"]', form);
    button.disabled = true;
    try {
      const result = await api(
        register ? "register" : "login",
        "POST",
        Object.fromEntries(new FormData(form)),
      );
      state.user = result.user;
      state.csrf = result.csrf;
      state.page = state.afterLogin || "dashboard";
      state.afterLogin = "";
      closeModal();
      await refresh();
      shell();
      if (state.pendingPackage) {
        const packageId = state.pendingPackage;
        state.pendingPackage = "";
        editForm("bookings", "", { package_id: packageId });
      }
      toast("Xin chào " + state.user.name + ".");
    } catch (error) {
      $("#auth-error").textContent = error.message;
      button.disabled = false;
    }
  });
}
function userForm(id = "") {
  const old = state.users.find((u) => u.id === id) || {};
  const fields = id
    ? [
        F("role", "Vai trò", "select", { options: Object.entries(roleNames) }),
        F("active", "Cho phép đăng nhập", "checkbox"),
      ]
    : [
        F("name", "Họ tên", "text", { required: true }),
        F("email", "Email", "email", { required: true }),
        F("phone", "Số điện thoại", "tel", { required: true }),
        F("password", "Mật khẩu ban đầu", "password", { required: true }),
        F("role", "Vai trò", "select", { options: Object.entries(roleNames) }),
      ];
  modal(
    id ? "Cấp quyền / khóa tài khoản" : "Tạo tài khoản",
    `<form id="user-form"><div class="form-grid">${fields.map((f) => fieldHTML(f, old)).join("")}</div><p id="form-error" class="error-text" role="alert"></p><div class="form-actions">${actionButton("Đóng", "close")}<button class="btn" type="submit">Lưu tài khoản</button></div></form>`,
  );
  $("#user-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.currentTarget,
      values = Object.fromEntries(new FormData(form));
    if (id) values.active = form.elements.active.checked;
    const button = $('button[type="submit"]', form);
    button.disabled = true;
    try {
      await api("users" + (id ? "/" + id : ""), id ? "PATCH" : "POST", values);
      closeModal();
      await refresh();
      shell();
      toast("Đã lưu tài khoản.");
    } catch (error) {
      $("#form-error").textContent = error.message;
      button.disabled = false;
    }
  });
}
function passwordForm() {
  modal(
    "Đổi mật khẩu",
    `<form id="password-form"><div class="stack"><label class="field">Mật khẩu hiện tại<input name="current" type="password" autocomplete="current-password" required></label><label class="field">Mật khẩu mới<input name="password" type="password" minlength="12" maxlength="128" autocomplete="new-password" required><small>Tối thiểu 12 ký tự.</small></label></div><p id="form-error" class="error-text" role="alert"></p><div class="form-actions">${actionButton("Đóng", "close")}<button class="btn" type="submit">Đổi mật khẩu & đăng xuất</button></div></form>`,
  );
  $("#password-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api(
        "password",
        "POST",
        Object.fromEntries(new FormData(e.currentTarget)),
      );
      closeModal();
      state.user = null;
      state.csrf = "";
      await publicLoad();
      toast("Đã đổi mật khẩu. Vui lòng đăng nhập lại.");
    } catch (error) {
      $("#form-error").textContent = error.message;
    }
  });
}
function mfaForm() {
  modal(
    "Bật xác thực hai bước",
    `<form id="mfa-form"><div class="stack"><label class="field">Mật khẩu hiện tại<input type="password" name="password" required autocomplete="current-password"></label><div id="mfa-secret" class="notice">Dùng ứng dụng xác thực hỗ trợ TOTP. Sau khi tạo khóa, thêm tài khoản bằng khóa thiết lập thủ công.</div><label class="field" id="mfa-code-field" hidden>Mã xác thực<input name="otp" inputmode="numeric" pattern="[0-9]{6}" maxlength="6"></label></div><p id="form-error" class="error-text" role="alert"></p><div class="form-actions">${actionButton("Đóng", "close")}<button type="submit" class="btn">Tạo khóa thiết lập</button></div></form>`,
  );
  let setup = false;
  $("#mfa-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.currentTarget,
      button = $('button[type="submit"]', form);
    button.disabled = true;
    try {
      if (!setup) {
        const result = await api("mfa/setup", "POST", {
          password: form.elements.password.value,
        });
        $("#mfa-secret").textContent =
          "Khóa thiết lập: " +
          result.secret +
          ". Nhập vào ứng dụng xác thực, rồi nhập mã 6 chữ số bên dưới. Lưu khóa ở nơi an toàn để khôi phục.";
        $("#mfa-code-field").hidden = false;
        form.elements.otp.required = true;
        button.textContent = "Xác nhận bật MFA";
        setup = true;
        button.disabled = false;
      } else {
        await api("mfa/enable", "POST", Object.fromEntries(new FormData(form)));
        state.user.mfa = true;
        closeModal();
        shell();
        toast("Đã bật xác thực hai bước.");
      }
    } catch (error) {
      $("#form-error").textContent = error.message;
      button.disabled = false;
    }
  });
}
function printRecord(id, kind) {
  const item = lookup(kind, id);
  if (!item) return;
  closeModal();
  let html;
  if (kind === "reports")
    html = `<div class="eyebrow">BÁO CÁO CHĂM SÓC</div><h1>${esc(item.title)}</h1><p>Người lưu trú: <strong>${esc(residentName(item.resident))}</strong><br>Kỳ báo cáo: ${esc(item.period)}<br>Ngày lập: ${day(item.created_at)}</p><hr><h2>Nội dung</h2><pre>${esc(item.summary)}</pre><h2>Kế hoạch tiếp theo</h2><pre>${esc(item.recommendation)}</pre>`;
  else
    html = `<div class="eyebrow">BIÊN NHẬN ĐĂNG KÝ LƯU TRÚ</div><h1>${esc(item.code)}</h1><p>Người lưu trú: <strong>${esc(residentName(item.resident))}</strong><br>Gói: ${esc(item.package_name)}<br>Thời gian: ${day(item.start)} → ${day(item.end)}<br>Trạng thái: ${esc(item.status)}</p><hr><p>Tổng phí: <strong>${money(item.total)}</strong><br>Đã thu ròng: ${money(paidFor(id))}<br>Công nợ: ${money(item.status === "Đã hủy" ? 0 : Math.max(0, item.total - paidFor(id)))}</p><p class="small muted">Biên nhận đăng ký và số tiền ghi nhận nội bộ, không thay thế hóa đơn thuế.</p>`;
  $("#main").innerHTML =
    header(
      "Bản in",
      "Dùng chức năng in của trình duyệt để lưu PDF.",
      actionButton("← Quay lại", "back") +
        actionButton("In / Lưu PDF", "print", "", ""),
    ) +
    `<article class="paper-report"><h2>❧ Wellness Farm · Bình Mỹ</h2>${html}</article>`;
}
async function publicLoad() {
  const result = await api("public");
  state.data = result;
  landing();
}
async function navigate(page) {
  state.page = page;
  state.query = "";
  state.filter = "";
  shell();
  window.scrollTo(0, 0);
}
