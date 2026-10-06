// Each rendered scene owns its observer. Removed pages cannot retain observers
// or counters, and reduced motion keeps all content immediately visible.
const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
let sceneObserver;
let sceneTransition;
const activeCounters = new Map();

function finishCounters() {
  for (const [element, counter] of activeCounters) {
    cancelAnimationFrame(counter.frame);
    element.textContent = counter.value;
  }
  activeCounters.clear();
}

function animateCounter(element) {
  const value = element.textContent.trim();
  if (!/^\d+$/.test(value) || Number(value) === 0 || motionPreference.matches) return;
  const started = performance.now();
  const counter = { value, frame: 0 };
  activeCounters.set(element, counter);
  element.setAttribute("aria-label", value);
  const tick = (time) => {
    if (!element.isConnected || motionPreference.matches) {
      element.textContent = value;
      activeCounters.delete(element);
      return;
    }
    const progress = Math.min(Math.max((time - started) / 750, 0), 1);
    element.textContent = String(Math.round(Number(value) * (1 - Math.pow(1 - progress, 3))));
    if (progress < 1) counter.frame = requestAnimationFrame(tick);
    else {
      element.textContent = value;
      activeCounters.delete(element);
    }
  };
  counter.frame = requestAnimationFrame(tick);
}

function enhanceExperience(root, scene = true) {
  sceneObserver?.disconnect();
  finishCounters();
  if (!root || !scene || motionPreference.matches) return;
  root.classList.remove("wf-scene-enter");
  void root.offsetWidth;
  root.classList.add("wf-scene-enter");
  root.addEventListener("animationend", (event) => {
    if (event.target === root) root.classList.remove("wf-scene-enter");
  }, { once: true });
  if (!("IntersectionObserver" in window)) return;
  sceneObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const element = entry.target;
      sceneObserver.unobserve(element);
      element.classList.add("wf-revealed");
      const counters = element.matches(".metric") ? [element.querySelector("strong")] : element.querySelectorAll(".metric strong");
      counters.forEach(animateCounter);
      element.addEventListener("animationend", (event) => {
        if (event.target !== element) return;
        element.classList.remove("wf-reveal", "wf-revealed");
        element.style.removeProperty("--reveal-delay");
      }, { once: true });
    }
  }, { threshold: 0.06, rootMargin: "0px 0px -24px 0px" });
  const targets = root.querySelectorAll(".learning-hero-copy, .learning-hero-visual, .learning-value-chain article, .learning-section-head, .learning-section > h2, .card, .metric, .learning-empty, .learning-invitation, .page-head");
  targets.forEach((element, index) => {
    // Animate outer cards only; nested cards and metrics remain visible with it.
    if (element.parentElement.closest(".card, .metric")) return;
    element.classList.add("wf-reveal");
    element.style.setProperty("--reveal-delay", `${Math.min(index % 5 * 65, 260)}ms`);
    sceneObserver.observe(element);
  });
}

function presentExperience(render) {
  if (motionPreference.matches || !document.startViewTransition || !document.querySelector("#main")) {
    render();
    return;
  }
  sceneTransition?.skipTransition();
  sceneTransition = document.startViewTransition(render);
  sceneTransition.finished.catch(() => {});
  return sceneTransition.updateCallbackDone;
}

motionPreference.addEventListener("change", () => {
  if (!motionPreference.matches) return;
  sceneTransition?.skipTransition();
  sceneObserver?.disconnect();
  finishCounters();
  document.querySelectorAll(".wf-reveal, .wf-scene-enter").forEach((element) => {
    element.classList.remove("wf-reveal", "wf-revealed", "wf-scene-enter");
  });
});

// Keyboard navigation reveals a destination immediately, even before the
// scroll observer runs; a focused control must never wait behind an animation.
document.addEventListener("focusin", (event) => {
  const destination = event.target.closest(".wf-reveal");
  if (!destination) return;
  sceneObserver?.unobserve(destination);
  destination.classList.remove("wf-reveal", "wf-revealed");
  destination.style.removeProperty("--reveal-delay");
});

let scrollFrame = 0;
function updateScrollProgress() {
  scrollFrame = 0;
  const indicator = document.querySelector(".learning-scroll-progress");
  if (!indicator) return;
  const available = document.documentElement.scrollHeight - innerHeight;
  indicator.style.transform = `scaleX(${available > 0 ? Math.min(1, Math.max(0, scrollY / available)) : 0})`;
}
window.addEventListener("scroll", () => {
  if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScrollProgress);
}, { passive: true });
window.addEventListener("resize", updateScrollProgress, { passive: true });

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
    shell();
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
