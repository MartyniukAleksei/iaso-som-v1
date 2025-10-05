// COMPLETE WORKING VERSION - Just copy this entire file
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
      if (num < -10 || num > 30) return "Magnitude must be between -10 and 30";
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

  // Add event handlers
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

  // FIXED FORM SUBMISSION - NO POLLING!
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
    
    // Show waiting state
    const resultsSection = document.getElementById("resultsSection");
    const waitingState = document.getElementById("waitingState");
    const resultsDisplay = document.getElementById("resultsDisplay");
    
    if (resultsSection) resultsSection.style.display = "block";
    if (waitingState) waitingState.style.display = "block";
    if (resultsDisplay) resultsDisplay.style.display = "none";

    try {
      // Prepare API request (convert transit_depth to decimal)
      const apiData = {
        orbital_period: data.orbital_period,
        transit_duration: data.transit_duration,
        transit_depth: data.transit_depth / 100,  // Convert % to decimal
        snr: data.snr,
        stellar_mass: data.stellar_mass,
        stellar_temp: data.stellar_temp,
        stellar_magnitude: data.stellar_magnitude
      };

      console.log("Sending to API:", apiData);

      const response = await fetch(
        "https://sophia-nasa-ml-app-7bc530f3ab97.herokuapp.com/analyze",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(apiData),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log("API Response:", result);

      // USE RESULT IMMEDIATELY
      if (result.status === 'success' && result.properties) {
        
        const finalResult = {
          object_id: data.object_id,
          percent: (result.confidence * 100).toFixed(1),
          planet_radius: result.properties.planet_radius.toFixed(2),
          semi_major_axis: result.properties.semi_major_axis.toFixed(4),
          eq_temperature: Math.round(result.properties.planet_temp),
          classification: result.classification
        };

        console.log("Displaying results:", finalResult);
        
        // Hide waiting, show results
        if (waitingState) waitingState.style.display = "none";
        if (resultsDisplay) resultsDisplay.style.display = "block";
        
        // Call displayResults (from result-fetching.js or wherever it's defined)
        if (typeof displayResults === 'function') {
          displayResults(finalResult);
        } else {
          console.error("displayResults function not found!");
        }
        
        setSubmittingState(false);
        
        // Save to localStorage
        try {
          const submissions = JSON.parse(
            localStorage.getItem("planetAnalysisSubmissions") || "[]"
          );
          submissions.push({
            ...finalResult,
            timestamp: new Date().toISOString(),
            id: Date.now().toString(),
          });
          localStorage.setItem(
            "planetAnalysisSubmissions",
            JSON.stringify(submissions)
          );
        } catch (err) {
          console.log("LocalStorage not available");
        }
        
        // DONE - Exit here, don't do anything else!
        return;
      }

      // If we reach here, response was invalid
      throw new Error("Invalid API response");

    } catch (error) {
      console.error("Error:", error);
      
      // Show error or demo data
      alert("API Error: " + error.message + ". Using demo mode.");
      
      // Generate demo data
      const demoResult = {
        object_id: data.object_id,
        percent: (70 + Math.random() * 20).toFixed(1),
        planet_radius: (1 + Math.random() * 5).toFixed(2),
        semi_major_axis: (0.5 + Math.random() * 1.5).toFixed(4),
        eq_temperature: Math.round(500 + Math.random() * 1500)
      };
      
      if (waitingState) waitingState.style.display = "none";
      if (resultsDisplay) resultsDisplay.style.display = "block";
      
      if (typeof displayResults === 'function') {
        displayResults(demoResult);
      }
      
      setSubmittingState(false);
    }
  });

  // Helper functions
  function setSubmittingState(isSubmitting) {
    if (!submitBtn) return;

    const btnText = submitBtn.querySelector(".btn-text");
    const spinner = submitBtn.querySelector(".spinner");

    if (isSubmitting) {
      submitBtn.classList.add("loading");
      submitBtn.disabled = true;
      if (btnText) btnText.textContent = "Analyzing...";
      if (spinner) spinner.style.display = "block";
    } else {
      submitBtn.classList.remove("loading");
      if (btnText) btnText.textContent = "Analyze";
      if (spinner) spinner.style.display = "none";
      validateForm();
    }
  }

  // Initialize
  validateForm();
});