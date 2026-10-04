function syncFontButtons() {
  $$('[data-action="font"]').forEach((button) =>
    button.setAttribute(
      "aria-pressed",
      String(document.documentElement.classList.contains("large-text")),
    ),
  );
}
function originalAuth() {
  const area = $("#navAuthArea");
  if (!area) return;
  if (state.user)
    area.innerHTML = `<span class="text-xs text-stone-500 hidden sm:block">${esc(state.user.name)}</span>${actionButton(state.user.role === "FAMILY" ? "Không gian gia đình" : "Trang quản lý", "original-dashboard", "", "")}${actionButton("Đăng xuất", "logout")}`;
  else area.innerHTML = actionButton("Đăng Nhập / Đăng Ký", "login", "", "");
  area.insertAdjacentHTML("beforeend", actionButton("Cỡ chữ Aᴀ", "font"));
  syncFontButtons();
}
function landing(section = "home") {
  const template = $("#original-project");
  $("#app").replaceChildren(template.content.cloneNode(true));
  originalAuth();
  if (state.data.demo)
    $("#app").insertAdjacentHTML(
      "afterbegin",
      '<div class="notice" role="status">DỮ LIỆU DEMO · Tài khoản, hồ sơ và giao dịch hoàn toàn giả.</div>',
    );
  $("#sec-home").classList.toggle("hidden", section !== "home");
  $("#sec-packages").classList.toggle("hidden", section !== "packages");
  $$('[data-action="original-book"]').forEach((button) => {
    const p = data("packages").find(
      (p) => p.days === Number(button.dataset.days) && p.active,
    );
    const card = button.closest(".bg-white");
    if (p && card) {
      const price = $(".text-3xl", card);
      if (price)
        price.textContent = Number(p.price).toLocaleString("vi-VN") + " VNĐ";
    }
    if (!p) {
      button.disabled = true;
      button.textContent = "Tạm ngừng đăng ký";
    }
  });
  window.scrollTo(0, 0);
}
function navigation() {
  const role = state.user.role;
  const groups = [
    [
      "TỔNG QUAN",
      [
        ["dashboard", "◫", "Bảng điều hành"],
        ["calendar", "▦", "Lịch tổng hợp"],
      ],
    ],
    [
      "LƯU TRÚ & GIA ĐÌNH",
      [
        ["residents", "♡", "Hồ sơ lưu trú"],
        ["bookings", "⌂", "Đặt lịch & lưu trú"],
        ["rooms", "▥", "Phòng & sức chứa"],
        ["packages", "◇", "Gói dịch vụ"],
        ["visits", "◷", "Lịch thăm"],
        ["requests", "✉", "Yêu cầu gia đình"],
      ],
    ],
    [
      "CHĂM SÓC",
      [
        ["care", "✓", "Kế hoạch chăm sóc"],
        ["vitals", "∿", "Chỉ số sức khỏe"],
        ["medications", "✚", "Thuốc & chỉ định"],
        ["doses", "◉", "Nhật ký dùng thuốc"],
        ["meals", "♧", "Dinh dưỡng"],
        ["incidents", "!", "Sự cố & hỗ trợ"],
        ["reports", "▤", "Báo cáo chăm sóc"],
      ],
    ],
    [
      "VẬN HÀNH",
      [
        ["activities", "❧", "Hoạt động nông trại"],
        ["enrollments", "♧", "Đăng ký hoạt động"],
        ["shifts", "◴", "Phân ca"],
        ["handoffs", "⇄", "Bàn giao ca"],
        ["payments", "₫", "Thu chi & đối soát"],
        ["analytics", "▥", "Báo cáo vận hành"],
        ["users", "♙", "Tài khoản & quyền"],
        ["audit", "◎", "Nhật ký hệ thống"],
        ["settings", "⚙", "Cài đặt & bảo mật"],
      ],
    ],
  ];
  groups[2][1].push(["attachments", "▧", "Hồ sơ đính kèm"]);
  groups[0][1].push(["notifications", "◎", "Thông báo & nhắc việc"]);
  const allowed = (page) => {
    if (role === "ADMIN")
      return ["dashboard", "users", "audit", "settings"].includes(page);
    if (["users", "audit"].includes(page)) return role === "MANAGER";
    if (page === "analytics")
      return ["MANAGER", "ACCOUNTANT", "RECEPTION"].includes(role);
    if (role === "ACCOUNTANT")
      return [
        "dashboard",
        "bookings",
        "packages",
        "payments",
        "analytics",
        "notifications",
        "settings",
      ].includes(page);
    if (role === "RECEPTION")
      return ![
        "care",
        "vitals",
        "medications",
        "doses",
        "meals",
        "handoffs",
        "reports",
      ].includes(page);
    if (role === "FAMILY")
      return ![
        "shifts",
        "handoffs",
        "incidents",
        "users",
        "audit",
        "analytics",
        "rooms",
      ].includes(page);
    return true;
  };
  return groups
    .map(([group, links]) => {
      const visible = links.filter(([id]) => allowed(id));
      return visible.length
        ? `<div class="nav-group">${group}</div>${visible.map(([id, icon, label]) => `<button class="nav-item ${state.page === id ? "active" : ""}" data-page="${id}" ${state.page === id ? 'aria-current="page"' : ""}><span class="nav-icon">${icon}</span>${label}</button>`).join("")}`
        : "";
    })
    .join("");
}
function shell() {
  const original = $("#original-project").content;
  const nav = document.createElement("div");
  nav.innerHTML = navigation();
  const choices = $$("button[data-page]", nav).map((b) => ({
    id: b.dataset.page,
    label: b.textContent.trim(),
  }));
  const favorite =
    state.user.role === "FAMILY"
      ? [
          "dashboard",
          "residents",
          "bookings",
          "reports",
          "requests",
          "activities",
        ]
      : ["dashboard", "bookings", "residents", "care", "analytics", "users"];
  const tabs = choices.filter((c) => favorite.includes(c.id));
  $("#app").innerHTML =
    `<div class="original-site">${$("header", original).outerHTML}<div class="project-workspace"><div class="project-function-bar"><nav class="project-tabs" aria-label="Chức năng chính">${tabs.map((c) => `<button class="${state.page === c.id ? "active" : ""}" data-page="${c.id}">${esc(c.label)}</button>`).join("")}</nav><label class="project-module-label">Tất cả chức năng<select id="module-select" aria-label="Chọn chức năng">${choices.map((c) => `<option value="${c.id}" ${state.page === c.id ? "selected" : ""}>${esc(c.label)}</option>`).join("")}</select></label></div><main class="main upgraded-module" id="main" tabindex="-1"></main></div>${$("footer", original).outerHTML}</div>`;
  originalAuth();
  if (state.data.demo)
    $("#app").insertAdjacentHTML(
      "afterbegin",
      '<div class="notice" role="status">DỮ LIỆU DEMO · Tài khoản, hồ sơ và giao dịch hoàn toàn giả.</div>',
    );
  renderPage();
}
