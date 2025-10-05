// Убираем конфликт с CONFIG - используем другое имя
const POLLING_CONFIG = {
  MAX_POLL_DURATION: 120000,
  POLL_INTERVAL: 5000,
  TEST_DELAY: 10000,
};

let pollInterval = null;
let pollStartTime = null;

// Основная функция опроса
function startPolling(objectId) {
  console.log(`🚀 Starting analysis for: ${objectId}`);
  pollStartTime = Date.now();
  let attemptCount = 0;

  const poll = async () => {
    const elapsed = Date.now() - pollStartTime;
    attemptCount++;

    if (elapsed > POLLING_CONFIG.MAX_POLL_DURATION) {
      console.log(`⏰ Timeout for: ${objectId}`);
      stopPolling();
      showTimeoutState();
      return;
    }

    try {
      console.log(`🔍 Polling attempt ${attemptCount} for: ${objectId}`);

      // Имитируем запрос к серверу
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Сервер "обрабатывает" данные в течение TEST_DELAY
      if (elapsed < POLLING_CONFIG.TEST_DELAY) {
        console.log(`⏳ Analysis in progress... (${attemptCount})`);
        return;
      }

      // Анализ завершен - возвращаем результаты
      const result = generateRealisticResults(objectId);
      console.log("✅ Analysis complete!", result);

      stopPolling();
      displayResults(result);

      if (typeof setSubmittingState === "function") {
        setSubmittingState(false);
      }
    } catch (error) {
      console.error(`❌ Polling error:`, error);

      // При ошибке показываем демо-результаты
      stopPolling();
      const demoResult = generateQuickResults(objectId);
      displayResults(demoResult);
      setSubmittingState(false);
    }
  };

  // Запускаем опрос
  poll();
  pollInterval = setInterval(poll, POLLING_CONFIG.POLL_INTERVAL);
}

// Генерация реалистичных результатов
function generateRealisticResults(objectId) {
  const hash = objectId.split("").reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);

  const positiveHash = Math.abs(hash);

  const basePercent = 65 + (positiveHash % 30);
  const planetSize = 0.8 + (positiveHash % 200) / 100;
  const orbit = 0.01 + (positiveHash % 100) / 1000;
  const temperature = 800 + (positiveHash % 800);

  return {
    object_id: objectId,
    percent: basePercent.toFixed(1),
    planet_radius: planetSize.toFixed(2),
    semi_major_axis: orbit.toFixed(4),
    eq_temperature: Math.round(temperature),
  };
}

function generateQuickResults(objectId) {
  const hash = objectId.split("").reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);

  const positiveHash = Math.abs(hash);

  return {
    object_id: objectId,
    percent: (70 + (positiveHash % 25)).toFixed(1),
    planet_radius: (1.2 + (positiveHash % 80) / 100).toFixed(2),
    semi_major_axis: (0.02 + (positiveHash % 50) / 10000).toFixed(4),
    eq_temperature: 1100 + (positiveHash % 900),
  };
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

function displayResults(result) {
  const waitingState = document.getElementById("waitingState");
  const resultsDisplay = document.getElementById("resultsDisplay");

  if (waitingState && resultsDisplay) {
    waitingState.style.display = "none";
    resultsDisplay.style.display = "block";

    const percentElement = document.getElementById("resultPercent");
    const objectIdElement = document.getElementById("result_object_id");
    const planetRadiusElement = document.getElementById("result_planet_radius");
    const semiMajorAxisElement = document.getElementById(
      "result_semi_major_axis"
    );
    const temperatureElement = document.getElementById("result_eq_temperature");

    if (percentElement) percentElement.textContent = `${result.percent}%`;
    if (objectIdElement) objectIdElement.textContent = result.object_id;
    if (planetRadiusElement)
      planetRadiusElement.textContent = `${result.planet_radius} R⊕`;
    if (semiMajorAxisElement)
      semiMajorAxisElement.textContent = `${result.semi_major_axis} AU`;
    if (temperatureElement)
      temperatureElement.textContent = `${result.eq_temperature} K`;
  }
}

function showTimeoutState() {
  const timeoutState = document.getElementById("timeoutState");
  const waitingState = document.getElementById("waitingState");

  if (timeoutState && waitingState) {
    waitingState.style.display = "none";
    timeoutState.style.display = "block";

    if (typeof setSubmittingState === "function") {
      setSubmittingState(false);
    }
  }
}

// Инициализация
document.addEventListener("DOMContentLoaded", function () {
  console.log("🎯 Planet Analysis System Ready");
  console.log("🧪 Test Mode: Simulating server with 10 second delay");
});
