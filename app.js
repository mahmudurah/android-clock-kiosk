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
    pianoMinutes: 10,
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

  var THEME_SWATCHES = {
    "auto": ["#fff8ee", "#090b16"],
    "maria-rainbow": ["#fff8ee", "#ff477e"],
    "maria-space": ["#090b16", "#ffd166"],
    "swiss": ["#f4f4f0", "#e30613"],
    "braun": ["#161719", "#f5b800"],
    "oled": ["#000000", "#58a6ff"],
    "amber": ["#070400", "#ff9e22"],
    "terminal": ["#020804", "#39ff5a"],
    "eink": ["#e6e4dc", "#121211"],
    "nord": ["#242933", "#88c0d0"],
    "red-night": ["#000000", "#cc2929"],
    "classic-dark": ["#050608", "#c8cfd8"],
    "classic-light": ["#f4f5f7", "#111418"]
  };

  var MODE_LIST = ["auto", "digital", "split", "analog", "analog-only"];
  var MODE_LABELS = {
    "auto": "Mode: Theme Default",
    "digital": "Mode: Giant Digital",
    "split": "Mode: Analog + Digital",
    "analog": "Mode: Giant Analog",
    "analog-only": "Mode: Pure Analog"
  };

  var cfg = {};
  var k;
  for (k in DEFAULTS) {
    if (DEFAULTS.hasOwnProperty(k)) cfg[k] = DEFAULTS[k];
  }

  var timeEl = document.getElementById("time");
  var ampmEl = document.getElementById("ampm");
  var dateEl = document.getElementById("date");
  var dateDayEl = document.getElementById("date-day");
  var dateNumEl = document.getElementById("date-num");
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
  var MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
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
    var needSeconds = cfg.showSeconds || activeMode === "split" || activeMode === "analog" || activeMode === "analog-only";

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

    if (dateDayEl && dateNumEl) {
      dateDayEl.textContent = DAYS[now.getDay()];
      dateNumEl.textContent = now.getDate() + " " + MONTHS[now.getMonth()];
    } else if (dateEl) {
      dateEl.textContent = DAYS[now.getDay()] + ", " + now.getDate() + " " + MONTHS[now.getMonth()];
    }

    if (activeMode === "split" || activeMode === "analog" || activeMode === "analog-only") {
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
    if (!uvEl) {
      var weatherRow = document.querySelector(".weather");
      if (weatherRow) {
        uvEl = document.createElement("span");
        uvEl.id = "weather-uv";
        weatherRow.appendChild(uvEl);
      } else {
        uvVisible = false;
        return;
      }
    }
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

  var weatherRetryTimer = null;

  function wwoToWmo(wwo) {
    var c = parseInt(wwo, 10);
    if (c === 113) return 0;
    if (c === 116) return 2;
    if (c === 119 || c === 122) return 3;
    if (c === 143 || c === 248 || c === 260) return 45;
    if (c >= 263 && c <= 284) return 51;
    if (c >= 293 && c <= 314) return 61;
    if (c >= 353 && c <= 359) return 80;
    if (c >= 386 && c <= 395) return 95;
    return 3;
  }

  function applyWeatherData(w, skipSave) {
    if (typeof w.temp === "number") {
      tempEl.textContent = Math.round(w.temp) + "\u00B0";
    }
    if (w.cond) {
      condEl.textContent = w.cond;
    }
    if (typeof w.wmo === "number") {
      var h = new Date().getHours();
      renderWeatherIcon(w.wmo, h < 6 || h >= 19);
    }
    if (typeof w.hi === "number" && typeof w.lo === "number") {
      hiLoEl.textContent = "H " + Math.round(w.hi) + "\u00B0  L " + Math.round(w.lo) + "\u00B0";
    }
    updateUV({ uv_index: w.uv, is_day: w.isDay ? 1 : 0 });
    if (!skipSave) {
      w.ts = new Date().getTime();
      try { window.localStorage.setItem("weather_cache_v1", JSON.stringify(w)); } catch (e) {}
    }
  }

  function loadCachedWeather() {
    try {
      var raw = window.localStorage.getItem("weather_cache_v1");
      if (!raw) return;
      var w = JSON.parse(raw);
      if (w && w.ts && (new Date().getTime() - w.ts) < 4 * 60 * 60 * 1000) {
        applyWeatherData(w, true);
      }
    } catch (e) {}
  }

  function scheduleWeatherRetry() {
    if (weatherRetryTimer) clearTimeout(weatherRetryTimer);
    weatherRetryTimer = setTimeout(fetchWeather, 20000);
  }

  function interpolateWttrUV(hourly, nowDate) {
    if (!hourly || !hourly.length) return null;
    var nowHours = nowDate.getHours() + nowDate.getMinutes() / 60;
    var idx = Math.floor(nowHours / 3);
    if (idx < 0) idx = 0;
    if (idx >= hourly.length) idx = hourly.length - 1;
    var nextIdx = idx + 1 < hourly.length ? idx + 1 : idx;
    var uv0 = parseFloat(hourly[idx].uvIndex);
    var uv1 = parseFloat(hourly[nextIdx].uvIndex);
    if (isNaN(uv0)) return null;
    if (isNaN(uv1) || nextIdx === idx) return uv0;
    var frac = (nowHours - idx * 3) / 3;
    return uv0 + (uv1 - uv0) * frac;
  }

  function fetchWeatherFallback() {
    var url = "https://wttr.in/" + cfg.latitude + "," + cfg.longitude + "?format=j1";
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.timeout = 12000;
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          var data = JSON.parse(xhr.responseText);
          var cur = (data.current_condition && data.current_condition[0]) || {};
          var day = (data.weather && data.weather[0]) || {};
          var now = new Date();
          var h = now.getHours();
          var wmo = wwoToWmo(cur.weatherCode);
          var desc = (cur.weatherDesc && cur.weatherDesc[0] && cur.weatherDesc[0].value) || wmoDescription(wmo);
          var interpUV = interpolateWttrUV(day.hourly, now);
          var uvVal = interpUV !== null ? interpUV : parseFloat(cur.uvIndex);
          applyWeatherData({
            temp: parseFloat(cur.temp_C),
            wmo: wmo,
            cond: desc,
            hi: parseFloat(day.maxtempC),
            lo: parseFloat(day.mintempC),
            uv: uvVal,
            isDay: (h >= 6 && h < 19)
          }, false);
          return;
        } catch (e) {}
      }
      if (tempEl.textContent === "--\u00B0") condEl.textContent = "Offline";
      scheduleWeatherRetry();
    };
    xhr.onerror = xhr.ontimeout = function () {
      if (tempEl.textContent === "--\u00B0") condEl.textContent = "Offline";
      scheduleWeatherRetry();
    };
    xhr.send();
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
    xhr.timeout = 6000;
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          var data = JSON.parse(xhr.responseText);
          var cur = data.current || {};
          var daily = data.daily || {};
          applyWeatherData({
            temp: cur.temperature_2m,
            wmo: cur.weather_code,
            cond: typeof cur.weather_code === "number" ? wmoDescription(cur.weather_code) : "",
            hi: daily.temperature_2m_max ? daily.temperature_2m_max[0] : null,
            lo: daily.temperature_2m_min ? daily.temperature_2m_min[0] : null,
            uv: cur.uv_index,
            isDay: cur.is_day === 1
          }, false);
          return;
        } catch (e) {}
      }
      fetchWeatherFallback();
    };
    xhr.onerror = xhr.ontimeout = function () {
      fetchWeatherFallback();
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

  /* ==========================================================================
     PIANO TIMER (Zero CPU when idle; Web Audio chime on completion)
     ========================================================================== */
  var pianoBar = document.getElementById("piano-bar");
  var pianoBtn = document.getElementById("piano-btn");
  var pianoCancel = document.getElementById("piano-cancel");
  var pianoProgress = document.getElementById("piano-progress");
  var pianoState = "idle"; // idle | running | paused | done
  var pianoTotalSec = 600;
  var pianoRemainSec = 600;
  var pianoInterval = null;
  var pianoDoneTimer = null;
  var audioCtx = null;

  function unlockAudio() {
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtx) audioCtx = new Ctx();
      if (audioCtx.state === "suspended") audioCtx.resume();
    } catch (e) {}
  }

  function playPianoChime() {
    try {
      unlockAudio();
      if (!audioCtx) return;
      var notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
      var now = audioCtx.currentTime;
      var i;
      for (i = 0; i < notes.length; i++) {
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        var t = now + i * 0.22;
        osc.type = "triangle";
        osc.frequency.setValueAtTime(notes[i], t);
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.exponentialRampToValueAtTime(0.28, t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(t);
        osc.stop(t + 0.7);
      }
    } catch (e) {}
  }

  function formatMMSS(sec) {
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return pad2(m) + ":" + pad2(s);
  }

  function renderPianoTimer() {
    if (!pianoBar || !pianoBtn) return;
    var mins = typeof cfg.pianoMinutes === "number" && cfg.pianoMinutes > 0 ? cfg.pianoMinutes : 10;
    pianoBar.className = pianoState;
    if (pianoState === "idle") {
      pianoBtn.textContent = "\uD83C\uDFB9 " + mins + "m Piano";
      if (pianoProgress) pianoProgress.style.width = "0%";
    } else if (pianoState === "running") {
      pianoBtn.textContent = "\uD83C\uDFB9 " + formatMMSS(pianoRemainSec);
      var pct = Math.max(0, Math.min(100, ((pianoTotalSec - pianoRemainSec) / pianoTotalSec) * 100));
      if (pianoProgress) pianoProgress.style.width = pct.toFixed(1) + "%";
    } else if (pianoState === "paused") {
      pianoBtn.textContent = "\u23F8 " + formatMMSS(pianoRemainSec);
    } else if (pianoState === "done") {
      var child = cfg.childName || "Maria";
      pianoBtn.textContent = "\uD83C\uDFB9 Great job, " + child + "!";
      if (pianoProgress) pianoProgress.style.width = "100%";
    }
  }

  function stopPianoInterval() {
    if (pianoInterval) {
      clearInterval(pianoInterval);
      pianoInterval = null;
    }
    if (pianoDoneTimer) {
      clearTimeout(pianoDoneTimer);
      pianoDoneTimer = null;
    }
  }

  function resetPianoTimer() {
    stopPianoInterval();
    pianoState = "idle";
    renderPianoTimer();
  }

  function tickPianoTimer() {
    if (pianoState !== "running") return;
    pianoRemainSec -= 1;
    if (pianoRemainSec <= 0) {
      pianoRemainSec = 0;
      stopPianoInterval();
      pianoState = "done";
      renderPianoTimer();
      playPianoChime();
      pianoDoneTimer = setTimeout(resetPianoTimer, 12000);
      return;
    }
    renderPianoTimer();
  }

  if (pianoBtn) {
    pianoBtn.onclick = function () {
      unlockAudio();
      if (pianoState === "idle") {
        var mins = typeof cfg.pianoMinutes === "number" && cfg.pianoMinutes > 0 ? cfg.pianoMinutes : 10;
        pianoTotalSec = Math.round(mins * 60);
        pianoRemainSec = pianoTotalSec;
        pianoState = "running";
        stopPianoInterval();
        pianoInterval = setInterval(tickPianoTimer, 1000);
        renderPianoTimer();
      } else if (pianoState === "running") {
        pianoState = "paused";
        stopPianoInterval();
        renderPianoTimer();
      } else if (pianoState === "paused") {
        pianoState = "running";
        stopPianoInterval();
        pianoInterval = setInterval(tickPianoTimer, 1000);
        renderPianoTimer();
      } else if (pianoState === "done") {
        resetPianoTimer();
      }
    };
  }

  if (pianoCancel) {
    pianoCancel.onclick = function () {
      resetPianoTimer();
    };
  }

  renderPianoTimer();

  themeBtn.onclick = function () { cycleTheme(1); };
  modeBtn.onclick = function () { cycleMode(); };

  /* ==========================================================================
     QUICK PICKER OVERLAY (Visual Layout & Theme Selector)
     ========================================================================== */
  var pickerBtn = document.getElementById("picker-btn");
  var pickerOverlay = document.getElementById("picker-overlay");
  var pickerClose = document.getElementById("picker-close");
  var pickerModesEl = document.getElementById("picker-modes");
  var pickerThemesEl = document.getElementById("picker-themes");

  function renderPicker() {
    if (!pickerModesEl || !pickerThemesEl) return;
    var activeMode = localModeOverride || cfg.clockMode || "auto";
    var activeTheme = localThemeOverride || cfg.theme || "auto";
    var i, id, label, sw, btn;

    pickerModesEl.innerHTML = "";
    for (i = 0; i < MODE_LIST.length; i++) {
      id = MODE_LIST[i];
      label = (MODE_LABELS[id] || id).replace("Mode: ", "");
      btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pick-btn" + (id === activeMode ? " active" : "");
      btn.textContent = (id === activeMode ? "\u2713 " : "") + label;
      btn.setAttribute("data-mode", id);
      btn.onclick = function () {
        var m = this.getAttribute("data-mode");
        localModeOverride = m;
        try { window.localStorage.setItem("clock_mode_v2", m); } catch (e) {}
        updateClock();
        renderPicker();
      };
      pickerModesEl.appendChild(btn);
    }

    pickerThemesEl.innerHTML = "";
    for (i = 0; i < THEME_LIST.length; i++) {
      id = THEME_LIST[i];
      label = THEME_LABELS[id] || id;
      sw = THEME_SWATCHES[id] || ["#111", "#fff"];
      btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pick-btn" + (id === activeTheme ? " active" : "");
      btn.setAttribute("data-theme", id);
      btn.innerHTML =
        '<span class="swatch" style="background:linear-gradient(135deg,' + sw[0] + ' 50%,' + sw[1] + ' 50%)"></span>' +
        '<span>' + (id === activeTheme ? "\u2713 " : "") + label + "</span>";
      btn.onclick = function () {
        var t = this.getAttribute("data-theme");
        localThemeOverride = t;
        try { window.localStorage.setItem("clock_theme_v2", t); } catch (e) {}
        updateClock();
        renderPicker();
      };
      pickerThemesEl.appendChild(btn);
    }
  }

  function openPicker() {
    if (!pickerOverlay) return;
    renderPicker();
    pickerOverlay.className = "open";
  }

  function closePicker() {
    if (!pickerOverlay) return;
    pickerOverlay.className = "";
  }

  if (pickerBtn) pickerBtn.onclick = openPicker;
  if (pickerClose) pickerClose.onclick = closePicker;
  if (pickerOverlay) {
    pickerOverlay.onclick = function (e) {
      if (e.target === pickerOverlay) closePicker();
    };
  }

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
  loadCachedWeather();
  updateClock();
  fetchWeather();
  fetchRemoteConfig();

  setInterval(fetchWeather, (cfg.weatherRefreshMinutes || 20) * 60 * 1000);
  setInterval(fetchRemoteConfig, (cfg.configRefreshMinutes || 5) * 60 * 1000);
  setInterval(runPixelShift, 10 * 60 * 1000);
})();
