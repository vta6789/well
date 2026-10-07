"use strict";
Object.assign(labels, { focus: "Vườn / sản phẩm chủ đạo", story: "Câu chuyện", topic: "Chủ đề", format: "Hình thức", fitness: "Mức vận động", expert_id: "Chuyên gia", publication: "Trạng thái công khai", public_consent: "Đồng ý công khai", result: "Kết quả thực hành", quantity: "Số lượng", unit: "Đơn vị", guests: "Số khách", contact: "Liên hệ", specialty: "Chuyên môn", bio: "Kinh nghiệm", verified_by: "Chuyên gia xác nhận" });

function renderRecordFields(fields, values, kind) {
  if (kind !== "residents") return fields.map((f) => fieldHTML(f, values)).join("");
  const optional = ["health", "allergies", "diet", "mobility", "emergency", "consent"];
  return fields.filter((f) => !optional.includes(f.key)).map((f) => fieldHTML(f, values)).join("") + `<details class="learning-health-fields wide"><summary>${esc(t("Sức khỏe cơ bản · tùy chọn"))}</summary><p class="small muted">${esc(t("Chỉ ghi thông tin cần thiết để hỗ trợ thể trạng. Nội dung này không được công khai trên trang Nghệ nhân bạc."))}</p>${fields.filter((f) => optional.includes(f.key)).map((f) => fieldHTML(f, values)).join("")}</details>`;
}

function learningNavigation(role) {
  const groups = [
    { title: "Tổng quan", links: [["dashboard", "◫", "Bảng điều hành"], ["notifications", "◎", "Thông báo & nhắc việc"]] },
    { title: "Học & thực hành", links: [["activities", "❧", "Workshop & Talkshow"], ["enrollments", "♧", "Đăng ký workshop"], ["journey", "↗", "Hành trình giá trị"], ["gardens", "♧", "Vườn riêng & câu chuyện"], ["skills", "✓", "Kỹ năng đã học"], ["practice", "▤", "Nhật ký thực hành"], ["products", "◇", "Sản phẩm học viên"], ...(["ADMIN", "MANAGER", "EXPERT"].includes(role) ? [["impact", "▥", "Bảng tác động"]] : [])] },
    { title: role === "FAMILY" ? "Lưu trú" : "Trải nghiệm", links: [["residents", "♡", "Hồ sơ người học"], ["packages", "◇", "Đăng ký online"], ["bookings", "⌂", "Lưu trú của tôi"], ["tour_bookings", "⌂", "Đặt tham quan vườn"], ["requests", "✉", "Yêu cầu hỗ trợ"], ["expert_applications", "♙", "Đăng ký làm chuyên gia"]] },
  ];
  if (role === "EXPERT") groups.splice(2, 1);
  if (["SENIOR", "FAMILY"].includes(role)) groups.push({ title: "Tùy chọn", links: [["basic-health", "♡", "Sức khỏe cơ bản"]] });
  return groups.map((group) => ({ ...group, links: group.links.map(([id, icon, label]) => ({ id, icon, label })) }));
}

