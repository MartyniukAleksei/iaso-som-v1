// FINAL VERSION WITH DEBUG LOGGING
document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("observationForm");
  const submitBtn = document.getElementById("submitBtn");
  const fillSampleBtn = document.getElementById("fillSampleData");

  if (!form) {
    console.error("Form not found!");
    return;
  }

  // Field validators (keeping your existing ones)
  const fieldValidators = {
    object_id: (value) => !value ? "Object ID required" : "",
    transit_depth: (value) => {
      const num = parseFloat(value);
      return isNaN(num) || num < 0 || num > 100 ? "Invalid transit depth" : "";
    },
    orbital_period: (value) => {
      const num = parseFloat(value);
      return isNaN(num) || num <= 0 ? "Invalid orbital period" : "";
    },
    transit_duration: (value) => {
      const num = parseFloat(value);
      return isNaN(num) || num <= 0 ? "Invalid transit duration" : "";
    },
    snr: (value) => {
      const num = parseFloat(value);
      return isNaN(num) || num <= 0 ? "Invalid SNR" : "";
    },
    stellar_radius: (value) => {
      const num = parseFloat(value);
      return isNaN(num) || num <= 0 ? "Invalid stellar radius" : "";
    },
    stellar_mass: (value) => {
      const num = parseFloat(value);
      return isNaN(num) || num <= 0 ? "Invalid stellar mass" : "";
    },
    stellar_temp: (value) => {
      const num = parseInt(value);
      return isNaN(num) || num < 2500 || num > 50000 ? "Invalid temperature" : "";
    },
    stellar_magnitude: (value) => {
      const num = parseFloat(value);
      return isNaN(num) ? "Invalid magnitude" : "";
    },
  };

  function validateField(fieldName, value) {
    const validator = fieldValidators[fieldName];
    return validator ? validator(value) : "";
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
    }
  }

  function validateForm() {
    const formData = new FormData(form);
    let isValid = true;
    for (const [name, value] of formData.entries()) {
      if (validateField(name, value)) isValid = false;
    }
    if (submitBtn) submitBtn.disabled = !isValid;
    return isValid;
  }

  form.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", (e) => {
      updateFieldValidation(e.target);
      validateForm();
    });
  });

  if (fillSampleBtn) {
    fillSampleBtn.addEventListener("click", () => {
      const sampleData = {
        object_id: "KOI-7016", transit_depth: 1.234, orbital_period: 365.25,
        transit_duration: 6.5, snr: 12.8, stellar_radius: 1.02,
        stellar_mass: 0.98, stellar_temp: 5778, stellar_magnitude: 11.5,
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

  // MAIN FORM SUBMISSION - WITH EXTENSIVE DEBUG
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSubmittingState(true);

    const formData = new FormData(form);
    const data = {};
    for (const [name, value] of formData.entries()) {
      data[name] = name === "stellar_temp" ? parseInt(value) : parseFloat(value);
    }

    try {
      const apiData = {
        orbital_period: parseFloat(data.orbital_period) || 0,
        transit_duration: parseFloat(data.transit_duration) || 0,
        transit_depth: (parseFloat(data.transit_depth) || 0) / 100,
        snr: parseFloat(data.snr) || 0,
        stellar_mass: parseFloat(data.stellar_mass) || 0,
        stellar_temp: parseInt(data.stellar_temp) || 0,
        stellar_magnitude: parseFloat(data.stellar_magnitude) || 0
      };

      const hasNaN = Object.values(apiData).some(v => isNaN(v) || v === 0);
      if (hasNaN) {
        throw new Error("Invalid data");
      }

      console.log("Sending:", apiData);

      const response = await fetch(
        "https://sophia-nasa-ml-app-7bc530f3ab97.herokuapp.com/analyze",
        { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(apiData) }
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const result = await response.json();
      console.log("API Result:", result);

      if (result.status === 'success') {
        
        // DEBUG: Check what elements exist
        console.log("Checking DOM elements...");
        console.log("  resultsSection:", !!document.getElementById("resultsSection"));
        console.log("  resultsDisplay:", !!document.getElementById("resultsDisplay"));
        console.log("  waitingState:", !!document.getElementById("waitingState"));
        
        if (result.classification === 'false_positive') {
          // FALSE POSITIVE
          alert("FALSE POSITIVE: Not a planet! Likely eclipsing binary.");
          setSubmittingState(false);
          
        } else if (result.properties) {
          // PLANET (confirmed or candidate)
          console.log("Displaying planet properties...");
          
          // Try multiple display methods to ensure something works
          
          // Method 1: Update existing result elements by ID
          const updateElement = (id, value) => {
            const el = document.getElementById(id);
            if (el) {
              el.textContent = value;
              console.log(`  Updated ${id}:`, value);
            } else {
              console.log(`  Element not found: ${id}`);
            }
          };
          
          updateElement("result-object-id", data.object_id);
          updateElement("result-classification", result.classification.toUpperCase());
          updateElement("result-confidence", (result.confidence * 100).toFixed(1) + "%");
          updateElement("result-planet-radius", result.properties.planet_radius.toFixed(2));
          updateElement("result-temperature", Math.round(result.properties.planet_temp));
          updateElement("result-semi-major-axis", result.properties.semi_major_axis.toFixed(4));
          updateElement("result-impact-parameter", result.properties.impact_parameter.toFixed(4));
          
          // Method 2: Update resultsDisplay with innerHTML
          const resultsDisplay = document.getElementById("resultsDisplay");
          if (resultsDisplay) {
            console.log("  Found resultsDisplay, setting innerHTML");
            resultsDisplay.style.display = "block";
            resultsDisplay.innerHTML = `
              <div style="padding: 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 15px; color: white; margin: 20px 0;">
                <h2 style="margin: 0 0 20px 0;">${result.classification.replace(/_/g, ' ').toUpperCase()}</h2>
                
                <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                  <div style="font-size: 14px; opacity: 0.9;">Object ID: ${data.object_id}</div>
                  <div style="font-size: 18px; font-weight: bold; margin-top: 5px;">Confidence: ${(result.confidence * 100).toFixed(1)}%</div>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                  <div style="background: rgba(255,255,255,0.95); padding: 20px; border-radius: 10px; color: #333; text-align: center;">
                    <div style="font-size: 12px; color: #666; margin-bottom: 5px;">PLANET RADIUS</div>
                    <div style="font-size: 28px; font-weight: bold; color: #667eea;">${result.properties.planet_radius.toFixed(2)}</div>
                    <div style="font-size: 14px; color: #888;">Earth Radii</div>
                  </div>
                  
                  <div style="background: rgba(255,255,255,0.95); padding: 20px; border-radius: 10px; color: #333; text-align: center;">
                    <div style="font-size: 12px; color: #666; margin-bottom: 5px;">TEMPERATURE</div>
                    <div style="font-size: 28px; font-weight: bold; color: #764ba2;">${Math.round(result.properties.planet_temp)}</div>
                    <div style="font-size: 14px; color: #888;">Kelvin</div>
                  </div>
                  
                  <div style="background: rgba(255,255,255,0.95); padding: 20px; border-radius: 10px; color: #333; text-align: center;">
                    <div style="font-size: 12px; color: #666; margin-bottom: 5px;">SEMI-MAJOR AXIS</div>
                    <div style="font-size: 28px; font-weight: bold; color: #667eea;">${result.properties.semi_major_axis.toFixed(4)}</div>
                    <div style="font-size: 14px; color: #888;">AU</div>
                  </div>
                  
                  <div style="background: rgba(255,255,255,0.95); padding: 20px; border-radius: 10px; color: #333; text-align: center;">
                    <div style="font-size: 12px; color: #666; margin-bottom: 5px;">IMPACT PARAMETER</div>
                    <div style="font-size: 28px; font-weight: bold; color: #764ba2;">${result.properties.impact_parameter.toFixed(4)}</div>
                    <div style="font-size: 14px; color: #888;">Transit Geometry</div>
                  </div>
                </div>
              </div>
            `;
          } else {
            console.error("  resultsDisplay element not found!");
          }
          
          // Method 3: Show resultsSection
          const resultsSection = document.getElementById("resultsSection");
          if (resultsSection) {
            console.log("  Showing resultsSection");
            resultsSection.style.display = "block";
          } else {
            console.error("  resultsSection not found!");
          }
          
          // Method 4: Hide waiting state
          const waitingState = document.getElementById("waitingState");
          if (waitingState) {
            console.log("  Hiding waitingState");
            waitingState.style.display = "none";
          }
          
          // Method 5: Try original displayResults
          if (typeof displayResults === 'function') {
            console.log("  Calling original displayResults()");
            try {
              displayResults({
                object_id: data.object_id,
                planet_radius: result.properties.planet_radius.toFixed(2),
                semi_major_axis: result.properties.semi_major_axis.toFixed(4),
                eq_temperature: Math.round(result.properties.planet_temp),
                percent: (result.confidence * 100).toFixed(1)
              });
            } catch (e) {
              console.log("  displayResults() failed:", e.message);
            }
          } else {
            console.log("  displayResults() function doesn't exist");
          }
          
          console.log("ALL DISPLAY METHODS ATTEMPTED");
          setSubmittingState(false);
        }
      }

    } catch (error) {
      console.error("Error:", error);
      alert("Error: " + error.message);
      setSubmittingState(false);
    }
  });

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

  // Add validation handlers
  form.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", (e) => {
      updateFieldValidation(e.target);
      validateForm();
    });
  });

  validateForm();
  
  console.log("Form handler loaded successfully");
});