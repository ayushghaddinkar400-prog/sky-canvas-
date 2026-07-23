const cityInput = document.getElementById("cityInput");
const searchButton = document.getElementById("searchButton");
const statusMessage = document.getElementById("statusMessage");
const cityName = document.getElementById("cityName");
const dateText = document.getElementById("dateText");
const temperature = document.getElementById("temperature");
const weatherIcon = document.getElementById("weatherIcon");
const weatherDescription = document.getElementById("weatherDescription");
const feelsLike = document.getElementById("feelsLike");
const humidityEl = document.getElementById("humidity");
const windEl = document.getElementById("wind");
const pressureEl = document.getElementById("pressure");
const sunriseEl = document.getElementById("sunrise");
const sunsetEl = document.getElementById("sunset");
const airQualityEl = document.getElementById("airQuality");
const uvOutlookEl = document.getElementById("uvOutlook");
const forecastCards = document.getElementById("forecastCards");
const hourlyStrip = document.getElementById("hourlyStrip");
const lastUpdated = document.getElementById("lastUpdated");
const aiInsight = document.getElementById("aiInsight");
const aiAction = document.getElementById("aiAction");
const currentLocationButton = document.getElementById(
  "currentLocationButton",
);
const favoriteButton = document.getElementById("favoriteButton");
const shareButton = document.getElementById("shareButton");
const unitToggle = document.getElementById("unitToggle");
const themeToggle = document.getElementById("themeToggle");
const authArea = document.getElementById("authArea");
const chipRow = document.getElementById("chipRow");
const skyParticles = document.getElementById("skyParticles");
const cropSelect = document.getElementById("cropSelect");
const frostBanner = document.getElementById("frostBanner");
const soilTempEl = document.getElementById("soilTemp");
const soilMoistureEl = document.getElementById("soilMoisture");
const rainfallTotalEl = document.getElementById("rainfallTotal");
const gddTotalEl = document.getElementById("gddTotal");
const gddSubEl = document.getElementById("gddSub");
const sprayWindowEl = document.getElementById("sprayWindow");
const irrigationTipEl = document.getElementById("irrigationTip");

const WEATHER_CODES = {
  0: { label: "Clear sky", icon: "☀️", mood: "clear" },
  1: { label: "Mostly clear", icon: "🌤️", mood: "clear" },
  2: { label: "Partly cloudy", icon: "⛅", mood: "cloudy" },
  3: { label: "Overcast", icon: "☁️", mood: "cloudy" },
  45: { label: "Fog", icon: "🌫️", mood: "fog" },
  48: { label: "Rime fog", icon: "🌫️", mood: "fog" },
  51: { label: "Light drizzle", icon: "🌦️", mood: "rain" },
  53: { label: "Moderate drizzle", icon: "🌦️", mood: "rain" },
  55: { label: "Dense drizzle", icon: "🌧️", mood: "rain" },
  61: { label: "Light rain", icon: "🌧️", mood: "rain" },
  63: { label: "Moderate rain", icon: "🌧️", mood: "rain" },
  65: { label: "Heavy rain", icon: "⛈️", mood: "storm" },
  71: { label: "Light snow", icon: "🌨️", mood: "snow" },
  73: { label: "Moderate snow", icon: "🌨️", mood: "snow" },
  75: { label: "Heavy snow", icon: "❄️", mood: "snow" },
  95: { label: "Thunderstorm", icon: "⛈️", mood: "storm" },
  96: { label: "Thunderstorm with hail", icon: "⛈️", mood: "storm" },
  99: { label: "Thunderstorm with hail", icon: "⛈️", mood: "storm" },
};

const AQI_LABELS = [
  { max: 50, label: "Good" },
  { max: 100, label: "Moderate" },
  { max: 150, label: "Unhealthy (sensitive)" },
  { max: 200, label: "Unhealthy" },
  { max: 300, label: "Very unhealthy" },
  { max: Infinity, label: "Hazardous" },
];

let currentQuery = "London";
let currentPlace = null;
let currentWeatherData = null;
let unit = localStorage.getItem("skylight-unit") || "metric";
let map;
let marker;
let isAuthenticated = false;

