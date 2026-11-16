(function () {
  "use strict";
  document.documentElement.classList.add("js");
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const scenes = $$(".scene");
  const navLinks = $$(".chapters a");
  const cnum = $("#cnum");
  const prog = $("#prog");
  let current = 0;

  /* Language: German source, English dictionary in i18n.js */
  const EN = window.PITCH_EN || {};
  const orig = new WeakMap();
  const ATTRS = ["aria-label", "title", "alt"];
  let lang = "de";
  try { lang = new URLSearchParams(location.search).get("lang") || localStorage.getItem("pitch-lang") || "de"; } catch (e) {}
  if (lang !== "en") lang = "de";
  const T = (de, en) => (lang === "en" ? en : de);
  const renders = [];
  function translateStatic() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((n) => {
      if (n.parentElement && n.parentElement.closest("script,style,.lang")) return;
      if (!orig.has(n)) orig.set(n, n.nodeValue);
      const src = orig.get(n), key = src.replace(/\s+/g, " ").trim();
      if (!key || !(key in EN)) return;
      if (lang === "de") { n.nodeValue = src; return; }
      const lead = /^\s/.test(src) && !/^[.,;:)“”]/.test(EN[key]) ? " " : "";
      const trail = /\s$/.test(src) ? " " : "";
      n.nodeValue = lead + EN[key] + trail;
    });
    $$("*").forEach((el) => ATTRS.forEach((a) => {
      if (!el.hasAttribute(a) || el.closest(".lang")) return;
      const k = "data-de-" + a;
      if (!el.hasAttribute(k)) el.setAttribute(k, el.getAttribute(a));
      const de = el.getAttribute(k);
      el.setAttribute(a, lang === "en" && EN[de] ? EN[de] : de);
    }));
    const md = $('meta[name="description"]');
    if (md) { if (!md.dataset.de) md.dataset.de = md.content; md.content = lang === "en" ? EN[md.dataset.de] || md.dataset.de : md.dataset.de; }
    if (!document.documentElement.dataset.title) document.documentElement.dataset.title = document.title;
    const tt = document.documentElement.dataset.title;
    document.title = lang === "en" ? EN[tt] || tt : tt;
    document.documentElement.lang = lang;
  }
  function setLang(l) {
    lang = l === "en" ? "en" : "de";
    try { localStorage.setItem("pitch-lang", lang); } catch (e) {}
    try { const u = new URL(location.href); if (lang === "en") u.searchParams.set("lang", "en"); else u.searchParams.delete("lang"); history.replaceState(null, "", u); } catch (e) {}
    $$(".lang [data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
    translateStatic();
    renders.forEach((f) => f());
  }
  $$(".lang [data-lang]").forEach((b) => b.addEventListener("click", () => setLang(b.dataset.lang)));

  /* Reveal */
  const io = new IntersectionObserver((es) => {
    es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  $$(".reveal").forEach((el) => io.observe(el));

  /* Active scene + progress */
  function onScroll() {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    prog.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + "%";
    const mid = window.innerHeight * 0.4;
    let idx = 0;
    scenes.forEach((s, i) => { if (s.getBoundingClientRect().top <= mid) idx = i; });
    if (idx !== current) setCurrent(idx);
  }
  function setCurrent(i) {
    current = i;
    cnum.textContent = String(i + 1).padStart(2, "0");
    navLinks.forEach((a, j) => { a.classList.toggle("on", j === i); a.toggleAttribute("aria-current", j === i); });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  setCurrent(0); onScroll();

  function go(i) {
    i = Math.max(0, Math.min(scenes.length - 1, i));
    scenes[i].scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }

  /* Presentation mode: arrow keys, PageUp/Down, space */
  const presentBtn = $("#present");
  presentBtn.addEventListener("click", () => {
    const on = !document.body.classList.contains("present");
    document.body.classList.toggle("present", on);
    presentBtn.setAttribute("aria-pressed", String(on));
    presentLabel();
    if (on) go(current);
  });
  function presentLabel() {
    const on = document.body.classList.contains("present");
    presentBtn.textContent = on ? T("Präsentation beenden", "Exit presentation") : T("Präsentieren", "Present");
  }
  renders.push(presentLabel);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && document.body.classList.contains("present")) presentBtn.click(); });
  document.addEventListener("keydown", (e) => {
    const tag = (e.target.tagName || "").toLowerCase();
    if (["input", "textarea", "select"].includes(tag) || e.altKey || e.ctrlKey || e.metaKey) return;
    const presenting = document.body.classList.contains("present");
    const nextKeys = ["ArrowRight", "PageDown"].concat(presenting ? ["ArrowDown", " "] : []);
    const prevKeys = ["ArrowLeft", "PageUp"].concat(presenting ? ["ArrowUp"] : []);
    if (tag === "button" && e.key === " ") return;
    if (e.target.closest && e.target.closest('[role="tablist"]') && (e.key === "ArrowLeft" || e.key === "ArrowRight")) return;
    if (nextKeys.includes(e.key)) { e.preventDefault(); go(current + 1); }
    else if (prevKeys.includes(e.key)) { e.preventDefault(); go(current - 1); }
    else if (e.key === "Home" && presenting) { e.preventDefault(); go(0); }
    else if (e.key === "End" && presenting) { e.preventDefault(); go(scenes.length - 1); }
  });

  /* Generic tablist keyboard support */
  function tablist(list, onSelect) {
    const tabs = $$('[role="tab"]', list);
    tabs.forEach((t, i) => {
      t.addEventListener("click", () => select(i));
      t.addEventListener("keydown", (e) => {
        let n = null;
        if (e.key === "ArrowRight" || e.key === "ArrowDown") n = (i + 1) % tabs.length;
        if (e.key === "ArrowLeft" || e.key === "ArrowUp") n = (i - 1 + tabs.length) % tabs.length;
        if (n !== null) { e.preventDefault(); e.stopPropagation(); tabs[n].focus(); select(n); }
      });
    });
    function select(i) {
      tabs.forEach((t, j) => { t.setAttribute("aria-selected", String(i === j)); t.tabIndex = i === j ? 0 : -1; });
      onSelect(i, tabs[i]);
    }
    return select;
  }
  function swap(el) { el.classList.remove("swap"); void el.offsetWidth; el.classList.add("swap"); }

  /* 01 Probe */
  const probe = $("#probe");
  const result = $("#probe-result");
  let choice = null;
  function probeText() {
    if (!choice) return;
    $("#res-title").textContent = choice === "ok"
      ? T("Verständlich, und genau hier passiert der Fehler.", "Understandable, and this is exactly where the error happens.")
      : T("Richtig entschieden. Und das lässt sich trainieren.", "Right call. And that can be trained.");
  }
  renders.push(probeText);
  $$("[data-choice]", probe).forEach((b) => b.addEventListener("click", () => {
    $$("[data-choice]", probe).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    choice = b.dataset.choice; probeText();
    probe.classList.add("done");
    result.hidden = false;
  }));

  /* 02 Diff switch */
  const diff = $("#diff-panel");
  const note = $("#tl-note");
  const modes = ["know", "comp"];
  const rowsEn = [
    ["Knowing terms and facts", "Making reasoned decisions in one's own work situations"],
    ["Slide PDF", "One website with 24 blocks, cases, tools and workbook"],
    ["One format for everyone", "Variants A/B/C: beginners, leaders, engineering/IT"],
    ["Certificate of attendance", "Learning contract, decision log, transfer plan, personal if-then rules"],
    ["Satisfaction survey", "Entry diagnosis with confidence, exit questions per block, transfer check after 30/60/90 days (proposed)"],
    ["Documents in a folder", "The website remains a reference and a place to practise"]
  ];
  let diffMode = 1;
  function diffText(animate) {
    const m = modes[diffMode];
    note.textContent = m === "comp" ? T("≤ 10 Min. Input · ≥ 30 Min. Praxis", "≤ 10 min input · ≥ 30 min practice") : T("überwiegend Input", "mostly input");
    $$(".rows dd", diff).forEach((dd, j) => { dd.textContent = lang === "en" ? rowsEn[j][diffMode] : dd.dataset[m]; if (animate) swap(dd); });
  }
  renders.push(() => diffText(false));
  const selDiff = tablist($(".switch"), (i) => {
    diffMode = i;
    diff.dataset.mode = modes[i];
    diff.setAttribute("aria-labelledby", i ? "tab-comp" : "tab-know");
    diffText(true);
  });
  selDiff(1);

  /* 03 Studio tabs */
  const shots = [
    { img: "block.jpg", url: "#/block/B04", alt: "Lernblock B04 mit Phasenleiste und Lernzielen", h: "24 Lernblöcke, ein Ablauf",
      li: ["Jeder Block führt durch dieselben sechs Phasen, mit Zeitangabe je Phase.", "Fälle und Aufgaben in drei Varianten für Einsteiger, Führung und Engineering/IT.", "Exit-Fragen am Blockende zeigen, was angekommen ist."] },
    { img: "cases.jpg", url: "#/cases", alt: "Fallstudio mit Fallkarten aus Energie und Engineering", h: "Fälle aus dem echten Arbeitskontext",
      li: ["8 Fallkarten und 2 Rollensimulationen aus Energietechnik und Engineering.", "Alle Fälle sind synthetisch, es werden keine Kundendaten verwendet.", "Jeder Fall endet mit einer Referenzlösung zum Abgleich."] },
    { img: "toolkit.jpg", url: "#/toolkit", alt: "Entscheidungswerkzeuge mit Matrix aus acht Kriterien", h: "Werkzeuge, die bleiben",
      li: ["Entscheidungsmatrix mit acht Kriterien: Ein offenes Pflichtkriterium blockiert jede Empfehlung.", "Entscheidungsprotokoll macht Begründungen nachvollziehbar.", "Toolklassen helfen, Werkzeuge richtig einzuordnen."] },
    { img: "home.jpg", url: "#/", alt: "Überblick des AI Learning Studio mit Lernpfad über drei Tage", h: "Ein Lernpfad über drei Tage",
      li: ["Lernpfad, Fallstudio, Werkzeuge, Workbook und Ressourcen an einem Ort.", "Funktioniert im Raum und online, auf Laptop, Tablet und Smartphone.", "Geschützter Trainerbereich mit Leitfäden, Folien und gemeinsamer Ablage."] }
  ];
  shots.forEach((s) => { const i = new Image(); i.src = "/pitch/assets/" + s.img; });
  const shotsEn = [
    { alt: "Learning block B04 with phase bar and learning goals", h: "24 learning blocks, one flow",
      li: ["Every block runs through the same six phases, each with a time allocation.", "Cases and tasks in three variants for beginners, leaders and engineering/IT.", "Exit questions at the end of each block show what has landed."] },
    { alt: "Case studio with case cards from energy and engineering", h: "Cases from the real work context",
      li: ["8 case cards and 2 role simulations from energy technology and engineering.", "All cases are synthetic; no customer data is used.", "Every case ends with a reference solution for comparison."] },
    { alt: "Decision tools with an eight-criteria matrix", h: "Tools that stay",
      li: ["Decision matrix with eight criteria: one open mandatory criterion blocks any recommendation.", "The decision log makes reasoning traceable.", "Tool classes help to place tools correctly."] },
    { alt: "AI Learning Studio overview with a three-day learning path", h: "One learning path over three days",
      li: ["Learning path, case studio, tools, workbook and resources in one place.", "Works in the room and online, on laptop, tablet and smartphone.", "Protected trainer area with guides, slides and shared storage."] }
  ];
  const stImg = $("#st-img"), stUrl = $("#st-url"), stText = $("#st-text");
  let shotIdx = 0;
  function shotText(animate) {
    const s = shots[shotIdx], e = shotsEn[shotIdx];
    const h = T(s.h, e.h), li = lang === "en" ? e.li : s.li;
    stImg.alt = T(s.alt + " im AI Learning Studio", e.alt + " in the AI Learning Studio");
    stImg.setAttribute("data-de-alt", s.alt + " im AI Learning Studio");
    stText.innerHTML = "<h3>" + h + "</h3><ul>" + li.map((l) => "<li>" + l + "</li>").join("") + "</ul>";
    if (animate) swap(stText);
  }
  renders.push(() => shotText(false));
  tablist($(".studio-tabs"), (i, tab) => {
    const s = shots[i];
    shotIdx = i;
    $("#studio-panel").setAttribute("aria-labelledby", tab.id);
    stImg.classList.add("fade");
    setTimeout(() => {
      stImg.src = "/pitch/assets/" + s.img;
      shotText(false);
      stImg.classList.remove("fade");
    }, 180);
    stUrl.textContent = "power-academy-ai-learning-studio-2.vercel.app/" + s.url;
    shotText(true);
  });

  /* 04 Perspectives */
  const persp = [
    { big: "Ein Format, das sich auf viele Trainer und Gruppen übertragen lässt.",
      proof: "Woran man es merkt: Neue Trainer arbeiten mit Leitfaden, Folien und Druckkit aus einer Hand.",
      li: ["Einheitlich und skalierbar: gleicher Ablauf in allen 24 Blöcken.", "Dokumentierte Maßnahme nach Art. 4 AI Act, mit Zielgruppe und Einsatzkontext.", "Inhalte zentral aktuell halten statt verteilter Folienstände.", "Energie-Branchenbezug als klares Profil im Markt."] },
    { big: "Werkzeuge, die am nächsten Arbeitstag funktionieren.",
      proof: "Woran man es merkt: Teilnehmende verlassen den Kurs mit eigenen Arbeitsprodukten, nicht mit einem Foliensatz.",
      li: ["Prüfprotokoll für KI-Antworten mit Quellen, Prompt-Formel, Entscheidungsmatrix.", "Passend zur Rolle: Einsteiger, Führung, Engineering/IT.", "Eigene Wenn-dann-Regeln und ein Transferplan für den Alltag.", "Weniger blindes Vertrauen in KI, klarere Freigabewege."] },
    { big: "Erst der eigene Versuch, dann die Erklärung.",
      proof: "Woran man es merkt: Selbsteinschätzung und Ergebnis werden über die Konfidenzangabe vergleichbar.",
      li: ["Kompetenzorientiert: „Was“ vorgeben, „Warum“ verstehen, „Wie“ selbst entwickeln.", "Erst eigener Versuch, dann Erklärung und Abgleich mit Referenz.", "Abrufübungen verknüpfen die Blöcke über drei Tage.", "Kalibrierung: Wer sich überschätzt, sieht es selbst."] }
  ];
  const perspEn = [
    { big: "One format that transfers to many trainers and groups.",
      proof: "How you notice it: new trainers work with guide, slides and print kit from a single source.",
      li: ["Consistent and scalable: the same flow in all 24 blocks.", "A documented measure under Art. 4 AI Act, with target group and context of use.", "Content kept current centrally instead of scattered slide versions.", "Energy-sector focus as a clear market profile."] },
    { big: "Tools that work on the next working day.",
      proof: "How you notice it: participants leave the course with their own work products, not a slide deck.",
      li: ["Check protocol for AI answers with sources, prompt formula, decision matrix.", "Matched to the role: beginners, leaders, engineering/IT.", "Personal if-then rules and a transfer plan for everyday work.", "Less blind trust in AI, clearer approval paths."] },
    { big: "Your own attempt first, then the explanation.",
      proof: "How you notice it: confidence ratings make self-assessment and result comparable.",
      li: ["Competence-oriented: set the “what”, understand the “why”, develop the “how” yourself.", "Own attempt first, then explanation and comparison with a reference.", "Retrieval practice links the blocks across three days.", "Calibration: anyone who overestimates themselves sees it for themselves."] }
  ];
  const pPanel = $("#persp-panel");
  let pIdx = 0;
  function perspText() {
    const p = lang === "en" ? perspEn[pIdx] : persp[pIdx];
    $("#p-big").textContent = p.big;
    $("#p-proof").textContent = p.proof;
    $("#p-list").innerHTML = p.li.map((l) => "<li>" + l + "</li>").join("");
  }
  renders.push(perspText);
  tablist($(".persp-tabs"), (i, tab) => {
    pIdx = i;
    pPanel.setAttribute("aria-labelledby", tab.id);
    perspText();
    swap(pPanel);
  })(0);

  /* 05 Evidence cards */
  $$(".ev-face").forEach((b) => b.addEventListener("click", () => {
    const open = b.getAttribute("aria-expanded") !== "true";
    b.setAttribute("aria-expanded", String(open));
    $("#" + b.getAttribute("aria-controls")).hidden = !open;
    b.parentElement.classList.toggle("open", open);
  }));

  /* 06 Steps */
  const steps = [
    { w: "Probedurchlauf mit dem Trainerteam am 29.10., nach Fach- und Rechtsprüfung.", c: "Zeitplan je Phase, Verständlichkeit der Fälle, Funktion der Website im Raum.", o: "Freigabe der Inhalte und letzte Anpassungen vor der Übergabe." },
    { w: "Eine Kundengruppe durchläuft alle drei Tage in der passenden Variante.", c: "Einstiegsdiagnose mit Konfidenz, Exit-Fragen je Block, Qualität der Arbeitsprodukte.", o: "Erste belastbare Daten zu Lernstand und Selbsteinschätzung." },
    { w: "Kurze Transferabfrage nach 30, 60 und 90 Tagen (vorgeschlagen).", c: "Wird das Prüfprotokoll genutzt? Greifen die eigenen Wenn-dann-Regeln im Alltag?", o: "Nachweis, was im Arbeitsalltag angekommen ist, nicht nur im Kurs." },
    { w: "Gemeinsame Auswertung der Pilotdaten mit der Power Academy.", c: "Lernstand, Transfer und Trainerfeedback gegen die Ziele des Kurses.", o: "Entscheidung über den Rollout auf weitere Gruppen und Trainer." }
  ];
  const stepsEn = [
    { w: "Dry run with the trainer team on 29 Oct, after subject-matter and legal review.", c: "Timing per phase, clarity of the cases, how the website works in the room.", o: "Content approval and final adjustments before handover." },
    { w: "One customer group goes through all three days in the matching variant.", c: "Entry diagnosis with confidence, exit questions per block, quality of the work products.", o: "First reliable data on learning level and self-assessment." },
    { w: "Short transfer survey after 30, 60 and 90 days (proposed).", c: "Is the check protocol used? Do the personal if-then rules hold in everyday work?", o: "Evidence of what has arrived in everyday work, not just in the course." },
    { w: "Joint review of the pilot data with the Power Academy.", c: "Learning level, transfer and trainer feedback against the course goals.", o: "Decision on rollout to further groups and trainers." }
  ];
  const sPanel = $("#path-panel");
  const stepBtns = $$(".steps button");
  let sIdx = 0;
  function stepText() {
    const st = lang === "en" ? stepsEn[sIdx] : steps[sIdx];
    $("#s-what").textContent = st.w;
    $("#s-check").textContent = st.c;
    $("#s-out").textContent = st.o;
  }
  renders.push(stepText);
  tablist($(".steps"), (i, tab) => {
    sIdx = i;
    sPanel.setAttribute("aria-labelledby", tab.id);
    stepBtns.forEach((b, j) => b.classList.toggle("past", j < i));
    stepText();
    swap(sPanel);
  })(0);

  setLang(lang);
})();
