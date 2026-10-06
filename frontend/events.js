document.addEventListener("click", async (e) => {
  const button = e.target.closest("[data-action],[data-page]");
  if (!button) return;
  const id = button.dataset.id,
    action = button.dataset.action;
  try {
    if (action?.startsWith("learning-")) return await learningAction(action, id);
    if (button.dataset.page) return navigate(button.dataset.page);
    if (action === "original-home") {
      landing("home");
      if (button.tagName !== "A") window.scrollTo(0, 0);
      return;
    }
    if (action === "original-section") {
      landing("home");
      document.getElementById(button.dataset.section)?.scrollIntoView({
        behavior: "smooth",
      });
      return;
    }
    if (action === "original-packages") {
      landing("packages");
      window.scrollTo(0, 0);
      return;
    }
    if (action === "original-dashboard" || action === "original-trips") {
      if (!state.user) {
        state.afterLogin =
          action === "original-trips" ? "bookings" : "dashboard";
        return authForm();
      }
      return navigate(action === "original-trips" ? "bookings" : "dashboard");
    }
    if (action === "original-book") {
      const p = data("packages").find(
        (p) => p.days === Number(button.dataset.days) && p.active,
      );
      if (!p) return toast("Gói đã ngừng đăng ký.", true);
      if (!state.user) {
        state.pendingPackage = p.id;
        return authForm();
      }
      return editForm("bookings", "", { package_id: p.id });
    }
    if (action === "close") return closeModal();
    if (action === "login" || action === "register")
      return authForm(action === "register");
    if (action === "project") return navigate("project");
    if (action === "menu") {
      const sidebar = $("#sidebar");
      const open = sidebar.classList.toggle("open");
      const toggle = $(".admin-menu-toggle");
      toggle?.setAttribute("aria-expanded", String(open));
      if (toggle) {
        if (open) $("[aria-current=page]", sidebar)?.focus();
        else toggle.focus();
      }
      return;
    }
    if (action === "font") {
      document.documentElement.classList.toggle("large-text");
      try {
        localStorage.setItem(
          "wf_large_text",
          document.documentElement.classList.contains("large-text") ? "1" : "0",
        );
      } catch {}
      syncFontButtons();
      return;
    }
    if (action === "medication-view") {
      state.medicationView = button.dataset.view;
      state.query = "";
      state.filter = "";
      return renderPage();
    }
    if (action === "home") return landing();
    if (action === "public-packages")
      return $("#public-packages").scrollIntoView({ behavior: "smooth" });
    if (action === "logout") {
      await api("logout", "POST", {});
      state.user = null;
      state.csrf = "";
      state.data = {};
      await publicLoad();
      return;
    }
    if (action === "new") return editForm(id);
    if (action === "edit") {
      const r = find(id);
      return editForm(r.kind, id);
    }
    if (action === "detail") return detail(id);
    if (action === "resident-timeline") return timeline(id);
    if (action === "book-package")
      return editForm("bookings", "", { package_id: id });
    if (action === "join-activity")
      return editForm("enrollments", "", { activity_id: id });
    if (action === "record-dose") {
      const med = lookup("medications", id);
      return editForm("doses", "", {
        medication_id: id,
        resident: med.resident,
      });
    }
    if (action === "refresh") {
      button.disabled = true;
      await refresh();
      shell();
      return toast("Đã cập nhật dữ liệu.");
    }
    if (action === "cancel-booking") {
      const b = lookup("bookings", id);
      modal(
        "Hủy đăng ký lưu trú",
        `<p>Bạn đang hủy đơn <strong>${esc(b.code)}</strong> của ${esc(residentName(b.resident))}.</p><div class="notice warn">Nếu đã thanh toán, nhân viên cần đối soát và xử lý hoàn tiền riêng.</div><div class="form-actions">${actionButton("Giữ đơn", "close")}${actionButton("Xác nhận hủy", "confirm-cancel", id, "danger")}</div>`,
      );
      return;
    }
    if (action === "confirm-cancel") {
      button.disabled = true;
      await api("bookings/" + id, "PATCH", { status: "Đã hủy" });
      closeModal();
      await refresh();
      shell();
      return toast("Đã hủy đơn.");
    }
    if (action === "new-user") return userForm();
    if (action === "edit-user") return userForm(id);
    if (action === "password") return passwordForm();
    if (action === "print-report") return printRecord(id, "reports");
    if (action === "print-booking") return printRecord(id, "bookings");
    if (action === "print") return window.print();
    if (action === "back") return shell();
    if (action?.startsWith("page-")) return navigate(action.slice(5));
    if (["prev-month", "next-month", "current-month"].includes(action)) {
      const d =
        action === "current-month"
          ? new Date()
          : new Date(
              state.year,
              state.month + (action === "next-month" ? 1 : -1),
              1,
            );
      state.month = d.getMonth();
      state.year = d.getFullYear();
      return renderPage();
    }
  } catch (error) {
    button.disabled = false;
    toast(error.message, true);
  }
});
document.addEventListener("input", (e) => {
  if (e.target.id === "search") {
    state.query = e.target.value;
    const start = e.target.selectionStart;
    renderPage();
    const input = $("#search");
    input.focus();
    input.setSelectionRange(start, start);
  }
});
document.addEventListener("change", (e) => {
  if (e.target.id === "status-filter") {
    state.filter = e.target.value;
    renderPage();
  }
});
