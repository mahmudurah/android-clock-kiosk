(function () {
  var DEFAULTS = {
    version: "2",
    theme: "maria-rainbow",
    clockMode: "auto",
    childName: "Maria",
    dayTheme: "maria-rainbow",
    nightTheme: "maria-space",
    dayStartHour: 7,
    nightStartHour: 20,
    use24Hour: false,
    showSeconds: true,
    latitude: -33.7688,
    longitude: 150.9051,
    timezone: "Australia/Sydney",
    weatherRefreshMinutes: 20,
    configRefreshMinutes: 5,
    pixelShift: true
  };

  var THEME_LIST = [
    "auto",
    "maria-rainbow",
    "maria-space",
    "swiss",
    "braun",
    "oled",
    "amber",
    "terminal",
    "eink",
    "nord",
    "red-night",
    "classic-dark",
    "classic-light"
  ];

  var THEME_LABELS = {
    "auto": "Auto Day / Night",
    "maria-rainbow": "Maria's Time Teacher",
    "maria-space": "Maria's Starlight Galaxy",
    "swiss": "Swiss Railway SBB",
    "braun": "Braun Atelier Dark",
    "oled": "Pure OLED Night",
    "amber": "Retro Nixie Amber",
    "terminal": "Phosphor Terminal",
    "eink": "E-Ink Paper",
    "nord": "Nordic Frost",
    "red-night": "Bedroom Red",
    "classic-dark": "Classic Digital Dark",
    "classic-light": "Classic Digital Light"
  };

  var MODE_LIST = ["auto", "digital", "split", "analog"];
  var MODE_LABELS = {
    "auto": "Mode: Theme Default",
    "digital": "Mode: Giant Digital",
    "split": "Mode: Analog + Digital",
    "analog": "Mode: Giant Analog"
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
  var uvEl = document.getElementById("weather-uv");
  var uvVisible = false;
  var weatherIconEl = document.getElementById("weather-icon");
  var greetingTextEl = document.getElementById("greeting-text");
  var wordTimeEl = document.getElementById("word-time");
  var stageEl = document.getElementById("stage");
  var analogPaneEl = document.getElementById("analog-pane");
  var themeBtn = document.getElementById("theme-btn");
  var modeBtn = document.getElementById("mode-btn");
  var toastEl = document.getElementById("toast");

  var hourHandG = document.getElementById("hand-hour-g");
  var minHandG = document.getElementById("hand-min-g");
  var secHandG = document.getElementById("hand-sec-g");

  var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var HOUR_WORDS = [
    "twelve", "one", "two", "three", "four", "five",
    "six", "seven", "eight", "nine", "ten", "eleven", "twelve"
  ];

  var loadedVersion = null;
  var lastRemoteTheme = null;
  var lastRemoteMode = null;
  var localThemeOverride = null;
  var localModeOverride = null;
  try {
    localThemeOverride = window.localStorage.getItem("clock_theme_v2");
    localModeOverride = window.localStorage.getItem("clock_mode_v2");
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

  function buildAnalogDial() {
    var ticksG = document.getElementById("dial-ticks");
    var numsG = document.getElementById("dial-nums");
    var ticksHtml = "";
    var numsHtml = "";
    var i, angle, rad, x1, y1, x2, y2, nx, ny, mx, my;

    for (i = 0; i < 60; i++) {
      angle = i * 6;
      rad = (angle - 90) * Math.PI / 180;
      var isMajor = (i % 5 === 0);
      var rOuter = 95;
      var rInner = isMajor ? 85 : 90;
      x1 = 120 + rInner * Math.cos(rad);
      y1 = 120 + rInner * Math.sin(rad);
      x2 = 120 + rOuter * Math.cos(rad);
      y2 = 120 + rOuter * Math.sin(rad);
      ticksHtml +=
        '<line class="' + (isMajor ? "tick-major" : "tick-minor") +
        '" x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) +
        '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" />';
    }

    for (i = 1; i <= 12; i++) {
      angle = i * 30;
      rad = (angle - 90) * Math.PI / 180;
      nx = 120 + 67 * Math.cos(rad);
      ny = 120 + 67 * Math.sin(rad);
      numsHtml +=
        '<text class="dial-num" x="' + nx.toFixed(1) + '" y="' + ny.toFixed(1) + '">' + i + "</text>";

      mx = 120 + 105 * Math.cos(rad);
      my = 120 + 105 * Math.sin(rad);
      var mVal = (i * 5) % 60;
      var mStr = mVal === 0 ? "00" : (mVal < 10 ? "0" + mVal : "" + mVal);
      numsHtml +=
        '<text class="dial-min-num" x="' + mx.toFixed(1) + '" y="' + my.toFixed(1) + '">' + mStr + "</text>";
    }

    ticksG.innerHTML = ticksHtml;
    numsG.innerHTML = numsHtml;
  }

  function pad2(n) {
    return n < 10 ? "0" + n : "" + n;
  }

  function showToast(text) {
    toastEl.textContent = text;
    toastEl.style.opacity = "1";
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.style.opacity = "0";
    }, 1500);
  }

  function timeInWords(h24, m) {
    var nearest5 = Math.round(m / 5) * 5;
    var h = h24;
    if (nearest5 > 30) h = (h + 1) % 24;
    var h12 = h % 12;
    if (h12 === 0) h12 = 12;
    var hw = HOUR_WORDS[h12];

    if (nearest5 === 0 || nearest5 === 60) {
      var cur12 = h24 % 12;
      if (cur12 === 0) cur12 = 12;
      if (nearest5 === 60) cur12 = (cur12 % 12) + 1;
      return "\u2022 " + HOUR_WORDS[cur12] + " o'clock";
    }
    if (nearest5 === 5) return "\u2022 five past " + hw;
    if (nearest5 === 10) return "\u2022 ten past " + hw;
    if (nearest5 === 15) return "\u2022 quarter past " + hw;
    if (nearest5 === 20) return "\u2022 twenty past " + hw;
    if (nearest5 === 25) return "\u2022 twenty-five past " + hw;
    if (nearest5 === 30) return "\u2022 half past " + hw;
    if (nearest5 === 35) return "\u2022 twenty-five to " + hw;
    if (nearest5 === 40) return "\u2022 twenty to " + hw;
    if (nearest5 === 45) return "\u2022 quarter to " + hw;
    if (nearest5 === 50) return "\u2022 ten to " + hw;
    if (nearest5 === 55) return "\u2022 five to " + hw;
    return "";
  }

  function updateGreeting(hour, minute, activeTheme) {
    var name = cfg.childName || "Maria";
    var isMariaTheme = (activeTheme === "maria-rainbow" || activeTheme === "maria-space");
    if (!isMariaTheme && !cfg.showGreetingAlways) {
      return false;
    }
    var msg;
    if (hour >= 6 && hour < 12) {
      msg = "\u2600 Good morning, " + name + "!";
    } else if (hour >= 12 && hour < 17) {
      msg = "\u2728 Hi " + name + "! Happy afternoon";
    } else if (hour >= 17 && hour < 20) {
      msg = "\u263D Good evening, " + name + "!";
    } else {
      msg = "\u2605 Sweet dreams, " + name;
    }
    greetingTextEl.textContent = msg;
    wordTimeEl.textContent = timeInWords(hour, minute);
    return true;
  }

  function resolveTheme(hour) {
    var selected = localThemeOverride || cfg.theme || "auto";
    if (selected === "auto") {
      var dayStart = typeof cfg.dayStartHour === "number" ? cfg.dayStartHour : 7;
      var nightStart = typeof cfg.nightStartHour === "number" ? cfg.nightStartHour : 20;
      return (hour >= dayStart && hour < nightStart)
        ? (cfg.dayTheme || "maria-rainbow")
        : (cfg.nightTheme || "maria-space");
    }
    return selected;
  }

  function resolveClockMode(activeTheme) {
    // Classic themes are always the original digital-only layout
    if (activeTheme === "classic-dark" || activeTheme === "classic-light") {
      return "digital";
    }
    var mode = localModeOverride || cfg.clockMode || "auto";
    if (mode === "auto") {
      if (activeTheme === "maria-rainbow" || activeTheme === "maria-space" || activeTheme === "swiss" || activeTheme === "braun") {
        return "split";
      }
      return "digital";
    }
    return mode;
  }

  function applyBodyClasses(hour, minute) {
    var activeTheme = resolveTheme(hour);
    var activeMode = resolveClockMode(activeTheme);
    var hasGreeting = updateGreeting(hour, minute, activeTheme);
    var cls = "theme-" + activeTheme + " mode-" + activeMode +
      (hasGreeting ? " show-greeting" : "") +
      (uvVisible ? " has-uv" : "");
    if (document.body.className !== cls) {
      document.body.className = cls;
    }
    return activeMode;
  }

  function updateClock() {
    var now = new Date();
    var h = now.getHours();
    var m = now.getMinutes();
    var s = now.getSeconds();

    var activeMode = applyBodyClasses(h, m);
    var needSeconds = cfg.showSeconds || activeMode === "split" || activeMode === "analog";

    if (cfg.use24Hour) {
      timeEl.textContent = pad2(h) + ":" + pad2(m);
      ampmEl.textContent = cfg.showSeconds ? pad2(s) : "";
    } else {
      var suffix = h >= 12 ? "PM" : "AM";
      var h12 = h % 12;
      if (h12 === 0) h12 = 12;
      timeEl.textContent = h12 + ":" + pad2(m);
      ampmEl.textContent = suffix;
    }

    dateEl.textContent = DAYS[now.getDay()] + ", " + now.getDate() + " " + MONTHS[now.getMonth()];

    if (activeMode === "split" || activeMode === "analog") {
      var secAngle = s * 6;
      var minAngle = m * 6 + s * 0.1;
      var hourAngle = (h % 12) * 30 + m * 0.5;
      hourHandG.setAttribute("transform", "rotate(" + hourAngle.toFixed(1) + " 120 120)");
      minHandG.setAttribute("transform", "rotate(" + minAngle.toFixed(1) + " 120 120)");
      secHandG.setAttribute("transform", "rotate(" + secAngle + " 120 120)");
    }

    var delay = needSeconds
      ? (1000 - now.getMilliseconds() + 10)
      : ((60 - s) * 1000 - now.getMilliseconds() + 20);
    if (clockTimer) clearTimeout(clockTimer);
    clockTimer = setTimeout(updateClock, delay);
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
    if (code >= 95) return "Storm";
    return "Weather";
  }

  function renderWeatherIcon(code, isNight) {
    var c = "currentColor";
    var a = "var(--accent-color)";
    if (code === 0 || code === 1) {
      if (isNight) {
        weatherIconEl.innerHTML =
          '<path fill="' + a + '" d="M40 12a20 20 0 1 0 12 36 16 16 0 1 1-12-36z"/>';
      } else {
        weatherIconEl.innerHTML =
          '<circle cx="32" cy="32" r="13" fill="' + a + '"/>' +
          '<g stroke="' + a + '" stroke-width="4" stroke-linecap="round">' +
          '<line x1="32" y1="6" x2="32" y2="12"/><line x1="32" y1="52" x2="32" y2="58"/>' +
          '<line x1="6" y1="32" x2="12" y2="32"/><line x1="52" y1="32" x2="58" y2="32"/>' +
          '<line x1="14" y1="14" x2="18" y2="18"/><line x1="46" y1="46" x2="50" y2="50"/>' +
          '<line x1="50" y1="14" x2="46" y2="18"/><line x1="18" y1="46" x2="14" y2="50"/>' +
          "</g>";
      }
      return;
    }
    if (code === 2) {
      weatherIconEl.innerHTML =
        '<circle cx="24" cy="24" r="10" fill="' + a + '"/>' +
        '<path fill="' + c + '" d="M22 48h24a10 10 0 0 0 0-20 14 14 0 0 0-27-3A9 9 0 0 0 22 48z"/>';
      return;
    }
    if (code >= 51 && code <= 82) {
      weatherIconEl.innerHTML =
        '<path fill="' + c + '" d="M18 40h28a10 10 0 0 0 0-20 14 14 0 0 0-27-3A9 9 0 0 0 18 40z"/>' +
        '<g stroke="' + a + '" stroke-width="4" stroke-linecap="round">' +
        '<line x1="22" y1="46" x2="19" y2="56"/><line x1="32" y1="46" x2="29" y2="56"/><line x1="42" y1="46" x2="39" y2="56"/>' +
        "</g>";
      return;
    }
    if (code >= 95) {
      weatherIconEl.innerHTML =
        '<path fill="' + c + '" d="M18 40h28a10 10 0 0 0 0-20 14 14 0 0 0-27-3A9 9 0 0 0 18 40z"/>' +
        '<polygon fill="' + a + '" points="34,40 24,52 32,52 29,62 42,48 34,48"/>';
      return;
    }
    weatherIconEl.innerHTML =
      '<path fill="' + c + '" d="M18 46h28a11 11 0 0 0 0-22 15 15 0 0 0-29-3A10 10 0 0 0 18 46z"/>';
  }

  function uvTestValue() {
    var m = /[?&]uvtest=(\d+(\.\d+)?)/.exec(window.location.search);
    return m ? parseFloat(m[1]) : null;
  }

  function updateUV(cur) {
    var test = uvTestValue();
    var uv = test !== null ? test : cur.uv_index;
    var isDay = test !== null ? true : (cur.is_day === 1);
    if (cfg.showUV === false || typeof uv !== "number" || !isDay) {
      uvVisible = false;
    } else {
      var v = Math.round(uv);
      var cls;
      if (v <= 2) cls = "uv-low";
      else if (v <= 5) cls = "uv-moderate";
      else if (v <= 7) cls = "uv-high";
      else if (v <= 10) cls = "uv-veryhigh";
      else cls = "uv-extreme";
      uvEl.className = cls;
      uvEl.textContent = "UV " + v;
      uvVisible = true;
    }
    var now = new Date();
    applyBodyClasses(now.getHours(), now.getMinutes());
  }

  function fetchWeather() {
    var url =
      "https://api.open-meteo.com/v1/forecast?latitude=" + cfg.latitude +
      "&longitude=" + cfg.longitude +
      "&current=temperature_2m,weather_code,uv_index,is_day" +
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
            var h = new Date().getHours();
            renderWeatherIcon(cur.weather_code, h < 6 || h >= 19);
          }
          if (daily.temperature_2m_max && daily.temperature_2m_min) {
            var hi = Math.round(daily.temperature_2m_max[0]);
            var lo = Math.round(daily.temperature_2m_min[0]);
            hiLoEl.textContent = "H " + hi + "\u00B0  L " + lo + "\u00B0";
          }
          updateUV(cur);
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
            window.location.replace(window.location.pathname + "?v=" + encodeURIComponent(remote.version));
            return;
          }
          loadedVersion = remote.version || loadedVersion || DEFAULTS.version;

          if (lastRemoteTheme !== null && remote.theme && remote.theme !== lastRemoteTheme) {
            localThemeOverride = null;
            try { window.localStorage.removeItem("clock_theme_v2"); } catch (e) {}
          }
          if (lastRemoteMode !== null && remote.clockMode && remote.clockMode !== lastRemoteMode) {
            localModeOverride = null;
            try { window.localStorage.removeItem("clock_mode_v2"); } catch (e) {}
          }
          lastRemoteTheme = remote.theme || DEFAULTS.theme;
          lastRemoteMode = remote.clockMode || DEFAULTS.clockMode;

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
    try { window.localStorage.setItem("clock_theme_v2", nextTheme); } catch (e) {}
    updateClock();
    showToast(THEME_LABELS[nextTheme] || nextTheme);
  }

  function cycleMode() {
    var current = localModeOverride || cfg.clockMode || "auto";
    var idx = MODE_LIST.indexOf(current);
    if (idx < 0) idx = 0;
    var nextMode = MODE_LIST[(idx + 1) % MODE_LIST.length];
    localModeOverride = nextMode;
    try { window.localStorage.setItem("clock_mode_v2", nextMode); } catch (e) {}
    updateClock();
    showToast(MODE_LABELS[nextMode] || nextMode);
  }

  function runPixelShift() {
    if (!cfg.pixelShift) return;
    shiftIndex = (shiftIndex + 1) % SHIFTS.length;
    var xy = SHIFTS[shiftIndex];
    stageEl.style.transform = "translate(" + xy[0] + "px, " + xy[1] + "px)";
  }

  themeBtn.onclick = function () { cycleTheme(1); };
  modeBtn.onclick = function () { cycleMode(); };

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

  buildAnalogDial();
  updateClock();
  fetchWeather();
  fetchRemoteConfig();

  setInterval(fetchWeather, (cfg.weatherRefreshMinutes || 20) * 60 * 1000);
  setInterval(fetchRemoteConfig, (cfg.configRefreshMinutes || 5) * 60 * 1000);
  setInterval(runPixelShift, 10 * 60 * 1000);
})();