/* ---------------- Theme ---------------- */
function applyTheme(theme) {
  document.body.dataset.theme = theme;
  themeToggle.textContent = theme === "light" ? "☀️" : "🌙";
  localStorage.setItem("skylight-theme", theme);
}
applyTheme(localStorage.getItem("skylight-theme") || "dark");
themeToggle.addEventListener("click", () => {
  applyTheme(document.body.dataset.theme === "light" ? "dark" : "light");
});

/* ---------------- Units ---------------- */
function applyUnitLabel() {
  unitToggle.textContent = unit === "metric" ? "°C" : "°F";
}
applyUnitLabel();
unitToggle.addEventListener("click", () => {
  unit = unit === "metric" ? "imperial" : "metric";
  localStorage.setItem("skylight-unit", unit);
  applyUnitLabel();
  if (currentPlace && currentWeatherData) {
    renderWeather(currentPlace, currentWeatherData);
  }
});

function formatTemp(celsius) {
  if (celsius === null || celsius === undefined) return "--";
  const value =
    unit === "metric" ? celsius : celsius * (9 / 5) + 32;
  return `${Math.round(value)}°${unit === "metric" ? "C" : "F"}`;
}

function formatWind(kmh) {
  if (kmh === null || kmh === undefined) return "--";
  const value = unit === "metric" ? kmh : kmh * 0.621371;
  return `${Math.round(value)} ${unit === "metric" ? "km/h" : "mph"}`;
}

/* ---------------- Sky mood + particles ---------------- */
function applySkyMood(weatherCode, isDay) {
  const meta = WEATHER_CODES[weatherCode] || { mood: "clear" };
  document.body.dataset.mood = meta.mood;
  document.body.dataset.daypart = isDay ? "day" : "night";
  renderParticles(meta.mood);
}

function renderParticles(mood) {
  skyParticles.innerHTML = "";
  if (mood !== "rain" && mood !== "storm" && mood !== "snow") return;

  const count = mood === "snow" ? 40 : 60;
  const symbol = mood === "snow" ? "❄" : "|";
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < count; i += 1) {
    const drop = document.createElement("span");
    drop.className = `particle particle--${mood}`;
    drop.textContent = mood === "snow" ? symbol : "";
    drop.style.left = `${Math.random() * 100}%`;
    drop.style.animationDelay = `${Math.random() * 4}s`;
    drop.style.animationDuration = `${(mood === "snow" ? 6 : 1) + Math.random() * 2}s`;
    fragment.appendChild(drop);
  }
  skyParticles.appendChild(fragment);
}

/* ---------------- Auth area ---------------- */
async function refreshAuthArea() {
  try {
    const res = await fetch("backend/session_check.php", {
      credentials: "same-origin",
    });
    const data = await res.json();
    isAuthenticated = Boolean(data.authenticated);
    if (isAuthenticated) {
      authArea.innerHTML = `
        <span class="auth-greeting">Hi, ${escapeHtml(data.username)}</span>
        <button id="logoutBtn" class="pill-toggle" type="button">Log out</button>
      `;
      document.getElementById("logoutBtn").addEventListener("click", async () => {
        await fetch("backend/logout.php", { credentials: "same-origin" });
        window.location.reload();
      });
      loadFavorites();
    } else {
      authArea.innerHTML = `<a class="signin-link" href="login.html">Sign in</a>`;
      renderRecentChips();
    }
  } catch (error) {
    isAuthenticated = false;
    authArea.innerHTML = `<a class="signin-link" href="login.html">Sign in</a>`;
    renderRecentChips();
  }
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

/* ---------------- Favorites (logged in) ---------------- */
async function loadFavorites() {
  try {
    const res = await fetch("backend/favorites_list.php", {
      credentials: "same-origin",
    });
    const data = await res.json();
    if (!data.success) return;
    chipRow.innerHTML = "";
    data.favorites.forEach((fav) => {
      const chip = document.createElement("button");
      chip.className = "chip";
      chip.type = "button";
      chip.innerHTML = `★ ${escapeHtml(fav.city_name)} <span class="chip-remove" data-id="${fav.id}">✕</span>`;
      chip.addEventListener("click", (event) => {
        if (event.target.classList.contains("chip-remove")) {
          event.stopPropagation();
          removeFavorite(fav.id);
          return;
        }
        fetchWeather(fav.city_name).catch((error) =>
          updateStatus(error.message, true),
        );
      });
      chipRow.appendChild(chip);
    });
  } catch (error) {
    console.warn("Could not load favorites", error);
  }
}

async function removeFavorite(id) {
  await fetch("backend/favorites_remove.php", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  loadFavorites();
}

async function saveFavorite() {
  if (!currentPlace) return;
  const res = await fetch("backend/session_check.php", {
    credentials: "same-origin",
  });
  const session = await res.json();
  if (!session.authenticated) {
    updateStatus("Sign in to save favorite cities.", true);
    return;
  }
  await fetch("backend/favorites_add.php", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      city_name: currentPlace.name,
      country: currentPlace.country || "",
      latitude: currentPlace.latitude,
      longitude: currentPlace.longitude,
    }),
  });
  loadFavorites();
}
favoriteButton.addEventListener("click", saveFavorite);

