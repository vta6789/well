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
  area.innerHTML = `${actionButton("Đăng nhập", "login", "", "secondary")}${actionButton("Tạo tài khoản", "register", "", "primary")}`;
  syncFontButtons();
}
function landing(section = "home") {
  return learningLanding(section);
}
function legacyLanding(section = "home") {
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
function navigationGroups() {
  const role = state.user.role;
  if (["FAMILY", "SENIOR", "EXPERT"].includes(role)) return learningNavigation(role);
  if (role === "ADMIN") {
    return [
      { title: "Học – làm – du lịch", links: [["activities", "❧", "Workshop & Talkshow"], ["enrollments", "♧", "Đăng ký workshop"], ["journey", "↗", "Hành trình giá trị"], ["gardens", "♧", "Vườn riêng & câu chuyện"], ["skills", "✓", "Kỹ năng đã học"], ["practice", "▤", "Nhật ký thực hành"], ["products", "◇", "Sản phẩm học viên"], ["tour_bookings", "⌂", "Đặt tham quan vườn"], ["expert_applications", "♙", "Hồ sơ chuyên gia"], ["impact", "▥", "Bảng tác động"]] },
      { title: "Quản trị", links: [["dashboard", "◫", "Bảng điều hành"], ["users", "♙", "Tài khoản & quyền"], ["audit", "◎", "Nhật ký hệ thống"]] },
      { title: "Tiếp nhận người dùng", links: [["requests", "✉", "Yêu cầu gia đình"], ["bookings", "⌂", "Đặt lịch & lưu trú"], ["residents", "♡", "Hồ sơ lưu trú"], ["visits", "◷", "Lịch thăm"], ["notifications", "◎", "Thông báo & nhắc việc"]] },
      { title: "Quản lý vận hành", links: [["rooms", "▥", "Phòng & sức chứa"], ["packages", "◇", "Gói dịch vụ"], ["activities", "❧", "Hoạt động nông trại"], ["enrollments", "♧", "Đăng ký hoạt động"], ["shifts", "◴", "Phân ca"], ["payments", "₫", "Thu chi & đối soát"], ["analytics", "▥", "Báo cáo vận hành"], ["calendar", "▦", "Lịch tổng hợp"]] },
      { title: "Hỗ trợ tùy chọn", links: [["basic-health", "♡", "Sức khỏe cơ bản"], ["attachments", "▧", "Hồ sơ đính kèm"]] },
    ].map((group) => ({ ...group, links: group.links.filter(([id]) => !["vitals", "doses", "attachments"].includes(id)).map(([id, icon, label]) => ({ id, icon, label: id === "medications" ? "Thuốc & nhật ký dùng thuốc" : label })) }));
  }
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
    if (role === "ADMIN") return true;
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
  const titles = [
    "Tổng quan",
    "Lưu trú",
    "Chăm sóc",
    role === "FAMILY" ? "Tiện ích" : "Vận hành",
  ];
  const result = groups
    .map(([, links], index) => ({
      title: titles[index],
      links: links
        .filter(([id]) => id !== "settings" && !["packages", "visits", "requests", "vitals", "doses", "attachments"].includes(id) && allowed(id))
        .map(([id, icon, label]) => ({
          id,
          icon,
          label: id === "medications"
            ? "Thuốc & nhật ký dùng thuốc"
            : role === "FAMILY" && id === "bookings" ? "Lưu trú của tôi" : label,
        })),
    }))
    .filter((group) => group.links.length);
  if (role === "FAMILY") {
    result.splice(1, 0, ...learningNavigation(role).filter((group) => ["Học & thực hành", "Trải nghiệm"].includes(group.title)));
    for (const group of result) group.links = group.links.filter((link) => !["vitals", "medications", "doses", "payments"].includes(link.id));
    result.push({ title: "Tùy chọn", links: [{ id: "basic-health", icon: "♡", label: "Sức khỏe cơ bản" }] });
  }
  if (role === "MANAGER") {
    const learning = learningNavigation(role).find((group) => group.title === "Học & thực hành");
    const target = result[result.length - 1];
    target.links.push(...learning.links.filter((link) => !result.some((group) => group.links.some((existing) => existing.id === link.id))));
    target.links.push({ id: "expert_applications", icon: "♙", label: "Hồ sơ chuyên gia" }, { id: "tour_bookings", icon: "⌂", label: "Đặt tham quan vườn" });
  }
  return result;
}
function navigationLink(link) {
  return `<button type="button" data-page="${link.id}" ${state.page === link.id ? 'aria-current="page"' : ""}><span class="project-link-icon" aria-hidden="true">${link.icon}</span><span>${esc(t(link.label))}</span>${state.page === link.id ? '<span class="project-current-mark" aria-hidden="true">✓</span>' : ""}</button>`;
}
function adminShell() {
  const groups = navigationGroups();
  const current = groups.flatMap((group) => group.links).find((link) => link.id === state.page);
  const pageTitle = current?.label || (state.page === "settings" ? "Cài đặt & bảo mật" : "Quản trị hệ thống");
  $("#app").innerHTML = `<div class="original-site admin-portal">
    <aside id="sidebar" class="admin-sidebar" aria-label="Menu quản trị">
      <button class="admin-brand" data-page="dashboard"><span class="admin-brand-icon" aria-hidden="true">❧</span><span>Wellness Farm<small>TRANG QUẢN TRỊ</small></span></button>
      <div class="admin-access-label">${esc(t("Quản trị viên"))}<span>ADMIN</span></div>
      <nav aria-label="Chức năng quản trị">${groups.map((group) => `<section class="admin-nav-group"><h2>${esc(t(group.title))}</h2>${group.links.map(navigationLink).join("")}</section>`).join("")}</nav>
      <div class="admin-sidebar-bottom"><button data-page="settings">⚙ Cài đặt & bảo mật</button><button data-action="logout">↪ Đăng xuất</button></div>
    </aside>
    <button class="admin-menu-backdrop" data-action="menu" aria-label="Đóng menu quản trị"></button>
    <div class="admin-workspace"><header class="admin-header"><div class="admin-header-title"><button class="admin-menu-toggle" data-action="menu" aria-label="Mở menu quản trị" aria-controls="sidebar" aria-expanded="false">☰</button><div><small>Quản trị & quản lý</small><strong>${esc(t(pageTitle))}</strong></div></div>
      <div class="admin-header-actions">${languageSwitch()}${actionButton("Làm mới", "refresh", "", "secondary compact")}<details class="project-user-menu"><summary><span class="project-user-avatar" aria-hidden="true">${esc(state.user.name.trim().charAt(0).toUpperCase())}</span><span class="project-user-name">${esc(state.user.name)}</span><span aria-hidden="true">⌄</span><span class="project-sr-only">${esc(t("Tài khoản"))}</span></summary><div class="project-user-menu-items"><div class="project-account-label">${esc(state.user.email)}<small>${esc(t("Quản trị viên"))}</small></div>${actionButton("Cỡ chữ Aᴀ", "font", "", "project-font-toggle")}<button data-page="settings">${esc(t("Cài đặt & bảo mật"))}</button><button class="project-logout" data-action="logout">${esc(t("Đăng xuất"))}</button></div></details></div>
    </header><main class="main admin-main" id="main" tabindex="-1"></main></div>
  </div>`;
  if (state.data.demo) $("#main").insertAdjacentHTML("beforebegin", '<div class="notice" role="status">DỮ LIỆU DEMO · Tài khoản, hồ sơ và giao dịch hoàn toàn giả.</div>');
  renderPage();
}
function shell() {
  if (state.user.role === "ADMIN") return adminShell();
  const original = $("#original-project").content;
  const groups = navigationGroups();
  const desktopNav = groups
    .map(
      (group) =>
        `<details class="project-function-menu"><summary class="${group.links.some((link) => link.id === state.page) ? "active" : ""}">${esc(t(group.title))}<span aria-hidden="true">⌄</span></summary><div class="project-function-items">${group.links.map(navigationLink).join("")}</div></details>`,
    )
    .join("");
  const mobileNav = `<details class="project-mobile-nav"><summary>${esc(t("Chức năng"))}<span aria-hidden="true">⌄</span></summary><div class="project-mobile-panel">${groups.map((group) => `<section><h2>${esc(t(group.title))}</h2>${group.links.map(navigationLink).join("")}</section>`).join("")}</div></details>`;
  const footer = translateStatic($("footer", original).cloneNode(true)).outerHTML;
  const originalLogo = $(".flex.items-center.gap-3.cursor-pointer", original);
  const logoButton = document.createElement("button");
  logoButton.type = "button";
  logoButton.className = originalLogo.className + " project-app-logo";
  logoButton.innerHTML = originalLogo.innerHTML;
  logoButton.dataset.page = "dashboard";
  const logo = logoButton.outerHTML;
  $("#app").innerHTML =
    `<div class="original-site"><header class="project-app-header sticky top-0 z-40"><div class="project-app-header-inner">${logo}<nav class="project-desktop-nav" aria-label="Chức năng theo vai trò">${desktopNav}</nav><div class="project-user-controls">${languageSwitch()}${mobileNav}<details class="project-user-menu"><summary><span class="project-user-avatar" aria-hidden="true">${esc(state.user.name.trim().charAt(0).toUpperCase())}</span><span class="project-user-name">${esc(state.user.name)}</span><span class="project-user-chevron" aria-hidden="true">⌄</span><span class="project-sr-only">${esc(t("Tài khoản"))}</span></summary><div class="project-user-menu-items"><div class="project-account-label">${esc(state.user.name)}<small>${esc(t(roleNames[state.user.role]))}</small></div>${actionButton("Cỡ chữ Aᴀ", "font", "", "project-font-toggle")}<button data-page="settings">${esc(t("Cài đặt & bảo mật"))}</button><button data-action="project">${esc(t("Dự án"))}</button><button class="project-logout" data-action="logout">${esc(t("Đăng xuất"))}</button></div></details></div></div></header><div class="project-workspace"><main class="main upgraded-module" id="main" tabindex="-1"></main></div>${footer}</div>`;
  if (state.data.demo)
    $("#app").insertAdjacentHTML(
      "afterbegin",
      '<div class="notice" role="status">DỮ LIỆU DEMO · Tài khoản, hồ sơ và giao dịch hoàn toàn giả.</div>',
    );
  renderPage();
}

// Native details retain keyboard semantics. Keep one menu open and dismiss it
// on Escape or an outside click, without installing listeners on every render.
document.addEventListener(
  "toggle",
  (event) => {
    const menu = event.target;
    if (!menu.matches?.(".project-app-header details, .admin-header details") || !menu.open) return;
    $$(".project-app-header details[open], .admin-header details[open]").forEach((other) => {
      if (other !== menu) other.open = false;
    });
  },
  true,
);
document.addEventListener("click", (event) => {
  $$(".project-app-header details[open], .admin-header details[open]").forEach((menu) => {
    if (!menu.contains(event.target)) menu.open = false;
  });
});
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const menu = document.activeElement?.closest(
    ".project-app-header details[open], .admin-header details[open]",
  );
  if (menu) {
    menu.open = false;
    $("summary", menu).focus();
    event.preventDefault();
  }
  const sidebar = $(".admin-sidebar.open");
  if (sidebar) {
    sidebar.classList.remove("open");
    const toggle = $(".admin-menu-toggle");
    toggle.setAttribute("aria-expanded", "false");
    toggle.focus();
    event.preventDefault();
  }
});
