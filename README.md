# Android Clock Kiosk

Lightweight, zero-framework wall clock dashboard designed for older/slow Android tablets running **Fully Kiosk Browser**.

## Features
- **Large Clock & Date** with 12h/24h support
- **Live Weather** via Open-Meteo (current temp, condition, High / Low)
- **10 Built-in Themes** (`oled`, `daylight`, `paper`, `eink`, `amber`, `terminal`, `red-night`, `nord`, `espresso`, `midnight-blue`) + `auto` day/night mode
- **Remote Updates** via `config.json` (polled every 5 minutes; bump `"version"` to force a full reload, or change `"theme"` to switch themes live)
- **Offline Cache** via `sw.js`

## Setup on GitHub Pages
1. Push this repo to GitHub (`main` branch).
2. On GitHub, go to **Settings → Pages → Source: Deploy from a branch (`main` / `/ (root)`)**.
3. Set **Fully Kiosk Browser → Web Content Settings → Start URL** to:
   `https://mahmudurah.github.io/android-clock-kiosk/`