/* ---------------- Recent searches (guests) ---------------- */
function renderRecentChips() {
  const recent = JSON.parse(localStorage.getItem("skylight-recent") || "[]");
  chipRow.innerHTML = "";
  recent.forEach((city) => {
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.type = "button";
    chip.textContent = city;
    chip.addEventListener("click", () =>
      fetchWeather(city).catch((error) => updateStatus(error.message, true)),
    );
    chipRow.appendChild(chip);
  });
}

function pushRecent(cityLabel) {
  let recent = JSON.parse(localStorage.getItem("skylight-recent") || "[]");
  recent = [cityLabel, ...recent.filter((c) => c !== cityLabel)].slice(0, 6);
  localStorage.setItem("skylight-recent", JSON.stringify(recent));
}

/* ---------------- Map (Google Maps) ---------------- */
function showMapError(message) {
  const mapEl = document.getElementById("weatherMap");
  if (mapEl) {
    mapEl.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;padding:16px;text-align:center;color:var(--muted);font-size:0.85rem;">${message}</div>`;
  }
}

// Fires if the Google Maps <script> tag itself fails to load (network
// blocked, ad blocker, offline, wrong URL, etc.) — separate from an
// invalid/missing API key, which triggers gm_authFailure below instead.
window.handleMapsScriptError = function () {
  showMapError(
    "Couldn't load Google Maps. Check your internet connection or ad blocker.",
  );
};

// Google calls this automatically when the API key is missing, invalid,
// unauthorized for this domain, or billing isn't enabled on the project.
// This is almost certainly what's firing if you still see the placeholder
// key in index.html.
window.gm_authFailure = function () {
  showMapError(
    "Google Maps couldn't authenticate. Replace YOUR_GOOGLE_MAPS_API_KEY in index.html with a valid key (Maps JavaScript API enabled, billing set up).",
  );
  updateStatus(
    "Live map disabled: invalid Google Maps API key.",
    true,
  );
};