function learningSchema(kind, old) {
  const profile = F("resident", "Người học", "select", { required: true, options: data("residents").map((r) => [r.id, r.name]) });
  const title = F("title", "Tiêu đề", "text", { required: true });
  const notes = F("notes", "Ghi chú", "textarea", { wide: true });
  const moderator = ["ADMIN", "MANAGER"].includes(state.user.role);
  const publication = moderator ? [F("publication", "Trạng thái công khai", "select", { options: ["Chờ duyệt", "Đã duyệt", "Ẩn"] })] : [];
  const consent = F("public_consent", "Tôi đồng ý công khai nội dung này trên trang Nghệ nhân bạc.", "checkbox", { wide: true });
  const schemas = {
    gardens: [profile, F("name", "Tên nghệ nhân / tên hiển thị", "text", { required: true }), F("focus", "Vườn / sản phẩm chủ đạo", "text", { required: true }), F("focus_en", "Vườn / sản phẩm chủ đạo tiếng Anh (tùy chọn)"), F("story_en", "Câu chuyện tiếng Anh (tùy chọn)", "textarea", { wide: true }), F("location", "Khu vườn / vị trí"), F("story", "Câu chuyện của tôi", "textarea", { wide: true }), ...(state.user.role === "EXPERT" ? [] : [consent]), ...publication],
    skills: [profile, title, F("activity_id", "Workshop đã đăng ký", "select", { required: true, options: data("activities").map((a) => [a.id, a.name]) }), F("status", "Xác nhận kỹ năng", "select", { options: isLearner() ? ["Chờ xác nhận"] : ["Chờ xác nhận", "Đã học"] }), notes],
    practice: [profile, title, F("date", "Ngày thực hành", "date", { required: true, value: today() }), F("notes", "Tôi đã thực hành gì?", "textarea", { required: true, wide: true }), F("result", "Kết quả / bài học", "textarea", { wide: true })],
    products: [profile, F("name_en", "Tên tiếng Anh (tùy chọn)"), F("description_en", "Mô tả tiếng Anh (tùy chọn)", "textarea", { wide: true }), F("name", "Tên sản phẩm", "text", { required: true }), F("description", "Sản phẩm được tạo ra như thế nào?", "textarea", { required: true, wide: true }), F("quantity", "Số lượng", "number", { min: 1, max: 100000, required: true, value: 1 }), F("unit", "Đơn vị", "text", { required: true, placeholder: "Chậu, bó, sản phẩm…" }), ...(state.user.role === "EXPERT" ? [] : [consent]), ...publication],
    tour_bookings: [F("artisan_id", "Nghệ nhân / vườn tham quan", "select", { required: true, options: (state.public?.artisans || []).map((a) => [a.id, a.name + " · " + a.focus]) }), F("date", "Ngày mong muốn", "date", { required: true, min: old.id ? undefined : today(), value: today() }), F("guests", "Số khách", "number", { required: true, min: 1, max: 50, value: 1 }), F("contact", "Thông tin liên hệ", "text", { required: true, value: state.user.email }), notes, ...(moderator ? [F("status", "Trạng thái", "select", { options: ["Chờ duyệt", "Đã xác nhận", "Đã tham quan", "Đã hủy"] }), F("response", "Phản hồi cho khách", "textarea", { wide: true })] : [])],
    expert_applications: [F("specialty", "Chuyên môn muốn chia sẻ", "text", { required: true }), F("bio", "Kinh nghiệm và đề xuất workshop", "textarea", { required: true, wide: true }), ...(moderator ? [F("status", "Duyệt hồ sơ chuyên gia", "select", { options: ["Chờ duyệt", "Đã duyệt", "Từ chối"] }), F("response", "Phản hồi", "textarea", { wide: true })] : [])],
  };
  return schemas[kind];
}

function workshopCard(workshop, publicView = false) {
  const open = workshop.active !== false && workshop.date >= today();
  const eligible = state.user?.role !== "EXPERT" || (!publicView && workshop.expert_id === state.user.id);
  const occupied = data("enrollments").filter((e) => e.activity_id === workshop.id && !["Đã hủy", "Danh sách chờ"].includes(e.status)).length;
  const remaining = workshop.remaining ?? Math.max(0, workshop.capacity - occupied);
  const expert = workshop.expert_name || state.public?.experts?.find((e) => e.id === workshop.expert_id)?.name || workshop.assignee || "Chưa phân công";
  return `<article class="card learning-workshop"><div class="row between">${tag(workshop.topic || "Nông nghiệp")}<span class="small muted">${esc(t(workshop.format || "Workshop"))}</span></div><h3>${esc(localized(workshop))}</h3><p class="small muted">${esc(localized(workshop, "description"))}</p><div class="learning-workshop-meta"><span>♙ ${esc(expert)}</span><span>◷ ${day(workshop.date)} · ${esc(workshop.time || "Đang cập nhật")}</span><span>♡ ${esc(t(workshop.fitness || "Nhẹ nhàng"))} · ${esc(workshop.location)}</span><span>${remaining ? t("Còn {count} chỗ", { count: remaining }) : t("Đủ chỗ · nhận danh sách chờ")} · <strong>${esc(t("Đã gồm trong gói"))}</strong></span></div><div class="row section-title">${(publicView || can("enrollments")) && open && eligible ? actionButton(remaining ? "Đăng ký tham gia" : "Vào danh sách chờ", "learning-enroll", workshop.id, remaining ? "" : "secondary") : ""}${!publicView && can("activities") ? recordButtons("activities", workshop) : ""}</div></article>`;
}

