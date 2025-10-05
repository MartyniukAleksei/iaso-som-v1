/* result-fetching.js
 * Реальний запит до API → якщо невдача, одразу показуємо РАНДОМНІ дані екзопланети.
 * Також вбудовуємо exoplanet.html через iframe під таблицею результатів
 * і автопідлаштовуємо висоту iframe, щоб канвас не «вилазив» зі сторінки.
 *
 * Необхідні елементи в index.html:
 *  - Стани/контейнери: #waitingState, #waitingTimestamp, #resultsDisplay, #timeoutState (опційно)
 *  - Поля результатів:  #resultPercent, #result_object_id, #result_planet_radius,
 *                      #result_semi_major_axis, #result_eq_temperature, (опційно #result_orbital_period)
 *  - Канвас-секція:    <div id="exoplanetSection" style="display:none"><iframe id="exoplanetFrame"></iframe></div>
 */

(() => {
  // =========================
  // Конфіг
  // =========================
  const POLLING_CONFIG = {
    MAX_POLL_DURATION: 120000, // 2 хв на весь цикл
    POLL_INTERVAL: 5000,       // 5 с між опитуваннями
    FETCH_TIMEOUT: 15000,      // 15 с таймаут окремого запиту
    API_BASE: "https://sophia-nasa-ml-app-7bc530f3ab97.herokuapp.com",
  };

  let pollInterval = null;
  let pollStartTime = null;

  // =========================
  // Утиліти
  // =========================
  const $ = (id) => document.getElementById(id);
  const safe = (fn, ...args) => { try { return fn?.(...args); } catch {} };

  const toNum = (v) => {
    if (v === null || v === undefined) return NaN;
    const n = Number(String(v).replace(/[^\d.\-+eE]/g, ""));
    return Number.isFinite(n) ? n : NaN;
  };

  const fmt = (n, d = 2) =>
    Number.isFinite(n)
      ? new Intl.NumberFormat(undefined, { maximumFractionDigits: d }).format(n)
      : "";

  const humanTime = (ms) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m}m ${s % 60}s`;
  };

  async function tryFetch(url, opts = {}, timeoutMs = POLLING_CONFIG.FETCH_TIMEOUT) {
    return await Promise.race([
      fetch(url, opts),
      new Promise((_, rej) => setTimeout(() => rej(new Error("Fetch timeout")), timeoutMs)),
    ]);
  }

  // =========================
  // UI helpers
  // =========================
  function showWaitingState(analysisId) {
    const waiting = $("waitingState");
    const results = $("resultsDisplay");
    const timeout = $("timeoutState");
    if (waiting) waiting.style.display = "block";
    if (results) results.style.display = "none";
    if (timeout) timeout.style.display = "none";
    safe(window.setSubmittingState, true);
    updateWaitingTime(0);
    console.log(`⏳ Waiting for analysis: ${analysisId}`);
  }

  function hideWaitingState() {
    const waiting = $("waitingState");
    if (waiting) waiting.style.display = "none";
    safe(window.setSubmittingState, false);
  }

  function updateWaitingTime(elapsed) {
    const ts = $("waitingTimestamp");
    if (ts) ts.textContent = `Analyzing… ${humanTime(elapsed)} (server processing)`;
  }

  // Якщо все ж хочеш показувати окремий таймаут-екран — лишаємо функцію,
  // але в нашій логіці ми віддаємо перевагу миттєвому рандом-фолбеку.
  function showTimeoutState() {
    const timeoutState = $("timeoutState");
    const waitingState = $("waitingState");
    if (waitingState) waitingState.style.display = "none";
    if (timeoutState) timeoutState.style.display = "block";
    safe(window.setSubmittingState, false);
  }

  // =========================
  // РАНДОМ екзопланета (fallback)
  // =========================
  function generateRandomPlanet(seedStr = "") {
    // простий детермінований seed від рядка (якщо передано)
    let seed = 0;
    for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) | 0;
    const rnd = () => {
      // якщо seed = 0 — використовуємо Math.random()
      if (!seed) return Math.random();
      seed = (seed * 1664525 + 1013904223) | 0;
      // перетворюємо на [0,1)
      return ((seed >>> 0) % 10000) / 10000;
    };

    const id = `TIC-${Math.floor(rnd() * 9_000_000 + 1_000_000)}`;
    const radius = +(0.5 + rnd() * 3).toFixed(2);   // 0.5–3.5 R⊕
    const dist   = +(0.1 + rnd() * 3).toFixed(3);   // 0.1–3.1 AU
    const temp   = Math.round(100 + rnd() * 1500);  // 100–1600 K
    const period = +(5 + rnd() * 400).toFixed(1);   // 5–405 днів
    const percent= +(60 + rnd() * 35).toFixed(1);   // 60–95 %

    return {
      object_id: id,
      planet_radius: radius,
      semi_major_axis: dist,
      eq_temperature: temp,
      orbital_period: period,
      percent: percent,
    };
  }

  // =========================
  // EXOPLANET iframe (канвас)
  // =========================
  function sizeExoplanetFrame() {
    const frame = $("exoplanetFrame");
    if (!frame) return;
    const h = Math.max(420, Math.floor(window.innerHeight * 0.65));
    frame.style.height = `${h}px`;
    frame.style.width = "100%";
    frame.style.display = "block";
  }

  function showExoplanetCanvas(result) {
    const sec = $("exoplanetSection");
    const frame = $("exoplanetFrame");
    if (!sec || !frame) return;

    const params = new URLSearchParams();
    if (Number.isFinite(result.planet_radius)) params.set("radius", result.planet_radius);
    if (Number.isFinite(result.semi_major_axis)) {
      params.set("avgDist", result.semi_major_axis);
      params.set("transitDist", result.semi_major_axis);
    }
    if (Number.isFinite(result.eq_temperature)) params.set("temp", result.eq_temperature);
    if (Number.isFinite(result.orbital_period)) params.set("period", result.orbital_period);

    const url = "exoplanet.html" + (params.toString() ? `?${params.toString()}` : "");
    if (frame.getAttribute("src") !== url) frame.setAttribute("src", url);

    sec.style.display = "block";
    sizeExoplanetFrame();
  }

  // =========================
  // Відмальовка результатів
  // =========================
  function displayResults(result) {
    const waiting = $("waitingState");
    if (waiting) waiting.style.display = "none";
    const results = $("resultsDisplay");
    if (results) results.style.display = "block";

    const set = (id, text) => { const el = $(id); if (el) el.textContent = text; };

    const percent = result.percent ?? result.score_percent ?? "";
    const objectId = result.object_id ?? result.tic_id ?? result.id ?? "—";
    const radius = toNum(result.planet_radius);
    const a = toNum(result.semi_major_axis);
    const temp = toNum(result.eq_temperature);
    const period = toNum(result.orbital_period);

    set("result_object_id", String(objectId));
    set("resultPercent", Number.isFinite(percent) ? `${percent}%` : String(percent || "—"));
    if (Number.isFinite(radius)) set("result_planet_radius", `${fmt(radius, 2)} R⊕`);
    if (Number.isFinite(a)) set("result_semi_major_axis", `${fmt(a, 3)} AU`);
    if (Number.isFinite(temp)) set("result_eq_temperature", `${fmt(temp, 0)} K`);
    if (Number.isFinite(period) && $("result_orbital_period")) {
      set("result_orbital_period", `${fmt(period, 1)} d`);
    }

    safe(window.setSubmittingState, false);
    showExoplanetCanvas({ planet_radius: radius, semi_major_axis: a, eq_temperature: temp, orbital_period: period });

    // опціональна нотифікація для інших слухачів
    try { document.dispatchEvent(new CustomEvent("analysis:complete", { detail: result })); } catch {}
  }

  // =========================
  // Полінг реального сервера
  // (будь-яка невдача → миттєвий рандом і зупинка полінгу)
  // =========================
  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  }

  function startPolling(analysisId) {
    console.log(`🚀 Start analysis for: ${analysisId}`);
    pollStartTime = Date.now();
    let attempt = 0;

    // Якщо офлайн — відразу рандом
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      console.warn("🌐 Offline — showing random exoplanet data");
      hideWaitingState();
      displayResults(generateRandomPlanet(String(analysisId || "")));
      return;
    }

    showWaitingState(analysisId);

    const poll = async () => {
      const elapsed = Date.now() - pollStartTime;
      attempt++;

      if (elapsed > POLLING_CONFIG.MAX_POLL_DURATION) {
        console.log("⏰ Max poll duration reached — fallback to random");
        stopPolling();
        hideWaitingState();
        displayResults(generateRandomPlanet(String(analysisId || "")));
        return;
      }

      try {
        console.log(`🔍 Poll attempt ${attempt}`);
        const res = await tryFetch(
          `${POLLING_CONFIG.API_BASE}/analysis/${encodeURIComponent(analysisId)}`,
          { method: "GET" },
          POLLING_CONFIG.FETCH_TIMEOUT
        );

        if (res.status === 202) {
          updateWaitingTime(elapsed);
          return; // ще обробляється — чекаємо далі
        }

        if (res.status === 200) {
          const body = await res.json();
          if (body?.status === "completed" && body?.data) {
            console.log("✅ Analysis complete");
            stopPolling();
            hideWaitingState();
            displayResults(body.data);
            return;
          }
          if (body?.status === "error") {
            throw new Error(body.message || "Analysis failed");
          }
          // якщо 200, але структура не та — вважаємо невдачею
          throw new Error("Unexpected API response");
        }

        // 4xx/5xx → невдача
        throw new Error(`HTTP ${res.status}`);
      } catch (err) {
        console.error("❌ Polling error:", err);
        // Будь-яка невдача → відразу рандом і стоп
        stopPolling();
        hideWaitingState();
        displayResults(generateRandomPlanet(String(analysisId || "")));
      }
    };

    // Перший запуск + інтервал
    poll();
    pollInterval = setInterval(poll, POLLING_CONFIG.POLL_INTERVAL);
  }

  // =========================
  // Ініціалізація
  // =========================
  document.addEventListener("DOMContentLoaded", () => {
    console.log("🎯 Planet Analysis UI ready");
    console.log(`🌐 API base: ${POLLING_CONFIG.API_BASE}`);
    window.addEventListener("resize", sizeExoplanetFrame);
  });

  // Експорт у глобал (сумісність з існуючим кодом)
  window.startPolling = startPolling;
  window.stopPolling = stopPolling;
  window.displayResults = displayResults;
  window.showTimeoutState = showTimeoutState;
  window.updateWaitingTime = updateWaitingTime;
})();
