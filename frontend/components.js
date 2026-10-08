function actionButton(label, action, id = "", cls = "secondary compact") {
  return `<button class="btn ${cls}" data-action="${esc(action)}" data-id="${esc(id)}">${esc(t(label))}</button>`;
}
function authPasswordField(register) {
  return `<div class="field ${register ? "" : "wide"}"><label for="auth-password">${esc(t("Mật khẩu"))} *</label><div class="password-input"><input id="auth-password" name="password" type="password" required ${register ? 'minlength="12"' : ""} maxlength="128" autocomplete="${register ? "new-password" : "current-password"}"><button type="button" class="password-toggle" data-action="toggle-password" aria-controls="auth-password" aria-label="${esc(t("Hiện mật khẩu"))}" title="${esc(t("Hiện mật khẩu"))}" aria-pressed="false"><i class="fa-solid fa-eye" aria-hidden="true"></i></button></div><small>${esc(t(register ? "Tối thiểu 12 ký tự." : "Nếu quên mật khẩu, liên hệ quản trị viên; email khôi phục chưa kết nối."))}</small></div>`;
}
let modalTrigger;
function closeModal(cancel = false) {
  if (cancel) {
    state.learningIntent = null;
    state.pendingPackage = "";
    state.pendingBookingPackage = "";
    state.pendingWorkshop = "";
    state.afterLogin = "";
  }
  $("#modal").close();
}
function modal(title, content) {
  const el = $("#modal");
  if (!el.open) modalTrigger = document.activeElement;
  el.innerHTML = `<div class="modal-head"><div><div class="eyebrow">WELLNESS FARM</div><h2 id="modal-title" tabindex="-1">${esc(t(title))}</h2></div><button class="close" data-action="close" aria-label="${esc(t("Đóng"))}">×</button></div>${content}`;
  if (!el.open) el.showModal();
  $("#modal-title").focus();
}
$("#modal").addEventListener("close", () => {
  if (modalTrigger?.isConnected) modalTrigger.focus();
});
$("#modal").addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    closeModal(true);
    return;
  }
  if (event.key !== "Tab") return;
  const items = $$(
    'button, input, select, textarea, a[href], [tabindex="0"]',
    $("#modal"),
  ).filter((el) => !el.disabled && el.getClientRects().length);
  const first = items[0],
    last = items.at(-1);
  if (!first) {
    event.preventDefault();
    return;
  }
  const active = document.activeElement;
  if (event.shiftKey && (active === first || !items.includes(active))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (active === last || !items.includes(active))) {
    event.preventDefault();
    first.focus();
  }
});
function empty(
  label = "Chưa có dữ liệu",
  detail = "Tạo bản ghi đầu tiên để bắt đầu theo dõi.",
) {
  return `<div class="empty"><div class="empty-symbol">♧</div><strong>${esc(t(label))}</strong><p class="small">${esc(t(detail))}</p></div>`;
}
function header(title, subtitle, actions = "") {
  return `<div class="page-head"><div><div class="eyebrow">WELLNESS FARM / ${esc(t(roleNames[state.user.role]))}</div><h1>${esc(t(title))}</h1><p>${esc(t(subtitle))}</p></div><div class="row">${actions}</div></div>`;
}
function projectCredits() {
  return `<p class="small muted project-credits">${esc(t("Malware (tác giả) · Team3 (đồng tác giả)"))}</p>`;
}
function recordEmpty(kind, allowCreate = false) {
  if (state.query || state.filter) return empty("Không tìm thấy kết quả phù hợp", "Thử thay đổi từ khóa hoặc bộ lọc.");
  if (kind === "skills") return empty("Chưa có kỹ năng được ghi nhận", "Kỹ năng sẽ hiển thị sau khi chuyên gia đánh giá và xác nhận.");
  if (["bookings", "enrollments"].includes(kind)) return empty("Bạn chưa có đơn đăng ký nào", allowCreate ? "Bấm “Tạo mới” để bắt đầu." : "Thông tin sẽ xuất hiện khi được ghi nhận hoặc cấp quyền.");
  return empty("Chưa có dữ liệu", allowCreate ? "Bấm “Tạo mới” để bắt đầu." : "Thông tin sẽ xuất hiện khi được ghi nhận hoặc cấp quyền.");
}
