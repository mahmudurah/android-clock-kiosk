(function () {
  var DEFAULTS = {
    version: "1",
    theme: "auto",
    dayTheme: "daylight",
    nightTheme: "oled",
    dayStartHour: 7,
    nightStartHour: 20,
    use24Hour: false,
    showSeconds: false,
    latitude: -33.7688,
    longitude: 150.9051,
    timezone: "Australia/Sydney",
    weatherRefreshMinutes: 20,
    configRefreshMinutes: 5,
    pixelShift: true
  };

  var THEME_LIST = [
    "auto",
    "oled",
    "daylight",
    "paper",
    "eink",
    "amber",
    "terminal",
    "red-night",
    "nord",
    "espresso",
    "midnight-blue"
  ];

  var THEME_LABELS = {
    "auto": "Auto Day/Night",
    "oled": "Pure OLED Dark",
    "daylight": "Crisp Daylight",
    "paper": "Warm Paper",
    "eink": "E-Ink Mono",
    "amber": "Retro Amber",
    "terminal": "Terminal Green",
    "red-night": "Bedroom Red",
    "nord": "Nord Slate",
    "espresso": "Espresso",
    "midnight-blue": "Midnight Blue"
  };

  var cfg = {};
  var k;
  for (k in DEFAULTS) {
    if (DEFAULTS.hasOwnProperty(k)) cfg[k] = DEFAULTS[k];
  }

  var timeEl = document.getElementById("time");
  var ampmEl = document.getElementById("ampm");
  var dateEl = document.getElementById("date");
  var tempEl = document.getElementById("weather-temp");
  var condEl = document.getElementById("weather-cond");
  var hiLoEl = document.getElementById("weather-hi-lo");
  var stageEl = document.getElementById("stage");
  var themeBtn = document.getElementById("theme-btn");
  var toastEl = document.getElementById("toast");

  var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  var loadedVersion = null;
  var lastRemoteTheme = null;
  var localThemeOverride = null;
  try {
    localThemeOverride = window.localStorage.getItem("clock_theme");
  } catch (e) {}

  var shiftIndex = 0;
  var SHIFTS = [
    [0, 0],
    [2, 1],
    [-2, 1],
    [-2, -1],
    [2, -1]
  ];

  var clockTimer = null;
  var toastTimer = null;

  function pad2(n) {
    return n < 10 ? "0" + n : "" + n;
  }

  function showToast(text) {
    toastEl.textContent = text;
    toastEl.style.opacity = "1";
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.style.opacity = "0";
    }, 1400);
  }

  function wmoDescription(code) {
    if (code === 0) return "Clear";
    if (code === 1) return "Mainly clear";
    if (code === 2) return "Partly cloudy";
    if (code === 3) return "Overcast";
    if (code === 45 || code === 48) return "Fog";
    if (code >= 51 && code <= 57) return "Drizzle";
    if (code >= 61 && code <= 67) return "Rain";
    if (code >= 71 && code <= 77) return "Snow";
    if (code >= 80 && code <= 82) return "Showers";
    if (code >= 85 && code <= 86) return "Snow showers";
    if (code >= 95) return "Thunderstorm";
    return "Weather";
  }

  function resolveTheme(hour) {
    var selected = localThemeOverride || cfg.theme || "auto";
    if (selected === "auto") {
      var dayStart = typeof cfg.dayStartHour === "number" ? cfg.dayStartHour : 7;
      var nightStart = typeof cfg.nightStartHour === "number" ? cfg.nightStartHour : 20;
      return (hour >= dayStart && hour < nightStart) ? (cfg.dayTheme || "daylight") : (cfg.nightTheme || "oled");
    }
    return selected;
  }

  function applyTheme(hour) {
    var cls = "theme-" + resolveTheme(hour);
    if (document.body.className !== cls) {
      document.body.className = cls;
    }
  }

  function updateClock() {
    var now = new Date();
    var h = now.getHours();
    var m = now.getMinutes();
    var s = now.getSeconds();

    if (cfg.use24Hour) {
      timeEl.textContent = pad2(h) + ":" + pad2(m) + (cfg.showSeconds ? ":" + pad2(s) : "");
      ampmEl.textContent = "";
    } else {
      var suffix = h >= 12 ? "PM" : "AM";
      var h12 = h % 12;
      if (h12 === 0) h12 = 12;
      timeEl.textContent = h12 + ":" + pad2(m) + (cfg.showSeconds ? ":" + pad2(s) : "");
      ampmEl.textContent = suffix;
    }

    dateEl.textContent = DAYS[now.getDay()] + ", " + now.getDate() + " " + MONTHS[now.getMonth()];
    applyTheme(h);

    var delay = cfg.showSeconds
      ? (1000 - now.getMilliseconds() + 10)
      : ((60 - s) * 1000 - now.getMilliseconds() + 20);
    if (clockTimer) clearTimeout(clockTimer);
    clockTimer = setTimeout(updateClock, delay);
  }

  function fetchWeather() {
    var url =
      "https://api.open-meteo.com/v1/forecast?latitude=" + cfg.latitude +
      "&longitude=" + cfg.longitude +
      "&current=temperature_2m,weather_code" +
      "&daily=temperature_2m_max,temperature_2m_min" +
      "&timezone=" + encodeURIComponent(cfg.timezone || "auto") +
      "&forecast_days=1";

    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.timeout = 10000;
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          var data = JSON.parse(xhr.responseText);
          var cur = data.current || {};
          var daily = data.daily || {};
          if (typeof cur.temperature_2m === "number") {
            tempEl.textContent = Math.round(cur.temperature_2m) + "\u00B0";
          }
          if (typeof cur.weather_code === "number") {
            condEl.textContent = wmoDescription(cur.weather_code);
          }
          if (daily.temperature_2m_max && daily.temperature_2m_min) {
            var hi = Math.round(daily.temperature_2m_max[0]);
            var lo = Math.round(daily.temperature_2m_min[0]);
            hiLoEl.textContent = "H " + hi + "\u00B0  L " + lo + "\u00B0";
          }
        } catch (e) {
          condEl.textContent = "Weather error";
        }
      } else if (tempEl.textContent === "--\u00B0") {
        condEl.textContent = "Offline";
      }
    };
    xhr.onerror = function () {
      if (tempEl.textContent === "--\u00B0") {
        condEl.textContent = "Offline";
      }
    };
    xhr.send();
  }

  function fetchRemoteConfig() {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "config.json?t=" + new Date().getTime(), true);
    xhr.timeout = 8000;
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          var remote = JSON.parse(xhr.responseText);
          if (loadedVersion !== null && remote.version && remote.version !== loadedVersion) {
            window.location.reload(true);
            return;
          }
          loadedVersion = remote.version || loadedVersion || DEFAULTS.version;

          // If remote theme changed in config.json, clear local tap override so remote wins
          if (lastRemoteTheme !== null && remote.theme && remote.theme !== lastRemoteTheme) {
            localThemeOverride = null;
            try { window.localStorage.removeItem("clock_theme"); } catch (e) {}
          }
          lastRemoteTheme = remote.theme || DEFAULTS.theme;

          var key;
          for (key in remote) {
            if (remote.hasOwnProperty(key)) cfg[key] = remote[key];
          }
          updateClock();
        } catch (e) {}
      }
    };
    xhr.send();
  }

  function cycleTheme(step) {
    var current = localThemeOverride || cfg.theme || "auto";
    var idx = THEME_LIST.indexOf(current);
    if (idx < 0) idx = 0;
    var nextIdx = (idx + step + THEME_LIST.length) % THEME_LIST.length;
    var nextTheme = THEME_LIST[nextIdx];
    localThemeOverride = nextTheme;
    try { window.localStorage.setItem("clock_theme", nextTheme); } catch (e) {}
    applyTheme(new Date().getHours());
    showToast(THEME_LABELS[nextTheme] || nextTheme);
  }

  function runPixelShift() {
    if (!cfg.pixelShift) return;
    shiftIndex = (shiftIndex + 1) % SHIFTS.length;
    var xy = SHIFTS[shiftIndex];
    stageEl.style.transform = "translate(" + xy[0] + "px, " + xy[1] + "px)";
  }

  themeBtn.onclick = function () {
    cycleTheme(1);
  };

  // Swipe left/right to switch themes
  var touchStartX = null;
  document.addEventListener("touchstart", function (e) {
    if (e.touches && e.touches.length === 1) {
      touchStartX = e.touches[0].clientX;
    }
  }, false);
  document.addEventListener("touchend", function (e) {
    if (touchStartX === null || !e.changedTouches || !e.changedTouches.length) return;
    var dx = e.changedTouches[0].clientX - touchStartX;
    touchStartX = null;
    if (Math.abs(dx) > 60) {
      cycleTheme(dx < 0 ? 1 : -1);
    }
  }, false);

  if ("serviceWorker" in navigator && window.location.protocol.indexOf("http") === 0) {
    try { navigator.serviceWorker.register("sw.js"); } catch (e) {}
  }

  updateClock();
  fetchWeather();
  fetchRemoteConfig();

  setInterval(fetchWeather, (cfg.weatherRefreshMinutes || 20) * 60 * 1000);
  setInterval(fetchRemoteConfig, (cfg.configRefreshMinutes || 5) * 60 * 1000);
  setInterval(runPixelShift, 10 * 60 * 1000);
})();
