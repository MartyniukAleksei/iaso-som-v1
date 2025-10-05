// ✅ WORKING CODE - Replace your fetch section with this:

// Get form data
const formData = new FormData(form);
const data = {};

for (const [name, value] of formData.entries()) {
  data[name] = name === 'stellar_temp' ? parseInt(value) : parseFloat(value);
}

// ✅ Send ONLY 7 fields (remove stellar_radius and object_id)
const apiData = {
  orbital_period: data.orbital_period,
  transit_duration: data.transit_duration,
  transit_depth: data.transit_depth / 100,  // Convert % to decimal
  snr: data.snr,
  stellar_mass: data.stellar_mass,
  stellar_temp: data.stellar_temp,
  stellar_magnitude: data.stellar_magnitude
};

console.log("Sending:", apiData);

const response = await fetch('https://sophia-nasa-ml-app-7bc530f3ab97.herokuapp.com/analyze', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify(apiData)
});

const result = await response.json();
console.log("Result:", result);

if (result.status === 'success' && result.properties) {
  displayResults({
    object_id: data.object_id,
    planet_radius: result.properties.planet_radius.toFixed(2),
    semi_major_axis: result.properties.semi_major_axis.toFixed(4),
    eq_temperature: Math.round(result.properties.planet_temp),
    percent: (result.confidence * 100).toFixed(1)
  });
  setSubmittingState(false);
}