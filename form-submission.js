// Ждем загрузки DOM
document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("observationForm");
  const submitBtn = document.getElementById("submitBtn");
  const fillSampleBtn = document.getElementById("fillSampleData");

  if (!form) {
    console.error("Form not found!");
    return;
  }

  // Field validators
  const fieldValidators = {
    object_id: (value) => {
      if (!value || value.length === 0) return "Object ID is required";
      if (value.length > 64) return "Object ID must be 64 characters or less";
      if (!/^[A-Za-z0-9_-]+$/.test(value))
        return "Only alphanumeric, hyphens and underscores allowed";
      return "";
    },
    transit_depth: (value) => {
      const num = parseFloat(value);
      if (isNaN(num)) return "Transit depth is required";
      if (num < 0 || num > 100)
        return "Transit depth must be between 0 and 100%";
      return "";
    },
    orbital_period: (value) => {
      const num = parseFloat(value);
      if (isNaN(num)) return "Orbital period is required";
      if (num <= 0) return "Orbital period must be positive";
      return "";
    },
    transit_duration: (value) => {
      const num = parseFloat(value);
      if (isNaN(num)) return "Transit duration is required";
      if (num <= 0) return "Transit duration must be positive";
      return "";
    },
    snr: (value) => {
      const num = parseFloat(value);
      if (isNaN(num)) return "SNR is required";
      if (num <= 0) return "SNR must be positive";
      return "";
    },
    stellar_radius: (value) => {
      const num = parseFloat(value);
      if (isNaN(num)) return "Stellar radius is required";
      if (num <= 0) return "Stellar radius must be positive";
      return "";
    },
    stellar_mass: (value) => {
      const num = parseFloat(value);
      if (isNaN(num)) return "Stellar mass is required";
      if (num <= 0) return "Stellar mass must be positive";
      return "";
    },
    stellar_temp: (value) => {
      const num = parseInt(value);
      if (isNaN(num)) return "Stellar temperature is required";
      if (num < 2500 || num > 50000)
        return "Temperature must be between 2500 and 50000 K";
      return "";
    },
    stellar_magnitude: (value) => {
      const num = parseFloat(value);
      if (isNaN(num)) return "Stellar magnitude is required";
      if (num < -10 || num > 30) return "Magnitude must be between -10 and +30";
      return "";
    },
  };

  function validateField(fieldName, value) {
    const validator = fieldValidators[fieldName];
    if (!validator) return "";
    return validator(value);
  }

  function updateFieldValidation(input) {
    const errorElement = document.getElementById(`${input.name}_error`);
    const errorMsg = validateField(input.name, input.value);

    if (errorMsg) {
      input.classList.add("error");
      input.classList.remove("valid");
      if (errorElement) errorElement.textContent = errorMsg;
    } else if (input.value) {
      input.classList.remove("error");
      input.classList.add("valid");
      if (errorElement) errorElement.textContent = "";
    } else {
      input.classList.remove("error", "valid");
      if (errorElement) errorElement.textContent = "";
    }
  }

  function validateForm() {
    const formData = new FormData(form);
    let isValid = true;

    for (const [name, value] of formData.entries()) {
      const errorMsg = validateField(name, value);
      if (errorMsg) {
        isValid = false;
      }
    }

    if (submitBtn) {
      submitBtn.disabled = !isValid;
    }
    return isValid;
  }

  // Добавляем обработчики событий
  form.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", (e) => {
      updateFieldValidation(e.target);
      validateForm();
    });

    input.addEventListener("blur", (e) => {
      updateFieldValidation(e.target);
    });
  });

  if (fillSampleBtn) {
    fillSampleBtn.addEventListener("click", () => {
      const sampleData = {
        object_id: "KOI-7016",
        transit_depth: 1.234,
        orbital_period: 365.25,
        transit_duration: 6.5,
        snr: 12.8,
        stellar_radius: 1.02,
        stellar_mass: 0.98,
        stellar_temp: 5778,
        stellar_magnitude: 11.5,
      };

      Object.entries(sampleData).forEach(([name, value]) => {
        const input = form.querySelector(`[name="${name}"]`);
        if (input) {
          input.value = value;
          updateFieldValidation(input);
        }
      });

      validateForm();
    });
  }

  // Обработчик отправки формы - РЕАЛЬНЫЙ API с улучшенной обработкой ошибок
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const formData = new FormData(form);
    const data = {};

    for (const [name, value] of formData.entries()) {
      if (name === "stellar_temp") {
        data[name] = parseInt(value);
      } else if (name === "object_id") {
        data[name] = value;
      } else {
        data[name] = parseFloat(value);
      }
    }

    setSubmittingState(true);

    try {
      // РЕАЛЬНЫЙ ЗАПРОС К API
      console.log("🚀 Sending data to REAL API:", data);

      const response = await fetch(
        "https://sophia-nasa-ml-app-7bc530f3ab97.herokuapp.com/analyze",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        }
      );

      // Парсим ответ даже при ошибке
      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Invalid JSON response: ${responseText}`);
      }

      if (!response.ok) {
        // Обрабатываем специфические ошибки сервера
        if (
          response.status === 400 &&
          result.error &&
          result.error.includes("Model not trained")
        ) {
          throw new Error("SERVER_NOT_READY");
        }
        throw new Error(
          `Server responded with ${response.status}: ${responseText}`
        );
      }

      console.log("API response:", result);

      // Сохраняем данные
      saveToLocalStorage(data);
      showWaitingState(data.object_id);

      // Начинаем опрос с полученным ID
      const analysisId = result.analysis_id || data.object_id;
      startPolling(analysisId);
    } catch (error) {
      console.error("Submission error:", error);

      // Улучшенная обработка ошибок
      let alertMessage = "Server unavailable. Using demo mode.";

      if (error.message === "SERVER_NOT_READY") {
        alertMessage = "⚠️ ML models are loading on server. Using demo mode.";
      } else if (error.message.includes("Failed to fetch")) {
        alertMessage = "🌐 Connection issues. Using demo mode.";
      } else if (error.message.includes("CORS")) {
        alertMessage = "🛡️ CORS issue. Using demo mode.";
      }

      alert(alertMessage);
      showWaitingState(data.object_id);

      // Используем случайные демо-данные вместо повторяющихся
      setTimeout(() => {
        const demoResult = generateRandomResults(data.object_id);
        displayResults(demoResult);
        setSubmittingState(false);
      }, 3000);
    }
  });

  // Вспомогательные функции
  function saveToLocalStorage(data) {
    try {
      const submissions = JSON.parse(
        localStorage.getItem("planetAnalysisSubmissions") || "[]"
      );
      submissions.push({
        ...data,
        timestamp: new Date().toISOString(),
        id: Date.now().toString(),
      });
      localStorage.setItem(
        "planetAnalysisSubmissions",
        JSON.stringify(submissions)
      );
    } catch (error) {
      console.log("Local storage not available");
    }
  }

  // Генерация СЛУЧАЙНЫХ результатов (вместо повторяющихся)
  function generateRandomResults(objectId) {
    // Используем случайные числа вместо детерминированного хэша
    const getRandom = () => {
      // Используем crypto.getRandomValues для лучшей случайности, если доступно
      if (window.crypto && window.crypto.getRandomValues) {
        const array = new Uint32Array(1);
        window.crypto.getRandomValues(array);
        return array[0] / (0xffffffff + 1);
      }
      // Fallback на Math.random()
      return Math.random();
    };

    const planetRadius = (0.5 + getRandom() * 5.5).toFixed(2); // 0.5-6.0 R⊕
    const semiMajorAxis = (0.01 + getRandom() * 1.99).toFixed(4); // 0.01-2.0 AU
    const baseTemp = 1400 / (parseFloat(semiMajorAxis) + 0.1);
    const tempVariation = (getRandom() - 0.5) * 400;
    const eqTemperature = Math.round(
      Math.max(500, Math.min(2000, baseTemp + tempVariation))
    );
    const percent = (60 + getRandom() * 35).toFixed(1); // 60-95%

    return {
      object_id: objectId,
      percent: percent,
      planet_radius: planetRadius,
      semi_major_axis: semiMajorAxis,
      eq_temperature: eqTemperature,
    };
  }

  // Старая функция для совместимости (если где-то еще используется)
  function generateQuickResults(objectId) {
    return generateRandomResults(objectId);
  }

  function setSubmittingState(isSubmitting) {
    if (!submitBtn) return;

    const btnText = submitBtn.querySelector(".btn-text");
    const spinner = submitBtn.querySelector(".spinner");

    if (isSubmitting) {
      submitBtn.classList.add("loading");
      submitBtn.disabled = true;
      if (btnText) btnText.textContent = "Submitting...";
      if (spinner) spinner.style.display = "block";
    } else {
      submitBtn.classList.remove("loading");
      if (btnText) btnText.textContent = "Analyze";
      if (spinner) spinner.style.display = "none";
      validateForm();
    }
  }

  function showWaitingState(objectId) {
    const resultsSection = document.getElementById("resultsSection");
    const waitingState = document.getElementById("waitingState");
    const resultsDisplay = document.getElementById("resultsDisplay");

    if (resultsSection && waitingState) {
      resultsSection.style.display = "block";
      waitingState.style.display = "block";
      if (resultsDisplay) resultsDisplay.style.display = "none";

      const timestamp = new Date().toLocaleTimeString();
      const waitingTimestamp = document.getElementById("waitingTimestamp");
      if (waitingTimestamp) {
        waitingTimestamp.textContent = `Submitted at ${timestamp}`;
      }

      resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  // Инициализация
  validateForm();
});
