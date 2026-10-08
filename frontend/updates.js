"use strict";

// Keep only short change fingerprints in browser storage, never record contents.
const updateSources = {
  dashboard: ["activities", "enrollments", "bookings", "requests", "care", "skills", "practice", "products", "gardens"],
  calendar: ["activities", "enrollments", "bookings", "visits", "care"],
  enrollments: ["enrollments", "activities"],
  notifications: ["reports", "requests", "care", "bookings", "incidents"],
  journey: ["enrollments", "gardens", "skills", "practice", "products"],
  basic_health: ["residents", "vitals", "medications", "meals"],
  analytics: ["bookings", "payments", "rooms"],
  impact: ["activities", "enrollments", "products", "tour_bookings"],
};
let updateAccountId = "";
let seenVersions = {};
let currentVersions = {};
let unreadPages = new Set();

function updateStorageKey() {
  return `wf_seen_updates_${state.user.id}`;
}
function fingerprint(value) {
  const source = JSON.stringify(value);
  let first = 2166136261;
  let second = 5381;
  for (let i = 0; i < source.length; i++) {
    first = Math.imul(first ^ source.charCodeAt(i), 16777619);
    second = Math.imul(second, 33) ^ source.charCodeAt(i);
  }
  return `${source.length}:${(first >>> 0).toString(36)}:${(second >>> 0).toString(36)}`;
}
function pageUpdateSources(page) {
  if (page === "basic-health") return updateSources.basic_health;
  return updateSources[page] || (kinds.includes(page) ? [page] : page === "users" || page === "audit" ? [page] : []);
}
function saveSeenVersions() {
  try { localStorage.setItem(updateStorageKey(), JSON.stringify(seenVersions)); } catch {}
}
function syncUpdateMarks() {
  if (!state.user) return;
  const accountId = state.user.id;
  const firstLoad = updateAccountId !== accountId;
  if (firstLoad) {
    updateAccountId = accountId;
    try {
      const stored = JSON.parse(localStorage.getItem(updateStorageKey()) || "null");
      seenVersions = stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
    }
    catch { seenVersions = {}; }
  }
  const pages = [...new Set(navigationGroups().flatMap((group) => group.links.map((link) => link.id)))];
  const sources = [...new Set(pages.flatMap(pageUpdateSources))];
  const hashes = Object.fromEntries(sources.map((kind) => [kind, fingerprint(kind === "users" ? state.users : kind === "audit" ? state.audit : data(kind))]));
  currentVersions = Object.fromEntries(pages.filter((page) => pageUpdateSources(page).length)
    .map((page) => [page, fingerprint(pageUpdateSources(page).map((kind) => hashes[kind]))]));
  let changed = false;
  for (const [page, version] of Object.entries(currentVersions)) {
    if (!(page in seenVersions)) {
      seenVersions[page] = version;
      changed = true;
    }
  }
  if (changed) saveSeenVersions();
  unreadPages = new Set(Object.keys(currentVersions).filter((page) => seenVersions[page] !== currentVersions[page]));
  renderUpdateMarks();
}
function markPageRead(page) {
  if (!state.user || !currentVersions[page]) return;
  if (seenVersions[page] !== currentVersions[page]) {
    seenVersions[page] = currentVersions[page];
    saveSeenVersions();
  }
  unreadPages.delete(page);
  renderUpdateMarks();
}
function renderUpdateMarks() {
  document.querySelectorAll(".project-function-items [data-page], .project-mobile-panel [data-page], #sidebar nav [data-page]").forEach((button) => {
    const unread = unreadPages.has(button.dataset.page);
    let dot = button.querySelector(".update-dot");
    if (unread && !dot) {
      dot = document.createElement("span");
      dot.className = "update-dot";
      dot.setAttribute("role", "img");
      dot.setAttribute("aria-label", t("Có cập nhật mới"));
      button.append(dot);
    } else if (!unread) dot?.remove();
  });
  document.querySelectorAll(".project-function-menu, .project-mobile-panel section, .admin-nav-group").forEach((group) => {
    const header = group.matches(".project-function-menu") ? group.querySelector("summary") : group.querySelector("h2");
    const hasUnread = [...group.querySelectorAll("[data-page]")].some((button) => unreadPages.has(button.dataset.page));
    let dot = header?.querySelector(".update-group-dot");
    if (hasUnread && header && !dot) {
      dot = document.createElement("span");
      dot.className = "update-group-dot";
      dot.setAttribute("aria-hidden", "true");
      header.append(dot);
    } else if (!hasUnread) dot?.remove();
  });
  const mobileSummary = document.querySelector(".project-mobile-nav > summary");
  if (mobileSummary) {
    const hasUnread = !!document.querySelector(".project-mobile-panel .update-dot");
    let dot = mobileSummary.querySelector(".update-group-dot");
    if (hasUnread && !dot) {
      dot = document.createElement("span");
      dot.className = "update-group-dot";
      dot.setAttribute("aria-hidden", "true");
      mobileSummary.append(dot);
    } else if (!hasUnread) dot?.remove();
  }
}
window.addEventListener("storage", (event) => {
  if (!state.user || event.key !== updateStorageKey()) return;
  try {
    const stored = JSON.parse(event.newValue || "null");
    seenVersions = stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
  } catch { return; }
  unreadPages = new Set(Object.keys(currentVersions).filter((page) => seenVersions[page] !== currentVersions[page]));
  renderUpdateMarks();
});