// Called automatically by the Google Maps script tag in index.html
// once the Maps JavaScript API has finished loading (callback=initMap).
function initMap() {
  if (typeof google === "undefined" || !google.maps) {
    // Defensive guard: initMap should only ever be invoked by Google's own
    // callback once google.maps is ready, but bail out cleanly just in case.
    showMapError("Google Maps failed to initialize.");
    return;
  }
  const defaultCenter = { lat: 51.5072, lng: -0.1276 };

  map = new google.maps.Map(document.getElementById("weatherMap"), {
    center: defaultCenter,
    zoom: 4,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    clickableIcons: false,
  });

  map.addListener("click", async (event) => {
    try {
      const lat = event.latLng.lat();
      const lon = event.latLng.lng();
      const reverseRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=en&format=json`,
      );
      const reverseData = await reverseRes.json();
      const place = reverseData.results?.[0];
      if (!place?.name) {
        throw new Error("Unable to resolve that place.");
      }
      await fetchWeather(place.name);
    } catch (error) {
      updateStatus(error.message, true);
    }
  });

  // If weather data already finished loading before the Maps API callback
  // fired, place the marker immediately instead of waiting for the next
  // renderWeather() call.
  if (currentPlace && currentPlace.latitude && currentPlace.longitude) {
    const position = {
      lat: currentPlace.latitude,
      lng: currentPlace.longitude,
    };
    marker = new google.maps.Marker({ position, map });
    map.setCenter(position);
    map.setZoom(6);
  }
}
// Expose globally so the Google Maps callback param can find it.
window.initMap = initMap;

/* ---------------- AI insight ---------------- */
function renderAIInsight(current, daily) {
  const temp = current.temperature_2m;
  const relHumidity = current.relative_humidity_2m;
  const precipitation = current.precipitation;
  const maxTemp = Math.round(daily.temperature_2m_max[0]);
  const uv = daily.uv_index_max ? daily.uv_index_max[0] : 0;

  const windNow = current.wind_speed_10m;
  let insight = "Conditions look steady, with nothing urgent for fieldwork today.";
  let action = "Good general day for routine field tasks.";

  if (temp <= 2) {
    insight = "Temperatures are near or below freezing right now.";
    action = "Hold off on irrigation and check young plants for frost damage.";
  } else if (temp >= 35) {
    insight = "Heat is intense, which raises crop and livestock water demand.";
    action = "Water early morning or evening and watch animals for heat stress.";
  } else if (precipitation > 2) {
    insight = "Active rain is falling, so fields may become too wet to work.";
    action = "Delay spraying, tillage, and harvest until it dries out.";
  } else if (windNow >= 20) {
    insight = "Wind is too strong for accurate, drift-free spraying right now.";
    action = "Wait for calmer conditions before applying chemicals.";
  } else if (relHumidity > 85) {
    insight = "Humidity is high, which raises the risk of fungal disease.";
    action = "Scout for blight and mildew, and improve field airflow if possible.";
  } else if (uv >= 8) {
    insight = "UV levels are high for a large part of the day.";
    action = "Schedule outdoor labor for early morning or late afternoon.";
  } else if (maxTemp >= 24 && windNow < 15) {
    insight = "Mild temperatures and calm wind make today workable in the field.";
    action = "A solid window for spraying, planting, or general field work.";
  }

  aiInsight.textContent = insight;
  aiAction.textContent = action;
}

function updateStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.style.color = isError ? "var(--error)" : "var(--muted)";
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
    });
  });
}

/* ---------------- Air quality ---------------- */
async function fetchAirQuality(lat, lon) {
  try {
    const res = await fetch(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi`,
    );
    if (!res.ok) throw new Error("AQI unavailable");
    const data = await res.json();
    const aqi = data.current?.us_aqi;
    if (aqi === undefined || aqi === null) {
      airQualityEl.textContent = "--";
      return;
    }
    const bracket = AQI_LABELS.find((b) => aqi <= b.max);
    airQualityEl.textContent = `${Math.round(aqi)} · ${bracket.label}`;
  } catch (error) {
    airQualityEl.textContent = "--";
  }
}

/* ---------------- Core fetch ---------------- */
async function fetchWeather(query) {
  updateStatus("Fetching live weather data...");

  const geoRes = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`,
  );
  if (!geoRes.ok) {
    throw new Error("Location search failed. Please try again.");
  }
  const geoData = await geoRes.json();

  if (!geoData.results?.length) {
    throw new Error("City not found. Try another location.");
  }

  const place = geoData.results[0];
  const weatherRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,wind_speed_10m,wind_direction_10m,pressure_msl` +
      `&hourly=temperature_2m,weather_code,is_day,precipitation,precipitation_probability,wind_speed_10m,soil_temperature_0cm,soil_moisture_0_to_1cm` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,sunrise,sunset,uv_index_max,et0_fao_evapotranspiration` +
      `&timezone=auto`,
  );
  if (!weatherRes.ok) {
    throw new Error("Weather data retrieval failed. Please try again.");
  }
  const weatherData = await weatherRes.json();

  if (!weatherData.current) {
    throw new Error("Weather data could not be loaded.");
  }

  currentPlace = place;
  currentWeatherData = weatherData;
  renderWeather(place, weatherData);
  fetchAirQuality(place.latitude, place.longitude);
  currentQuery = query;
  if (!isAuthenticated) {
    pushRecent(`${place.name}${place.country ? `, ${place.country}` : ""}`);
    renderRecentChips();
  }
}

async function loadWeatherByLocation() {
  updateStatus("Detecting your location...");
  try {
    const position = await getCurrentPosition();
    const reverseRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&language=en&format=json`,
    );
    if (!reverseRes.ok) {
      throw new Error("Unable to resolve your location.");
    }
    const reverseData = await reverseRes.json();
    const place = reverseData.results?.[0];
    if (!place?.name) {
      throw new Error("Unable to resolve your current city.");
    }
    await fetchWeather(place.name);
  } catch (error) {
    updateStatus(error.message || "Unable to detect your location.", true);
    throw error;
  }
}

