"use strict";
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const money = (v) => Number(v || 0).toLocaleString("vi-VN") + " ₫";
const day = (v) =>
  v
    ? new Date(v.length === 10 ? v + "T12:00:00" : v).toLocaleDateString(
        "vi-VN",
      )
    : "—";
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const roleNames = {
  FAMILY: "Gia đình",
  SENIOR: "Học viên cao tuổi",
  EXPERT: "Chuyên gia",
  RECEPTION: "Lễ tân",
  NURSE: "Điều dưỡng",
  DOCTOR: "Bác sĩ",
  ACCOUNTANT: "Kế toán",
  MANAGER: "Quản lý",
  ADMIN: "Quản trị viên",
};
const state = {
  user: null,
  csrf: "",
  page: "dashboard",
  data: {},
  users: [],
  audit: [],
  query: "",
  filter: "",
  medicationView: "medications",
  month: new Date().getMonth(),
  year: new Date().getFullYear(),
};
const kinds = [
  "residents",
  "bookings",
  "packages",
  "rooms",
  "care",
  "vitals",
  "medications",
  "doses",
  "meals",
  "incidents",
  "requests",
  "visits",
  "activities",
  "enrollments",
  "shifts",
  "handoffs",
  "reports",
  "payments",
];
const names = {
  residents: "Hồ sơ người lưu trú",
  bookings: "Đặt lịch & lưu trú",
  packages: "Gói dịch vụ",
  rooms: "Phòng & sức chứa",
  care: "Kế hoạch chăm sóc",
  vitals: "Chỉ số sức khỏe",
  medications: "Thuốc & chỉ định",
  doses: "Nhật ký dùng thuốc",
  meals: "Dinh dưỡng",
  incidents: "Sự cố & hỗ trợ",
  requests: "Yêu cầu gia đình",
  visits: "Lịch thăm",
  activities: "Hoạt động nông trại",
  enrollments: "Đăng ký hoạt động",
  shifts: "Phân ca nhân sự",
  handoffs: "Bàn giao ca",
  reports: "Báo cáo chăm sóc",
  payments: "Thu chi & đối soát",
};
const permissions = {
  residents: ["FAMILY", "RECEPTION", "NURSE", "DOCTOR", "MANAGER"],
  bookings: ["FAMILY", "RECEPTION", "MANAGER"],
  packages: ["RECEPTION", "MANAGER"],
  rooms: ["RECEPTION", "MANAGER"],
  care: ["NURSE", "DOCTOR", "MANAGER"],
  vitals: ["NURSE", "DOCTOR", "MANAGER"],
  medications: ["DOCTOR", "MANAGER"],
  doses: ["NURSE", "DOCTOR", "MANAGER"],
  meals: ["NURSE", "DOCTOR", "MANAGER"],
  incidents: ["RECEPTION", "NURSE", "DOCTOR", "MANAGER"],
  requests: ["FAMILY", "RECEPTION", "NURSE", "DOCTOR", "MANAGER"],
  visits: ["FAMILY", "RECEPTION", "MANAGER"],
  activities: ["RECEPTION", "NURSE", "DOCTOR", "MANAGER"],
  enrollments: ["FAMILY", "RECEPTION", "NURSE", "DOCTOR", "MANAGER"],
  shifts: ["MANAGER"],
  handoffs: ["NURSE", "DOCTOR", "MANAGER"],
  reports: ["NURSE", "DOCTOR", "MANAGER"],
  payments: ["ACCOUNTANT", "MANAGER"],
};
const can = (kind) => state.user?.role === "ADMIN" || (permissions[kind] || []).includes(state.user?.role);
const isLearner = () => ["FAMILY", "SENIOR"].includes(state.user?.role);
for (const kind of ["residents", "bookings", "requests", "visits", "enrollments"]) permissions[kind].push("SENIOR");
permissions.activities.push("EXPERT");
permissions.enrollments.push("EXPERT");
const learningKinds = ["gardens", "skills", "practice", "products", "tour_bookings", "expert_applications"];
kinds.push(...learningKinds);
Object.assign(names, { activities: "Workshop & Talkshow", enrollments: "Đăng ký workshop", gardens: "Vườn riêng & câu chuyện", skills: "Kỹ năng đã học", practice: "Nhật ký thực hành", products: "Sản phẩm học viên", tour_bookings: "Đặt tham quan vườn", expert_applications: "Hồ sơ chuyên gia" });
for (const kind of learningKinds) permissions[kind] = ["FAMILY", "SENIOR", "EXPERT", "MANAGER"];
kinds.push("attachments");
names.attachments = "Hồ sơ đính kèm";
permissions.attachments = ["FAMILY", "RECEPTION", "NURSE", "DOCTOR", "MANAGER"];
permissions.attachments.push("SENIOR");
const data = (kind) => state.data[kind] || [];
const lookup = (kind, id) => data(kind).find((x) => x.id === id);
const residentName = (id) =>
  lookup("residents", id)?.name || "Hồ sơ được liên kết";
const tag = (value) =>
  `<span class="tag ${["Đã hủy", "Khẩn cấp", "Bỏ lỡ", "Từ chối"].includes(value) ? "danger" : ["Chờ duyệt", "Chờ xử lý", "Đang xử lý", "Cần theo dõi"].includes(value) ? "warn" : ""}">${esc(value || "—")}</span>`;
let toastTimer;
function toast(message, error = false) {
  const el = $("#toast");
  el.textContent = message;
  el.className = "show" + (error ? " error" : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.className = ""), 4500);
}
async function api(path, method = "GET", body) {
  const response = await fetch("/api/" + path, {
    method,
    credentials: "same-origin",
    headers: body
      ? { "Content-Type": "application/json", "X-CSRF-Token": state.csrf }
      : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "Không thể kết nối máy chủ.");
  return result;
}
async function refresh() {
  const results = await Promise.all(
    kinds.map(async (kind) => [kind, await api(kind)]),
  );
  const demo = state.data.demo;
  state.data = Object.fromEntries(results);
  state.data.demo = demo;
  state.public = await api("public");
  if (["MANAGER", "ADMIN"].includes(state.user.role))
    [state.users, state.audit] = await Promise.all([
      api("users"),
      api("audit"),
    ]);
  else {
    state.users = [];
    state.audit = [];
  }
}
