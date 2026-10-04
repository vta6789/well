async function init() {
  try {
    if (localStorage.getItem("wf_large_text") === "1")
      document.documentElement.classList.add("large-text");
  } catch {}
  $("#app").innerHTML = '<div class="loading">❧ Đang mở Wellness Farm…</div>';
  try {
    const result = await api("me");
    state.user = result.user;
    state.csrf = result.csrf;
    state.data.demo = result.demo;
    await refresh();
    landing("home");
  } catch (error) {
    try {
      await publicLoad();
    } catch (e) {
      $("#app").innerHTML =
        `<div class="loading"><h1>Chưa kết nối được máy chủ</h1><p>${esc(e.message)}</p><p>Chạy <code>python server.py</code> và mở <code>http://127.0.0.1:8000</code>.</p></div>`;
    }
  }
}
init();
