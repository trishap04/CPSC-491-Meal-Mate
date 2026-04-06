const container = document.getElementById("directory");
const statusBox = document.getElementById("status");
const addressInput = document.getElementById("addressInput");

let donationDirectory = [];

const csvFile = "Food Banks, Pantries and Soup Kitchens (Proximity).csv";

// ---------- CSV ----------
function getField(row, names) {
  for (let name of names) {
    if (row[name]) return row[name];
  }
  return "";
}

function loadCSV() {
  Papa.parse(csvFile, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function(results) {

      donationDirectory = results.data.map(row => ({
        name: getField(row, ["Name"]),
        address: getField(row, ["Address"]),
        city: getField(row, ["City"]),
        state: getField(row, ["State"]),
        lat: parseFloat(getField(row, ["Latitude"])),
        lng: parseFloat(getField(row, ["Longitude"]))
      })).filter(site => !isNaN(site.lat));

      renderDirectory();
    }
  });
}

// ---------- Distance ----------
function getDistance(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI/180;
  const dLng = (lng2 - lng1) * Math.PI/180;

  const a =
    Math.sin(dLat/2)**2 +
    Math.cos(lat1*Math.PI/180) *
    Math.cos(lat2*Math.PI/180) *
    Math.sin(dLng/2)**2;

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

// ---------- Render ----------
function renderDirectory() {
  container.innerHTML = "";

  donationDirectory.forEach(site => {
    const div = document.createElement("div");
    div.className = "site";

    div.innerHTML = `
      <h3>${site.name}</h3>
      <p>${site.address}, ${site.city}</p>
      ${site.distance ? `<p>${site.distance.toFixed(2)} miles away</p>` : ""}
      <a href="https://www.google.com/maps?q=${site.lat},${site.lng}" target="_blank">
        Open in Google Maps
      </a>
    `;

    container.appendChild(div);
  });
}

// ---------- Geocoding ----------
async function geocodeAddress(address) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
  );

  const data = await res.json();

  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    display: data[0].display_name
  };
}

// reverse → get readable address
async function reverseGeocode(lat, lng) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
  );

  const data = await res.json();
  return data.display_name;
}

// ---------- MAIN ----------
async function findClosestPlace() {

  const input = addressInput.value.trim();

  // 🔹 If user typed address
  if (input) {
    statusBox.textContent = "Searching address...";

    const result = await geocodeAddress(input);

    addressInput.value = result.display;

    calculateDistances(result.lat, result.lng);

    return;
  }

  // 🔹 If EMPTY → use GPS
  statusBox.textContent = "Getting your location...";

  navigator.geolocation.getCurrentPosition(async (pos) => {

    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;

    // ⭐ auto-fill address box
    const address = await reverseGeocode(lat, lng);
    addressInput.value = address;

    calculateDistances(lat, lng);

  });
}

// ---------- Distance + Sort ----------
function calculateDistances(lat, lng) {

  donationDirectory.forEach(site => {
    site.distance = getDistance(lat, lng, site.lat, site.lng);
  });

  donationDirectory.sort((a,b) => a.distance - b.distance);

  statusBox.textContent = "Showing nearest locations";

  renderDirectory();
}

// ---------- START ----------
loadCSV();