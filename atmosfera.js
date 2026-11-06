/* «Авто Атмосфера» - интерактив: выбор услуг, схема и затемнение, закон, До/После, галерея, запись, карта. */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch { /* без хранилища */ } } };

  /* шапка и появление */
  const bar = $("[data-bar]"); const onScroll = () => bar && bar.classList.toggle("is-solid", scrollY > 30);
  addEventListener("scroll", onScroll, { passive: true }); onScroll();
  const rv = $$(".a-rv");
  if ("IntersectionObserver" in window) { const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }); rv.forEach((n) => io.observe(n)); }
  else rv.forEach((n) => n.classList.add("in"));
  setTimeout(() => $$(".a-hero .a-rv").forEach((n) => n.classList.add("in")), 60);

  /* параллакс первого экрана */
  const cards = $$("[data-par]"); let ticking = false;
  const par = () => { ticking = false; if (reduce) return; const y = Math.min(scrollY, 900); cards.forEach((c) => c.style.setProperty("--py", (-y * 0.06 * +c.dataset.par) + "px")); };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(par); } }, { passive: true });
  const emb = $("[data-emb]"); const vis = $(".a-hero__vis");
  if (vis && emb && !reduce) vis.addEventListener("pointermove", (e) => { const r = vis.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5; emb.style.transform = `perspective(800px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`; });
  if (vis && emb) vis.addEventListener("pointerleave", () => { emb.style.transform = ""; });

  /* общее состояние выбранных услуг */
  const NAMES = {}; $$('input[name="svc"]').forEach((i) => { NAMES[i.value] = i.dataset.name; });
  const ORDER = Object.keys(NAMES); const picked = new Set();
  try { JSON.parse(store.get("a37-draft") || "{}").svc?.forEach((s) => NAMES[s] && picked.add(s)); } catch { /* пусто */ }
  const dockN = $("[data-dock-n]");

  function sync() {
    $$("[data-svc]").forEach((b) => { const on = picked.has(b.dataset.svc); b.setAttribute("aria-pressed", on); b.closest(".a-svc")?.classList.toggle("is-on", on); });
    $$('input[name="svc"]').forEach((i) => { i.checked = picked.has(i.value); });
    $$(".a-z").forEach((z) => { const ids = z.dataset.svc.split(","); const on = ids.some((s) => picked.has(s)); z.classList.toggle("is-on", on); z.setAttribute("aria-pressed", on); });
    $$("[data-svc-btn]").forEach((b) => { const on = picked.has(b.dataset.svcBtn); b.setAttribute("aria-pressed", on); b.lastChild.textContent = on ? "Бронирование фар в записи" : "Бронирование фар в запись"; });
    const n = picked.size; const c = $("[data-count]"); if (c) c.textContent = n ? "выбрано: " + n : "ничего не выбрано";
    if (dockN) { dockN.hidden = !n; dockN.textContent = n; }
    if (n) { const e = $("[data-err]"); if (e) e.hidden = true; }
    const sum = $("[data-sum]"); if (sum) { const list = ORDER.filter((s) => picked.has(s)); sum.innerHTML = list.length ? list.map((s) => `<li>${NAMES[s]}</li>`).join("") : `<li class="is-empty">Пока ничего. Отметьте услуги выше или на схеме автомобиля.</li>`; }
    compose(); saveDraft();
  }
  $$("[data-svc-btn]").forEach((b) => b.addEventListener("click", () => toggle(b.dataset.svcBtn)));
  function toggle(id) { picked.has(id) ? picked.delete(id) : picked.add(id); sync(); }
  $$(".a-add").forEach((b) => b.addEventListener("click", () => toggle(b.dataset.svc)));
  $$('input[name="svc"]').forEach((i) => i.addEventListener("change", () => { i.checked ? picked.add(i.value) : picked.delete(i.value); sync(); }));
  $("[data-all]")?.addEventListener("click", () => { ORDER.forEach((s) => picked.add(s)); sync(); });
  $("[data-none]")?.addEventListener("click", () => { picked.clear(); sync(); });

  /* схема автомобиля, затемнение и закон */
  const range = $("[data-range]"), pctOut = $("[data-pct]"), verdict = $("[data-verdict]"), car = $(".a-car");
  let glass = "front";
  const GLASS_NAME = { wind: "Лобовое стекло", front: "Передние боковые стёкла", rear: "Задние стёкла (боковые и заднее)" };
  function verdictUpdate() {
    const p = +range.value; pctOut.textContent = p; car.style.setProperty("--tint", ((100 - p) / 100 * 0.93).toFixed(2));
    $$("[data-glass='front'],[data-glass='rear']", car).forEach(() => {});
    $$(".a-car__glass polygon", car).forEach((g) => { g.style.fillOpacity = (1 - (100 - p) / 100 * 0.95).toFixed(2); });
    let cls = "na", t = "", d = "";
    if (glass === "wind" || glass === "front") {
      if (p >= 70) { cls = "ok"; t = "70% и выше: в пределах нормы"; d = `${GLASS_NAME[glass]}: по п. 4.3 Перечня неисправностей требуется не менее 70%.`; }
      else { cls = "no"; t = "Ниже 70%: нарушение"; d = `${GLASS_NAME[glass]}: светопропускание менее 70% - ч. 3.1 ст. 12.5 КоАП РФ, штраф 500 ₽ (проверено 06.11.2026).`; }
    } else if (glass === "rear") { cls = "na"; t = "Для задних стёкол нормы в п. 4.3 нет"; d = "В п. 4.3 Перечня требование к светопропусканию задних боковых и заднего стекла не найдено. Уточняйте у мастера."; }
    else { cls = "na"; t = "Выберите стекло"; d = "Нажмите на лобовое, переднее боковое или заднее стекло на схеме."; }
    verdict.className = "a-verdict " + cls; verdict.innerHTML = `<b>${t}</b>${d}`;
  }
  function setGlass(g, zone) {
    glass = g || glass; $$(".a-z", car).forEach((z) => z.classList.toggle("is-act", z.dataset.zone === zone));
    $$("[data-zbtn]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.zbtn === zone));
    verdictUpdate();
  }
  range?.addEventListener("input", verdictUpdate);
  $$(".a-z", car).forEach((z) => {
    const act = () => { z.dataset.svc.split(",")[0] && toggleZone(z); setGlass(z.dataset.glass || (glass === "front" ? "front" : glass), z.dataset.zone); if (!z.dataset.glass) verdict.className = "a-verdict na", verdict.innerHTML = `<b>${z.getAttribute("aria-label")}</b>Защитная плёнка и оклейка не регулируются нормой светопропускания. Цену и состав работ называет мастер.`; };
    z.addEventListener("click", act); z.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); act(); } });
  });
  function toggleZone(z) { const ids = z.dataset.svc.split(","); const first = ids[0]; picked.has(first) ? ids.forEach((s) => picked.delete(s)) : picked.add(first); sync(); }
  $$("[data-zbtn]").forEach((b) => b.addEventListener("click", () => { const z = $(`.a-z[data-zone="${b.dataset.zbtn}"]`, car); z && z.dispatchEvent(new Event("click")); }));
  setGlass("front", "f"); picked.has("t-front") || 0;

  /* До / После */
  $$("[data-cmp]").forEach((c) => { const i = $("[data-cmp-in]", c); const set = () => c.style.setProperty("--p", i.value + "%"); i.addEventListener("input", set); set();
    if (!reduce && "IntersectionObserver" in window) { const o = new IntersectionObserver((es) => { if (es[0].isIntersecting) { o.disconnect(); let t = 0; const step = () => { t += 0.03; i.value = 50 + Math.sin(t * 2) * 22 * Math.max(0, 1 - t / 3); set(); if (t < 3) requestAnimationFrame(step); else { i.value = 50; set(); } }; requestAnimationFrame(step); } }, { threshold: 0.6 }); o.observe(c); } });

  /* галерея */
  const items = $$(".a-gi"); const fb = $$("[data-filt]");
  fb.forEach((b) => b.addEventListener("click", () => { fb.forEach((x) => x.setAttribute("aria-pressed", x === b)); items.forEach((it) => { it.hidden = b.dataset.filt !== "all" && it.dataset.g !== b.dataset.filt; }); }));
  const lb = $("[data-lb-box]"); let data = []; try { data = JSON.parse($("#gal-data").textContent); } catch { /* пусто */ }
  let cur = 0; const show = (i) => { cur = (i + data.length) % data.length; const d = data[cur]; $("img", lb).src = d.s; $("img", lb).alt = d.c; $("figcaption", lb).textContent = d.c + " · фото: " + d.f; };
  $$("[data-lb]").forEach((b) => b.addEventListener("click", () => { show(+b.dataset.lb); lb.showModal ? lb.showModal() : lb.setAttribute("open", ""); }));
  $("[data-lb-x]")?.addEventListener("click", () => lb.close()); $("[data-lb-p]")?.addEventListener("click", () => show(cur - 1)); $("[data-lb-n]")?.addEventListener("click", () => show(cur + 1));
  lb?.addEventListener("click", (e) => { if (e.target === lb) lb.close(); }); lb?.addEventListener("keydown", (e) => { if (e.key === "ArrowLeft") show(cur - 1); if (e.key === "ArrowRight") show(cur + 1); });

  /* запись */
  const form = $("[data-book]"); const msg = $("[data-msg]"), car2 = $("[data-car]"), nameIn = $("[data-name-in]"), date = $("[data-date]"), time = $("[data-time]");
  const today = new Date(); const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  if (date) { date.min = iso(today); const mx = new Date(today); mx.setDate(mx.getDate() + 60); date.max = iso(mx); }
  const MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"], DOW = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];
  const dayText = () => { if (!date.value) return "по договорённости"; const d = new Date(date.value + "T12:00:00"); return `${d.getDate()} ${MONTHS[d.getMonth()]} (${DOW[d.getDay()]})`; };
  function text() {
    const list = ORDER.filter((s) => picked.has(s)).map((s) => NAMES[s]);
    const lines = ["Здравствуйте! Хочу записаться в «Авто Атмосфера»."];
    lines.push("Услуги: " + (list.length ? list.join("; ") : "выберу на месте") + ".");
    if (car2.value.trim()) lines.push("Автомобиль: " + car2.value.trim() + ".");
    lines.push("Когда удобно: " + dayText() + (time.value ? ", " + time.value : ", время по договорённости") + ".");
    if (nameIn.value.trim()) lines.push("Меня зовут " + nameIn.value.trim() + ".");
    return lines.join("\n");
  }
  function compose() { if (msg) msg.value = text(); const w = $('[data-send="wa"]'); if (w) w.href = "https://wa.me/79634547954?text=" + encodeURIComponent(text()); }
  function saveDraft() { store.set("a37-draft", JSON.stringify({ svc: [...picked], car: car2?.value || "", name: nameIn?.value || "", time: time?.value || "" })); }
  try { const d = JSON.parse(store.get("a37-draft") || "{}"); if (car2 && d.car) car2.value = d.car; if (nameIn && d.name) nameIn.value = d.name; if (time && d.time) time.value = d.time; } catch { /* пусто */ }
  [car2, nameIn, date, time].forEach((n) => n && n.addEventListener("input", () => { compose(); saveDraft(); }));
  const toast = (t) => { const e = $("[data-toast]"); if (e) { e.textContent = t; clearTimeout(toast.t); toast.t = setTimeout(() => { e.textContent = ""; }, 6000); } };
  const need = () => { if (!picked.size) { const e = $("[data-err]"); e.hidden = false; e.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" }); return false; } return true; };
  async function copy(t) { try { await navigator.clipboard.writeText(t); return true; } catch { msg.removeAttribute("readonly"); msg.select(); let ok = false; try { ok = document.execCommand("copy"); } catch { /* нет */ } msg.setAttribute("readonly", ""); return ok; } }
  $("[data-copy]")?.addEventListener("click", async () => { if (!need()) return; toast((await copy(text())) ? "Сообщение скопировано. Вставьте его в мессенджер." : "Не удалось скопировать, выделите текст вручную."); });
  $('[data-send="wa"]')?.addEventListener("click", (e) => { if (!need()) { e.preventDefault(); return; } compose(); toast("Открываем WhatsApp с готовым сообщением."); });
  $('[data-send="vk"]')?.addEventListener("click", async (e) => { if (!need()) { e.preventDefault(); return; } const ok = await copy(text()); toast(ok ? "Сообщение скопировано. В чате ВКонтакте вставьте его и отправьте." : "Откроется чат ВКонтакте. Скопируйте сообщение кнопкой «Скопировать»."); });
  form?.addEventListener("submit", (e) => e.preventDefault());
  $("[data-dock-book]")?.addEventListener("click", () => { });

  /* счётчики рейтинга */
  $$("[data-count]").forEach((b) => { if (!b.dataset.count || !("IntersectionObserver" in window) || reduce) return; const end = +b.dataset.count; const o = new IntersectionObserver((es) => { if (!es[0].isIntersecting) return; o.disconnect(); const t0 = performance.now(); const step = (t) => { const k = Math.min(1, (t - t0) / 1200); b.textContent = (end * (1 - Math.pow(1 - k, 3))).toFixed(1).replace(".", ","); if (k < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); }); o.observe(b); });

  /* карта: подключается при приближении, с проверкой доступности Яндекса и запасным блоком */
  const map = $("[data-map]");
  if (map) {
    const fbk = $("[data-fb]", map); const lat = map.dataset.lat, lon = map.dataset.lon; let done = false;
    const mount = async () => {
      if (done) return; done = true;
      try { const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 8000); await fetch("https://yandex.ru/map-widget/v1/", { mode: "no-cors", signal: ctl.signal, cache: "no-store" }); clearTimeout(t); } catch { return; }
      const f = document.createElement("iframe"); f.title = "Яндекс Карта: Авто Атмосфера, Пржевальского 36Б/1"; f.loading = "lazy"; f.referrerPolicy = "no-referrer-when-downgrade"; f.allowFullscreen = true;
      f.src = `https://yandex.ru/map-widget/v1/?ll=${lon}%2C${lat}&z=17&pt=${lon}%2C${lat}%2Cpm2dgl&l=map`;
      let ok = false; const kill = setTimeout(() => { if (!ok) { f.remove(); fbk.hidden = false; } }, 9000);
      f.addEventListener("load", () => { ok = true; clearTimeout(kill); fbk.hidden = true; }); map.prepend(f);
    };
    if ("IntersectionObserver" in window) { const o = new IntersectionObserver((es) => { if (es[0].isIntersecting) { o.disconnect(); mount(); } }, { rootMargin: "300px" }); o.observe(map); } else mount();
  }

  /* световой акцент, следующий за курсором, на карточках */
  if (!reduce && matchMedia("(hover: hover)").matches) $$(".a-svc, .a-rev, .a-rate, .a-ba__facts li, .a-info, .a-lab__panel").forEach((c) => c.addEventListener("pointermove", (e) => { const r = c.getBoundingClientRect(); c.style.setProperty("--mx", (e.clientX - r.left) + "px"); c.style.setProperty("--my", (e.clientY - r.top) + "px"); }));
  sync(); verdictUpdate();
})();