function learningSprig() {
  return `<svg class="learning-sprig" viewBox="0 0 180 280" fill="none" aria-hidden="true" focusable="false"><path d="M86 265C97 192 72 109 115 18M94 214C57 208 33 181 31 153C69 158 91 183 94 214ZM93 160C133 157 153 132 154 105C118 111 96 134 93 160ZM93 112C58 107 39 82 40 58C71 66 89 85 93 112ZM105 61C130 62 149 43 154 20C125 22 109 38 105 61Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function learningEmpty(title, description) {
  return `<div class="learning-empty"><div class="learning-empty-art" aria-hidden="true"><span></span><i class="fa-solid fa-seedling"></i><span></span></div><div><span class="learning-kicker">${esc(t("MỘT HÀNH TRÌNH ĐANG NẢY MẦM"))}</span><h3>${esc(t(title))}</h3><p>${esc(t(description))}</p></div><div class="learning-empty-topics">${[["seedling", "Nông nghiệp"], ["heart", "Sức khỏe"], ["laptop", "Số hóa"]].map(([icon, topic]) => `<button data-action="learning-topic" data-id="${topic}"><i class="fa-solid fa-${icon}" aria-hidden="true"></i>${esc(t(topic))}</button>`).join("")}</div></div>`;
}

const planLabels = { day: "Gói Ngày", week: "Gói Tuần", month: "Gói Tháng" };
const priorityLabels = ["Tiêu chuẩn", "Ưu tiên", "Cao nhất"];
function careBenefits(tier) {
  const base = ["Sàng lọc huyết áp & nhịp tim", "Đồ ăn & nước uống"];
  if (tier === "week") base.push("2 lần/ngày trong 7 ngày", "Tư vấn dinh dưỡng", "Ưu tiên đặt lịch");
  if (tier === "month") base.push("Chuyên gia khám định kỳ", "Tư vấn dinh dưỡng mỗi tuần", "Ưu tiên đặt lịch cao nhất", "Ưu tiên xử lý hồ sơ");
  return base;
}
function packagePriority(record) { return Number(record.service_priority || 0); }
function priorityOrder(a, b) {
  return packagePriority(b) - packagePriority(a) || a.created_at.localeCompare(b.created_at);
}
function casePriority(record) {
  return Math.max(0, ...data("bookings").filter((b) => b.resident === record.resident && ["Đã xác nhận", "Đang lưu trú"].includes(b.status) && b.end >= today()).map((b) => b.health_tier === "month" ? 2 : 0));
}
function requestPriorityOrder(a, b) {
  const urgent = (r) => ({ "Khẩn cấp": 2, "Cao": 1 }[r.priority] || 0);
  return urgent(b) - urgent(a) || casePriority(b) - casePriority(a) || a.created_at.localeCompare(b.created_at);
}
function priorityBadge(record, label = "Ưu tiên đặt lịch") {
  return `<span class="tag priority-badge">${esc(t(label))}: ${esc(t(priorityLabels[packagePriority(record)] || priorityLabels[0]))}</span>`;
}
function onlineRegistration(packages) {
  const sorted = packages.filter((p) => p.active).sort((a, b) => a.days - b.days);
  const rows = [
    ["Sàng lọc huyết áp & nhịp tim", "Bao gồm", "Bao gồm", "Bao gồm"],
    ["Đồ ăn & nước uống", "Bao gồm", "Bao gồm", "Bao gồm"],
    ["Theo dõi chỉ số", "Sàng lọc cơ bản", "2 lần/ngày trong 7 ngày", "Theo lịch chuyên gia"],
    ["Tư vấn dinh dưỡng", "Chưa bao gồm", "Có tư vấn", "Mỗi tuần"],
    ["Chuyên gia khám định kỳ", "Chưa bao gồm", "Chưa bao gồm", "Theo lịch chuyên gia"],
    ["Ưu tiên đặt lịch", "Tiêu chuẩn", "Ưu tiên", "Cao nhất"],
    ["Ưu tiên xử lý hồ sơ", "Tiêu chuẩn", "Tiêu chuẩn", "Cao nhất"],
  ];
  return `<section class="learning-section online-registration"><span class="learning-kicker">${esc(t("CHUẨN BỊ CHO CHUYẾN ĐI"))}</span><h1>${esc(t("Đăng ký online tại Wellness Farm"))}</h1><p class="muted registration-intro">${esc(t("Chọn gói Ngày, Tuần hoặc Tháng. Cả ba cùng có quyền tham gia trải nghiệm, workshop và talkshow; khác nhau về chăm sóc sức khỏe và mức ưu tiên."))}</p>
    <div class="registration-shared"><h2>${esc(t("Quyền lợi chung"))}</h2><div>${[["seedling", "Trải nghiệm tại nông trại"], ["graduation-cap", "Tham gia workshop"], ["microphone", "Tham gia talkshow"]].map(([icon, label]) => `<span><i class="fa-solid fa-${icon}" aria-hidden="true"></i>${esc(t(label))}</span>`).join("")}</div></div>
    <div class="grid three">${sorted.map((p) => `<article class="card learning-package ${p.health_tier === "week" ? "package-recommended" : ""}">${tag(t(priorityLabels[{day:0,week:1,month:2}[p.health_tier] || 0]))}<h2>${esc(localized(p))}</h2><div class="registration-price">${money(p.price)}<span> / ${esc(t(p.days + " ngày"))}</span></div><p class="muted">${esc(localized(p, "description"))}</p><ul class="registration-benefits">${careBenefits(p.health_tier).map((benefit) => `<li><i class="fa-solid fa-check" aria-hidden="true"></i>${esc(t(benefit))}</li>`).join("")}</ul>${actionButton("Đăng ký gói này", "learning-package", p.id, "")}</article>`).join("")}</div>
    <section class="registration-comparison"><h2>${esc(t("So sánh chăm sóc sức khỏe"))}</h2><div class="registration-table-scroll" tabindex="0" role="region" aria-label="${esc(t("So sánh chăm sóc sức khỏe"))}"><table><thead><tr>${["Quyền lợi", "Gói Ngày", "Gói Tuần", "Gói Tháng"].map((label) => `<th scope="col">${esc(t(label))}</th>`).join("")}</tr></thead><tbody>${rows.map(([label, ...values]) => `<tr><th scope="row">${esc(t(label))}</th>${values.map((value) => `<td>${esc(t(value))}</td>`).join("")}</tr>`).join("")}</tbody></table></div><p class="small muted">${esc(t("Lịch chăm sóc và chuyên gia được đội ngũ xác nhận khi tiếp nhận đăng ký."))}</p></section></section>`;
}

function learningLanding(view = "home") {
  const publicData = state.public || state.data;
  const workshopList = publicData.workshops || [];
  const artisans = publicData.artisans || [];
  const impact = publicData.impact || {};
  const links = [["home", "Trang chủ"], ["workshops", "Workshop"], ["artisans", "Nghệ nhân bạc"], ["packages", "Đăng ký online"]];
  let content = "";
  if (view === "home") {
    content = `<section class="learning-hero"><div class="learning-hero-copy"><span class="learning-kicker">${esc(t("LÀNG SỨC KHỎE BÌNH MỸ"))}</span><h1>${esc(t("Đến để học."))}<br>${esc(t("Ở lại để"))} <em>${esc(t("tạo giá trị."))}</em></h1><p>${esc(t("Chuyên gia chia sẻ kinh nghiệm. Người cao tuổi học, thực hành và tạo sản phẩm của riêng mình. Du khách đến để học hỏi và kết nối."))}</p><div class="row">${actionButton("Xem lịch workshop", "learning-public", "workshops", "")}${actionButton("Chọn gói & đăng ký", "learning-public", "packages", "secondary")}</div><p class="learning-free-note"><i class="fa-solid fa-seedling" aria-hidden="true"></i>${esc(t("Hoạt động, workshop và talkshow có trong cả ba gói."))}</p><button class="learning-discover" data-action="learning-discover"><span aria-hidden="true">↓</span>${esc(t("Khám phá hành trình"))}</button></div><figure class="learning-hero-visual">${learningSprig()}<div class="learning-photo-frame"><img src="/assets/images/farm.jpg" alt="${esc(t("Không gian xanh để học tập và thực hành tại nông trại"))}" width="700" height="500"><span class="learning-photo-location"><i class="fa-solid fa-location-dot" aria-hidden="true"></i>${esc(t("Bình Mỹ · Một miền xanh"))}</span></div><div class="learning-floating-note"><span aria-hidden="true">❧</span><div>${esc(t("Gieo một kỹ năng."))}<br><strong>${esc(t("Gặt một hành trình."))}</strong></div></div><figcaption class="learning-photo-caption"><span aria-hidden="true">✦</span>${esc(t("Cho những khởi đầu mới"))}</figcaption></figure></section>
    <section class="learning-value-chain" aria-label="Vòng giá trị 5 bước">${[["microphone", "Chuyên gia chia sẻ"], ["graduation-cap", "Người cao tuổi học"], ["seedling", "Thực hành tại vườn"], ["box", "Tạo sản phẩm"], ["users", "Du khách kết nối"]].map(([icon, label], i) => `<article><span class="learning-step">0${i + 1}</span><i class="fa-solid fa-${icon}" aria-hidden="true"></i><strong>${esc(t(label))}</strong></article>`).join("")}</section>
    <section class="learning-section"><div class="learning-section-head"><div><span class="learning-kicker">${esc(t("HỌC CÙNG NHAU"))}</span><h2>${esc(t("Workshop & Talkshow sắp tới"))}</h2></div>${actionButton("Xem lịch đầy đủ", "learning-public", "workshops")}</div>${workshopList.length ? `<div class="grid three">${workshopList.slice(0, 3).map((w) => workshopCard(w, true)).join("")}</div>` : learningEmpty("Lịch workshop đang được cập nhật", "Bạn có chuyên môn muốn chia sẻ? Gửi hồ sơ để cùng xây dựng cộng đồng học tập.")}</section>
    <section class="learning-invitation"><div><h2>${esc(t("Kinh nghiệm của bạn có thể mở ra một hành trình mới."))}</h2><p>${esc(t("Đồng hành cùng người cao tuổi trong nông nghiệp, sức khỏe, số hóa và thủ công."))}</p></div>${actionButton("Đăng ký làm chuyên gia", "learning-expert", "", "")}</section>`;
  } else if (view === "workshops") {
    content = `<section class="learning-section"><div class="learning-section-head"><div><span class="learning-kicker">${esc(t("HỌC – THỰC HÀNH – KẾT NỐI"))}</span><h1>${esc(t("Lịch workshop và talkshow"))}</h1><p class="muted">${esc(t("Chọn chủ đề và mức vận động phù hợp. Các hoạt động có trong tất cả gói đăng ký."))}</p></div>${actionButton("Đăng ký làm chuyên gia", "learning-expert")}</div><div class="learning-topic-filter">${["Tất cả", "Nông nghiệp", "Sức khỏe", "Số hóa", "Thủ công"].map((topic) => `<button class="btn ${(!state.workshopTopic && topic === "Tất cả") || state.workshopTopic === topic ? "" : "secondary"}" data-action="learning-topic" data-id="${esc(topic)}">${esc(t(topic))}</button>`).join("")}</div><div class="grid three">${workshopList.filter((w) => !state.workshopTopic || w.topic === state.workshopTopic).map((w) => workshopCard(w, true)).join("")}</div>${!workshopList.filter((w) => !state.workshopTopic || w.topic === state.workshopTopic).length ? learningEmpty("Chưa có lịch cho chủ đề này", "Quay lại để xem các buổi học mới được chuyên gia và quản trị viên cập nhật.") : ""}</section>`;
  } else if (view === "artisans") {
    content = `<section class="learning-section"><span class="learning-kicker">${esc(t("MỖI NGƯỜI MỘT HÀNH TRÌNH"))}</span><h1>${esc(t("Nghệ nhân bạc và sản phẩm của họ"))}</h1><p class="muted">${esc(t("Những khu vườn, kỹ năng và câu chuyện được học viên đồng ý chia sẻ."))}</p><div class="grid three">${artisans.map((a) => `<article class="card learning-artisan"><span class="avatar">${esc(a.name.slice(0, 1))}</span><h2>${esc(a.name)}</h2><p class="small">${esc(localized(a, "focus"))}</p>${tag(t("{count} kỹ năng đã học", { count: a.skills_count }))}<p class="muted small">${esc(localized(a, "story"))}</p>${a.products.length ? `<h3>${esc(t("Sản phẩm từ hành trình học"))}</h3><ul>${a.products.map((p) => `<li><strong>${esc(localized(p))}</strong> · ${p.quantity} ${esc(p.unit)}<p class="small muted">${esc(localized(p, "description"))}</p></li>`).join("")}</ul>` : ""}${actionButton("Đặt tham quan vườn", "learning-tour", a.id, "secondary")}</article>`).join("")}</div>${!artisans.length ? learningEmpty("Các câu chuyện đang được vun đắp", "Hồ sơ và sản phẩm chỉ xuất hiện khi học viên đồng ý công khai và quản trị viên đã duyệt.") : ""}</section>${publicImpact(impact)}`;
  } else if (view === "project") {
    content = `<section class="learning-section"><span class="learning-kicker">WELLNESS FARM</span><h1>${esc(t("Nền tảng học – làm – du lịch"))}</h1><p>${esc(t("Chúng tôi kết nối kinh nghiệm của chuyên gia với khả năng sáng tạo của người cao tuổi. Mỗi buổi học dẫn đến thực hành, mỗi sản phẩm kể một câu chuyện, mỗi chuyến tham quan tạo thêm kết nối."))}</p><div class="grid two"><article class="card"><h2>${esc(t("SDG 4 · Học tập suốt đời"))}</h2><p>${esc(t("Workshop và hoạt động thực hành phù hợp nhiều mức thể trạng, có trong cả ba gói."))}</p></article><article class="card"><h2>${esc(t("SDG 8 · Tạo giá trị"))}</h2><p>${esc(t("Ghi nhận kỹ năng, giới thiệu sản phẩm và kết nối du khách với người tạo ra chúng."))}</p></article></div></section>${projectCredits()}${publicImpact(impact)}`;
  } else {
    content = onlineRegistration(publicData.packages || []);
  }
  state.publicView = view;
  const markup = `<div class="original-site learning-public"><header class="learning-public-header"><button class="learning-logo" data-action="learning-public" data-id="home"><i class="fa-solid fa-leaf" aria-hidden="true"></i> Wellness Farm</button><nav aria-label="${esc(t("Điều hướng chính"))}">${links.map(([id, label]) => `<button data-action="learning-public" data-id="${id}" ${view === id ? 'aria-current="page"' : ""}>${esc(t(label))}</button>`).join("")}<button data-action="learning-public" data-id="project">${esc(t("Về dự án"))}</button></nav><div id="navAuthArea">${languageSwitch()}${state.user ? actionButton(state.user.role === "ADMIN" ? "Trang quản trị" : "Trang của tôi", "learning-dashboard", "", "") : `${actionButton("Đăng nhập", "login", "", "secondary")}${actionButton("Tạo tài khoản", "register", "", "")}`}</div><div class="learning-scroll-progress" aria-hidden="true"></div></header><main id="main" class="learning-public-main">${state.data.demo ? '<div class="notice">${esc(t("DỮ LIỆU DEMO · Số liệu và câu chuyện minh họa."))}</div>' : ""}${content}</main><footer class="learning-public-footer"><strong>❧ Wellness Farm · Bình Mỹ</strong>${projectCredits()}<p>${esc(t("Học cùng nhau. Tạo giá trị cùng nhau. Khám phá Wellness Farm."))}</p>${actionButton("Đăng ký học viên cao tuổi", "learning-senior", "", "secondary")}</footer></div>`;
  return presentExperience(() => {
    $("#app").innerHTML = markup;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    enhanceExperience($("#main"));
    updateScrollProgress();
  });
}

function publicImpact(impact) {
  return `<section class="learning-section"><span class="learning-kicker">SDG 4 & SDG 8</span><h2>${esc(t("Bảng tác động"))}</h2><p class="muted small">${esc(t("Số liệu từ hệ thống; học viên tính theo hồ sơ đã đăng ký hoặc tham gia workshop, lượt khách chỉ tính chuyến đã tham quan."))}</p><div class="grid four">${metric("Workshop tháng này", impact.workshops_month || 0, "Lịch trong tháng")}${metric("Người học", impact.learners || 0, "Hồ sơ tham gia không trùng lặp")}${metric("Sản phẩm tạo ra", impact.products || 0, "Bản ghi sản phẩm được ghi nhận")}${metric("Lượt khách", impact.visitors || 0, "Số người đã tham quan")}</div><p class="small muted section-title">${esc(t("Hoạt động giống nhau · Chăm sóc khác nhau theo gói."))}</p></section>`;
}

function learningListPage(kind) {
  const records = filtered(kind);
  const descriptions = { gardens: "Vườn riêng, câu chuyện và lựa chọn công khai của từng học viên.", skills: "Ghi nhận kỹ năng từ workshop; chuyên gia xác nhận kết quả học tập.", practice: "Nhật ký quá trình làm, kết quả và bài học của mỗi người.", products: "Thư viện sản phẩm từ hành trình học; công khai khi có đồng ý và được duyệt.", tour_bookings: "Yêu cầu tham quan; chỉ tính lượt khách sau khi hoàn tất chuyến tham quan.", expert_applications: "Chuyên môn, đề xuất buổi học và quy trình duyệt của quản trị viên." };
  let rowsHTML = records.map((r) => {
    const author = state.users.find((u) => u.id === r.owner)?.name || (r.owner === state.user.id ? state.user.name : "Người gửi");
    return `<article class="card"><div class="row between">${tag(r.publication || r.status || day(r.date))}<span class="small muted">${esc(r.resident ? residentName(r.resident) : author)}</span></div><h2 class="section-title">${esc(r.name || r.title || r.specialty || state.public?.artisans?.find((a) => a.id === r.artisan_id)?.name || "Yêu cầu tham quan")}</h2><p class="small muted">${esc(r.story || r.description || r.notes || r.bio || "")}</p>${r.activity_id ? `<p class="small">Workshop: ${esc(lookup("activities", r.activity_id)?.name)}<br>${esc(r.verified_by || "")}</p>` : ""}${r.result ? `<p>${esc(r.result)}</p>` : ""}${r.quantity ? `<p>${r.quantity} ${esc(r.unit)}</p>` : ""}${r.guests ? `<p>${day(r.date)} · ${esc(t("{count} khách", { count: r.guests }))}</p>` : ""}${r.response ? `<div class="notice section-title">${esc(r.response)}</div>` : ""}${["gardens", "products"].includes(kind) ? `<p class="small">${esc(t(r.public_consent ? "Đã đồng ý công khai" : "Nội dung riêng tư"))}</p>` : ""}${recordButtons(kind, r)}</article>`;
  }).join("");
  const allowCreate = can(kind) && kind !== "skills";
  return header(names[kind], descriptions[kind], allowCreate ? actionButton("+ Tạo mới", "new", kind, "") : "") + controls(kind) + (rowsHTML ? `<div class="grid three">${rowsHTML}</div>` : recordEmpty(kind, allowCreate));
}

function journeyPage() {
  const profiles = data("residents");
  const selected = profiles.find((p) => p.id === state.journeyResident) || profiles[0];
  const forPerson = (kind) => data(kind).filter((r) => r.resident === selected?.id);
  return header("Hành trình giá trị", "Từ điều đã học đến việc đã làm và sản phẩm của riêng mỗi người.") +
    (selected ? `<label class="field learning-profile-picker">${esc(t("Người học"))}<select id="journey-resident">${profiles.map((p) => `<option value="${p.id}" ${p.id === selected.id ? "selected" : ""}>${esc(localized(p))}</option>`).join("")}</select></label><div class="grid four">${metric("Workshop", forPerson("enrollments").filter((r) => r.status !== "Đã hủy").length, "Đăng ký và danh sách chờ")}${metric("Kỹ năng đã học", forPerson("skills").filter((r) => r.status === "Đã học").length, "Đã được chuyên gia xác nhận")}${metric("Lần thực hành", forPerson("practice").length, "Nhật ký đã ghi nhận")}${metric("Sản phẩm", forPerson("products").length, "Thành quả được tạo ra")}</div>${[["gardens", "Vườn riêng & câu chuyện"], ["skills", "Kỹ năng đã học"], ["practice", "Nhật ký thực hành"], ["products", "Sản phẩm tạo ra"]].map(([kind, label]) => `<section class="card section-title"><div class="admin-section-heading"><h2>${esc(t(label))}</h2>${can(kind) ? actionButton("+ Ghi nhận", "learning-new", kind) : ""}</div>${forPerson(kind).length ? forPerson(kind).map((r) => `<article class="admin-inbox-item"><strong>${esc(r.name || r.title)}</strong><p>${esc(r.focus || r.notes || r.description || r.story || "")}</p>${r.status ? tag(r.status) : ""}${recordButtons(kind, r)}</article>`).join("") : `<p class="small muted">${esc(t("Chưa có nội dung được ghi nhận."))}</p>`}</section>`).join("")}` : `<div class="notice">${esc(t("Tạo hồ sơ người học để bắt đầu hành trình."))}</div>${can("residents") ? actionButton("Tạo hồ sơ người học", "new", "residents", "") : ""}`);
}

function learningDashboard() {
  if (state.user.role === "EXPERT") {
    const mine = data("activities").filter((w) => w.expert_id === state.user.id);
    return header("Không gian chuyên gia", "Chia sẻ kiến thức, theo dõi thực hành và xác nhận kỹ năng cho học viên.", actionButton("+ Tạo workshop", "new", "activities", "")) + `<div class="grid three">${metric("Workshop phụ trách", mine.length, "Lịch do bạn tổ chức")}${metric("Học viên", data("residents").length, "Hồ sơ tham gia workshop của bạn")}${metric("Kỹ năng chờ xác nhận", data("skills").filter((r) => r.status === "Chờ xác nhận").length, "Cần được xem xét")}</div><div class="row section-title">${actionButton("Xác nhận kỹ năng", "page-skills")}${actionButton("Hành trình học viên", "page-journey")}${actionButton("Xem trang công khai", "learning-public", "workshops")}</div><div class="grid three section-title">${mine.map((w) => workshopCard(w)).join("")}</div>`;
  }
  return header("Học mỗi ngày. Tạo giá trị mỗi ngày.", t("Xin chào {name}. Chọn hoạt động yêu thích và theo dõi hành trình của bạn.", { name: state.user.name }), actionButton("Xem workshop", "page-activities", "", "")) + `<div class="grid four">${metric("Workshop đã đăng ký", data("enrollments").filter((e) => e.status !== "Đã hủy").length, "Bao gồm danh sách chờ")}${metric("Kỹ năng đã học", data("skills").filter((s) => s.status === "Đã học").length, "Được chuyên gia xác nhận")}${metric("Nhật ký thực hành", data("practice").length, "Việc đã làm và bài học")}${metric("Sản phẩm của tôi", data("products").length, "Thành quả từ hành trình học")}</div><div class="learning-invitation section-title"><div><h2>${esc(t("Hành trình giá trị của bạn"))}</h2><p>${esc(t("Ghi lại vườn riêng, kỹ năng, những lần thực hành và sản phẩm được tạo ra."))}</p></div>${actionButton("Mở hành trình", "page-journey", "", "")}</div><div class="row">${actionButton("Tạo hồ sơ người học", "new", "residents")}${actionButton("Nghệ nhân bạc", "learning-public", "artisans")}${actionButton("Tham quan vườn", "page-tour_bookings")}${actionButton("Đăng ký làm chuyên gia", "learning-expert")}</div>`;
}

function basicHealthPage() {
  return header("Sức khỏe cơ bản", "Thông tin hỗ trợ tùy chọn; không phải điều kiện để tham gia học tập.") + `<div class="card"><h2>${esc(t("Hỗ trợ phù hợp thể trạng"))}</h2><p class="muted">${esc(t("Bạn có thể ghi nhu cầu hỗ trợ trong hồ sơ người học. Dữ liệu chăm sóc đã có vẫn được lưu theo quyền truy cập."))}</p><div class="row">${actionButton("Hồ sơ người học", "page-residents")}${["ADMIN", "MANAGER", "NURSE", "DOCTOR"].includes(state.user.role) || isLearner() ? `${actionButton("Chỉ số sức khỏe", "page-vitals")}${actionButton("Thuốc & chỉ định", "page-medications")}` : ""}</div></div>`;
}

async function learningIntent(action, id) {
  if (!state.user) {
    state.learningIntent = { action, id };
    return authForm();
  }
  if (action === "learning-expert") return editForm("expert_applications");
  if (action === "learning-tour") return editForm("tour_bookings", "", { artisan_id: id });
  if (action === "learning-package") {
    if (!data("residents").length) {
      state.pendingBookingPackage = id;
      return editForm("residents");
    }
    return editForm("bookings", "", { package_id: id });
  }
  if (action === "learning-enroll") {
    if (!can("enrollments")) return toast("Tài khoản này không có quyền đăng ký workshop.", true);
    if (!data("residents").length) {
      state.pendingWorkshop = id;
      toast("Tạo hồ sơ người học trước khi đăng ký workshop.");
      return editForm("residents");
    }
    return editForm("enrollments", "", { activity_id: id, waitlist: (state.public?.workshops?.find((w) => w.id === id)?.remaining || 0) === 0 });
  }
}

async function learningAction(action, id) {
  if (action === "learning-discover") return document.querySelector(".learning-value-chain")?.scrollIntoView({ behavior: motionPreference.matches ? "instant" : "smooth", block: "center" });
  if (action === "learning-public") { state.public = await api("public"); return learningLanding(id); }
  if (action === "learning-topic") { state.workshopTopic = id === "Tất cả" ? "" : id; return learningLanding("workshops"); }
  if (action === "learning-dashboard") return navigate("dashboard");
  if (action === "learning-senior") return state.user ? navigate("dashboard") : authForm(true, "SENIOR");
  if (action === "learning-new") return editForm(id, "", { resident: state.journeyResident || data("residents")[0]?.id });
  return learningIntent(action, id);
}

document.addEventListener("change", (event) => {
  if (event.target.id === "journey-resident") { state.journeyResident = event.target.value; renderPage(); }
});