/* ---------------- Render ---------------- */
function renderWeather(place, data) {
  const current = data.current;
  const daily = data.daily;
  const hourly = data.hourly;
  const weatherMeta = WEATHER_CODES[current.weather_code] || {
    label: "Unknown",
    icon: "🌈",
    mood: "clear",
  };

  cityName.textContent = `${place.name}${place.country ? `, ${place.country}` : ""}`;
  dateText.textContent = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  temperature.textContent = formatTemp(current.temperature_2m);
  weatherIcon.textContent = weatherMeta.icon;
  weatherDescription.textContent = weatherMeta.label;
  feelsLike.textContent = formatTemp(current.apparent_temperature);
  humidityEl.textContent = `${current.relative_humidity_2m}%`;
  windEl.textContent = formatWind(current.wind_speed_10m);
  pressureEl.textContent = `${Math.round(current.pressure_msl)} hPa`;
  sunriseEl.textContent = daily.sunrise
    ? new Date(daily.sunrise[0]).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })
    : "--";
  sunsetEl.textContent = daily.sunset
    ? new Date(daily.sunset[0]).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })
    : "--";
  uvOutlookEl.textContent = daily.uv_index_max
    ? `${daily.uv_index_max[0].toFixed(1)} index`
    : "--";
  lastUpdated.textContent = `Updated ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;

  applySkyMood(current.weather_code, current.is_day === 1);
  renderAIInsight(current, daily);
  renderHourly(hourly);
  renderFarmInsights(current, daily, hourly);
  statusMessage.textContent = "Live weather data is ready.";

  if (map && place.latitude && place.longitude) {
    const nextView = { lat: place.latitude, lng: place.longitude };
    if (!marker) {
      marker = new google.maps.Marker({ position: nextView, map });
    } else {
      marker.setPosition(nextView);
    }
    map.setCenter(nextView);
    map.setZoom(Math.max(map.getZoom(), 6));
  }

  forecastCards.innerHTML = "";
  daily.time.slice(0, 7).forEach((day, index) => {
    const meta = WEATHER_CODES[daily.weather_code[index]] || {
      label: "Unknown",
      icon: "🌈",
    };
    const card = document.createElement("article");
    card.className = "forecast-card";
    card.innerHTML = `
      <div class="day">${new Date(day).toLocaleDateString(undefined, { weekday: "short" })}</div>
      <span class="forecast-icon">${meta.icon}</span>
      <div>${meta.label}</div>
      <div class="temp-range">${formatTemp(daily.temperature_2m_min[index])} / ${formatTemp(daily.temperature_2m_max[index])}</div>
    `;
    forecastCards.appendChild(card);
  });
}

function renderHourly(hourly) {
  hourlyStrip.innerHTML = "";
  if (!hourly?.time?.length) return;

  const now = new Date();
  const startIndex = hourly.time.findIndex((t) => new Date(t) >= now);
  const from = startIndex === -1 ? 0 : startIndex;

  hourly.time.slice(from, from + 12).forEach((time, i) => {
    const index = from + i;
    const meta = WEATHER_CODES[hourly.weather_code[index]] || {
      icon: "🌈",
      label: "Unknown",
    };
    const card = document.createElement("div");
    card.className = "hour-card";
    card.innerHTML = `
      <div class="hour-label">${new Date(time).toLocaleTimeString([], { hour: "numeric" })}</div>
      <span class="hour-icon">${meta.icon}</span>
      <div class="hour-temp">${formatTemp(hourly.temperature_2m[index])}</div>
    `;
    hourlyStrip.appendChild(card);
  });
}

/* ---------------- Farm insights ---------------- */
function getSelectedGddBase() {
  const raw = cropSelect ? cropSelect.value : "10";
  const base = parseFloat(raw);
  return Number.isFinite(base) ? base : 10;
}

function formatMm(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  if (unit === "imperial") {
    return `${(value / 25.4).toFixed(2)} in`;
  }
  return `${value.toFixed(1)} mm`;
}

function renderFarmInsights(current, daily, hourly) {
  // Soil temperature / moisture: read the first hourly value at/after now
  const now = new Date();
  const startIndex = hourly?.time?.length
    ? Math.max(hourly.time.findIndex((t) => new Date(t) >= now), 0)
    : -1;

  if (startIndex !== -1 && hourly.soil_temperature_0cm) {
    soilTempEl.textContent = formatTemp(hourly.soil_temperature_0cm[startIndex]);
  } else {
    soilTempEl.textContent = "--";
  }
  if (startIndex !== -1 && hourly.soil_moisture_0_to_1cm) {
    const moisture = hourly.soil_moisture_0_to_1cm[startIndex];
    soilMoistureEl.textContent =
      moisture === null || moisture === undefined
        ? "--"
        : `${Math.round(moisture * 100)}%`;
  } else {
    soilMoistureEl.textContent = "--";
  }

  // 7-day rainfall total
  const rainDays = daily.precipitation_sum ? daily.precipitation_sum.slice(0, 7) : [];
  const rainTotal = rainDays.reduce((sum, v) => sum + (v || 0), 0);
  rainfallTotalEl.textContent = rainDays.length ? formatMm(rainTotal) : "--";

  // Growing degree days over the forecast window
  const gddBase = getSelectedGddBase();
  let gdd = 0;
  const days = Math.min(daily.temperature_2m_max?.length || 0, 7);
  for (let i = 0; i < days; i += 1) {
    const tmax = daily.temperature_2m_max[i];
    const tmin = daily.temperature_2m_min[i];
    if (typeof tmax === "number" && typeof tmin === "number") {
      const avg = (tmax + tmin) / 2;
      gdd += Math.max(avg - gddBase, 0);
    }
  }
  gddTotalEl.textContent = days ? `${gdd.toFixed(0)} GDD` : "--";
  gddSubEl.textContent = `next ${days || 7} days, base ${gddBase}°C`;

  // Frost / freeze alert for the next 3 days
  const frostDays = [];
  for (let i = 0; i < Math.min(3, daily.temperature_2m_min?.length || 0); i += 1) {
    if (daily.temperature_2m_min[i] <= 2) {
      frostDays.push({ index: i, temp: daily.temperature_2m_min[i] });
    }
  }
  if (frostDays.length) {
    const worst = frostDays.reduce((a, b) => (b.temp < a.temp ? b : a));
    const isFreeze = worst.temp <= 0;
    const dayLabel =
      worst.index === 0 ? "tonight" : `in ${worst.index} day${worst.index > 1 ? "s" : ""}`;
    frostBanner.hidden = false;
    frostBanner.className = `frost-banner ${isFreeze ? "" : "is-caution"}`.trim();
    frostBanner.textContent = `${isFreeze ? "❄️ Freeze warning" : "🌡️ Frost risk"}: low near ${formatTemp(worst.temp)} ${dayLabel}. Protect tender seedlings and delay irrigation before sunset.`;
  } else {
    frostBanner.hidden = true;
    frostBanner.textContent = "";
  }

  // Spray window: next 24h with wind under 15 km/h and no meaningful rain
  sprayWindowEl.textContent = findSprayWindow(hourly);

  // Irrigation advice: compare rainfall to crop water use (ET0) over the week
  const et0Days = daily.et0_fao_evapotranspiration
    ? daily.et0_fao_evapotranspiration.slice(0, 7)
    : [];
  const et0Total = et0Days.reduce((sum, v) => sum + (v || 0), 0);
  if (et0Days.length && rainDays.length) {
    const deficit = et0Total - rainTotal;
    if (deficit > 15) {
      irrigationTipEl.textContent = `Irrigate soon (deficit ${formatMm(deficit)})`;
    } else if (deficit > 0) {
      irrigationTipEl.textContent = `Light irrigation (deficit ${formatMm(deficit)})`;
    } else {
      irrigationTipEl.textContent = "Rainfall covers demand";
    }
  } else {
    irrigationTipEl.textContent = "--";
  }
}

function findSprayWindow(hourly) {
  if (!hourly?.time?.length) return "--";
  const now = new Date();
  const startIndex = Math.max(
    hourly.time.findIndex((t) => new Date(t) >= now),
    0,
  );
  const windowSize = 24;
  let windowStart = null;

  for (let i = startIndex; i < Math.min(startIndex + windowSize, hourly.time.length); i += 1) {
    const wind = hourly.wind_speed_10m ? hourly.wind_speed_10m[i] : null;
    const precipChance = hourly.precipitation_probability
      ? hourly.precipitation_probability[i]
      : 0;
    const isGood = wind !== null && wind < 15 && (precipChance || 0) < 30;

    if (isGood && windowStart === null) {
      windowStart = i;
    } else if (!isGood && windowStart !== null) {
      if (i - windowStart >= 2) {
        return `${new Date(hourly.time[windowStart]).toLocaleTimeString([], { hour: "numeric" })} – ${new Date(hourly.time[i - 1]).toLocaleTimeString([], { hour: "numeric" })}`;
      }
      windowStart = null;
    }
  }
  if (windowStart !== null) {
    const end = Math.min(startIndex + windowSize, hourly.time.length) - 1;
    if (end - windowStart >= 2) {
      return `${new Date(hourly.time[windowStart]).toLocaleTimeString([], { hour: "numeric" })} – ${new Date(hourly.time[end]).toLocaleTimeString([], { hour: "numeric" })}`;
    }
  }
  return "No clear window in 24h";
}

if (cropSelect) {
  cropSelect.addEventListener("change", () => {
    if (currentWeatherData) {
      renderFarmInsights(
        currentWeatherData.current,
        currentWeatherData.daily,
        currentWeatherData.hourly,
      );
    }
  });
}

/* ---------------- Share ---------------- */
async function shareWeather() {
  if (!currentPlace || !currentWeatherData) return;
  const current = currentWeatherData.current;
  const meta = WEATHER_CODES[current.weather_code] || { label: "weather" };
  const text = `${currentPlace.name}: ${formatTemp(current.temperature_2m)}, ${meta.label}. Feels like ${formatTemp(current.apparent_temperature)}. Shared from Skylight.`;

  if (navigator.share) {
    try {
      await navigator.share({ title: "Skylight weather", text });
      return;
    } catch (error) {
      // user cancelled or share failed, fall through to clipboard
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    updateStatus("Forecast summary copied to clipboard.");
  } catch (error) {
    updateStatus(text);
  }
}
shareButton.addEventListener("click", shareWeather);

/* ---------------- Init ---------------- */
async function initialize() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const reverseRes = await fetch(
            `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&language=en&format=json`,
          );
          const reverseData = await reverseRes.json();
          const place = reverseData.results?.[0];
          if (place?.name) {
            await fetchWeather(place.name);
            return;
          }
        } catch (error) {
          console.warn(
            "Location lookup failed, falling back to London.",
            error,
          );
        }
        await fetchWeather("London");
      },
      async () => {
        await fetchWeather("London");
      },
    );
  } else {
    await fetchWeather("London");
  }
}

searchButton.addEventListener("click", async () => {
  const query = cityInput.value.trim();
  if (!query) {
    updateStatus("Please enter a city name.", true);
    return;
  }
  try {
    await fetchWeather(query);
  } catch (error) {
    updateStatus(error.message, true);
  }
});

cityInput.addEventListener("keydown", async (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    const query = cityInput.value.trim();
    if (!query) {
      updateStatus("Please enter a city name.", true);
      return;
    }
    try {
      await fetchWeather(query);
    } catch (error) {
      updateStatus(error.message, true);
    }
  }
});

currentLocationButton.addEventListener("click", async () => {
  try {
    await loadWeatherByLocation();
  } catch (error) {
    console.error(error);
  }
});

setInterval(
  () => {
    if (currentQuery) {
      fetchWeather(currentQuery).catch((error) => {
        console.error(error);
        updateStatus(error.message, true);
      });
    }
  },
  10 * 60 * 1000,
);

// Note: the map is initialized by initMap(), called automatically by the
// Google Maps script tag's callback param once the API script loads —
// no manual call needed here.
refreshAuthArea();
initialize().catch((error) => {
  updateStatus(error.message, true);
});
