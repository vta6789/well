function actionButton(label, action, id = "", cls = "secondary compact") {
  return `<button class="btn ${cls}" data-action="${esc(action)}" data-id="${esc(id)}">${esc(t(label))}</button>`;
}
let modalTrigger;
function closeModal() {
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
    closeModal();
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
