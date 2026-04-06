const container = document.getElementById("directory");
const statusBox = document.getElementById("status");
const addressInput = document.getElementById("addressInput");

let donationDirectory = [];
let userMarker = null;
let siteMarkers = [];

const csvFile = "Food Banks, Pantries and Soup Kitchens (Proximity).csv";


const map = L.map("map").setView([33.8704, -117.9243], 10);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);


function getField(row, names) {
  for (const name of names) {
    if (row[name] !== undefined && row[name] !== null && row[name] !== "") {
      return row[name];
    }
  }
  return "";
}

function formatURL(url) {
  if (!url) return "";
  const trimmed = url.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return "https://" + trimmed;
}

function getGoogleMapsLink(site) {
  return `https://www.google.com/maps?q=${site.lat},${site.lng}`;
}


function loadCSV() {
  Papa.parse(csvFile, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function(results) {
      donationDirectory = results.data
        .map((row, index) => {
          const name = getField(row, ["Name", "name", "Agency", "Organization"]);
          const address = getField(row, ["Address", "address", "Street", "Street Address"]);
          const city = getField(row, ["City", "city"]);
          const state = getField(row, ["State", "state"]);
          const zip = getField(row, ["Zip", "ZIP", "Zip Code", "Postal Code"]);
          const website = getField(row, ["Website", "website", "URL", "Url", "Web Address"]);
          const latitude = parseFloat(getField(row, ["Latitude", "latitude", "Lat"]));
          const longitude = parseFloat(getField(row, ["Longitude", "longitude", "Lng", "Lon"]));

          return {
            id: index + 1,
            name: name || "Food Bank",
            address: address || "Address not listed",
            city: city || "",
            state: state || "",
            zip: zip || "",
            website: website || "",
            lat: latitude,
            lng: longitude
          };
        })
        .filter(site => !isNaN(site.lat) && !isNaN(site.lng));

      statusBox.textContent = `Loaded ${donationDirectory.length} donation sites.`;
      renderDirectory(donationDirectory);
      updateMap(donationDirectory);
    },
    error: function(err) {
      statusBox.textContent = "Error loading CSV file.";
      console.error("CSV Load Error:", err);
    }
  });
}


function getDistance(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}


function renderDirectory(list = donationDirectory) {
  container.innerHTML = "";

  if (list.length === 0) {
    container.innerHTML = "<p>No donation sites found.</p>";
    return;
  }

  list.forEach(site => {
    const div = document.createElement("div");
    div.className = "site";

    const locationText = [site.city, site.state, site.zip].filter(Boolean).join(", ");

    div.innerHTML = `
      <h3>${site.name}</h3>
      <p><strong>Address:</strong> ${site.address}</p>
      <p><strong>Location:</strong> ${locationText || "Not listed"}</p>
      ${
        site.website
          ? `<p><strong>Website:</strong> <a href="${formatURL(site.website)}" target="_blank">Visit Website</a></p>`
          : `<p><strong>Website:</strong> Not listed</p>`
      }
      <p><strong>Maps:</strong> <a href="${getGoogleMapsLink(site)}" target="_blank">Open in Google Maps</a></p>
      ${
        site.distance !== undefined
          ? `<p><strong>Distance:</strong> ${site.distance.toFixed(2)} miles away</p>`
          : ""
      }
    `;

    container.appendChild(div);
  });
}


function clearSiteMarkers() {
  siteMarkers.forEach(marker => map.removeLayer(marker));
  siteMarkers = [];
}

function updateMap(list) {
  clearSiteMarkers();

  if (!list.length) return;

  list.forEach(site => {
    const popupHTML = `
      <strong>${site.name}</strong><br>
      ${site.address}<br>
      ${site.city}, ${site.state} ${site.zip || ""}<br>
      ${
        site.website
          ? `<a href="${formatURL(site.website)}" target="_blank">Visit Website</a><br>`
          : ""
      }
      <a href="${getGoogleMapsLink(site)}" target="_blank">Open in Google Maps</a>
    `;

    const marker = L.marker([site.lat, site.lng]).addTo(map).bindPopup(popupHTML);
    siteMarkers.push(marker);
  });

  const bounds = L.latLngBounds(list.map(site => [site.lat, site.lng]));

  if (userMarker) {
    bounds.extend(userMarker.getLatLng());
  }

  map.fitBounds(bounds, { padding: [30, 30] });
}

function setUserMarker(lat, lng, popupText = "Your Location") {
  if (userMarker) {
    map.removeLayer(userMarker);
  }

  userMarker = L.marker([lat, lng]).addTo(map).bindPopup(popupText);
}


async function geocodeAddress(address) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
  );

  const data = await res.json();

  if (!data.length) {
    throw new Error("Address not found.");
  }

  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    display: data[0].display_name
  };
}

async function reverseGeocode(lat, lng) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
  );

  const data = await res.json();
  return data.display_name || "Current Location";
}


function calculateDistances(lat, lng) {
  donationDirectory.forEach(site => {
    site.distance = getDistance(lat, lng, site.lat, site.lng);
  });

  donationDirectory.sort((a, b) => a.distance - b.distance);

  renderDirectory(donationDirectory);
  updateMap(donationDirectory.slice(0, 20)); 
}


async function findClosestPlace() {
  const input = addressInput.value.trim();

  if (input) {
    statusBox.textContent = "Searching address...";

    try {
      const result = await geocodeAddress(input);
      addressInput.value = result.display;
      setUserMarker(result.lat, result.lng, "Searched Location");
      calculateDistances(result.lat, result.lng);
      statusBox.textContent = "Showing closest donation sites.";
    } catch (error) {
      statusBox.textContent = error.message;
    }

    return;
  }

  statusBox.textContent = "Getting your location...";

  if (!navigator.geolocation) {
    statusBox.textContent = "Geolocation is not supported by your browser.";
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      try {
        const address = await reverseGeocode(lat, lng);
        addressInput.value = address;
      } catch (error) {
        addressInput.value = "Current Location";
      }

      setUserMarker(lat, lng, "Your Current Location");
      calculateDistances(lat, lng);
      statusBox.textContent = "Showing closest donation sites near your location.";
    },
    () => {
      statusBox.textContent = "Unable to get your location.";
    }
  );
}


addressInput.addEventListener("keypress", function(event) {
  if (event.key === "Enter") {
    findClosestPlace();
  }
});


loadCSV();