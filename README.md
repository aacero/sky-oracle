# SkyOracle: Stargazing Forecast & Ephemeris 🔭✨

A fast, lightweight, standalone Progressive Web App (PWA) and Android app for stargazers, astronomers, and night-sky enthusiasts.

Provides dynamic dark-sky observing forecasts, NOAA/Meeus solar twilight timelines, Meeus lunar phases, and NASA JPL naked-eye planetary ephemeris with IAU constellation tracking.

<div align="center">

[![Add to Obtainium](https://raw.githubusercontent.com/ImranR98/apps.obtainium.imranr.dev/main/assets/graphics/badge_obtainium.png)](https://apps.obtainium.imranr.dev/redirect?r=obtainium://app/%7B%22id%22%3A%22com.lapsedacademics.skytonight%22%2C%22url%22%3A%22https%3A%2F%2Fgithub.com%2Faacero%2Fsky-oracle%22%2C%22author%22%3A%22aacero%22%2C%22name%22%3A%22SkyOracle%22%7D)
[![Download APK](https://img.shields.io/badge/Download-APK-2ea44f?style=for-the-badge&logo=android&logoColor=white)](https://github.com/aacero/sky-oracle/releases/latest)
[![Launch Web App](https://img.shields.io/badge/Web_PWA-Launch-blueviolet?style=for-the-badge&logo=pwa&logoColor=white)](https://aacero.github.io/sky-tonight/)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![GitHub Release](https://img.shields.io/github/v/release/aacero/sky-oracle)](https://github.com/aacero/sky-oracle/releases)
[![Komi Store](https://img.shields.io/badge/Komi_Store-Auto--Indexed-blue?logo=github&logoColor=white)](https://github.com/aacero/sky-oracle/releases)

</div>

---

## 📲 Install & Get SkyOracle

### 1. Obtainium (Recommended for FOSS & Auto-Updates)
If you use [Obtainium](https://github.com/ImranR98/Obtainium) on Android:
- **1-Tap Add**: Tap the **[Add to Obtainium](https://apps.obtainium.imranr.dev/redirect?r=obtainium://app/%7B%22id%22%3A%22com.lapsedacademics.skytonight%22%2C%22url%22%3A%22https%3A%2F%2Fgithub.com%2Faacero%2Fsky-oracle%22%2C%22author%22%3A%22aacero%22%2C%22name%22%3A%22SkyOracle%22%7D)** badge above on your Android phone or tablet.
- **Manual Add**: In Obtainium, tap **Add App**, paste `https://github.com/aacero/sky-oracle`, and tap **Add**. Obtainium will automatically track releases and notify you of updates.

### 2. Komi Store
Komi Store automatically indexes SkyOracle releases directly from GitHub. Search for **SkyOracle** inside the Komi Store app to install and receive silent/assisted auto-updates.

### 3. Direct APK Sideload
Download the latest signed APK directly from our **[Releases](https://github.com/aacero/sky-oracle/releases/latest)** page:
- **Latest Build**: [`SkyOracle-v1.0.1.apk`](https://github.com/aacero/sky-oracle/releases/download/v1.0.1/SkyOracle-v1.0.1.apk) (SHA-256: `07f57905e43a48a6f6e8119aa998c46d6007f41a386ec03e3d3028b83dda6521`)

### 4. Progressive Web App (PWA)
Open **[aacero.github.io/sky-tonight/](https://aacero.github.io/sky-tonight/)** in any modern mobile or desktop browser (Chrome, Firefox, Safari, Edge) and tap **"Install"** or **"Add to Home Screen"**.

---

## Key Features

- **Dynamic Dark-Hours Observing Window**: Automatically identifies the full post-sunset to pre-sunrise window (typically 10–13 hours). Displays hourly cloud percentage, clarity tracks (color-graded emerald to red), and highlights active astronomical darkness (`isDarkSky`).
- **Ambient Weather & Optics Dew Warnings**: Start-of-window temperature, expected overnight low, wind speed, and real-time dew point / frost alerts ($\Delta T \le 1.5^\circ\text{C}$) to protect telescope lenses and mirrors.
- **1-Tap Unit Toggle**: Switch seamlessly between Fahrenheit (°F) and Celsius (°C).
- **100% Offline Astronomical Ephemeris**:
  - **Solar Twilights**: Exact times for Sunset (-0.8°), Civil Dusk (-6°), Nautical Dusk (-12°), Astronomical Dusk (-18°), Astronomical Dawn (-18°), and Sunrise (-0.8°).
  - **Moon Phase & Illumination**: Exact geocentric lunar age in days, illuminated percentage, synodic phase name, and SVG lunar terminator visualizer.
  - **Naked-Eye Planets & 10° Starfields**: Local rise and set times, viewing conditions, and host astronomical constellation positions for Mercury, Venus, Mars, Jupiter, and Saturn. Tap any planet to reveal an interactive 10° × 10° telescopic/binocular starfield with real Hipparcos stars down to 6th magnitude colored by spectral type, labeled navigational stars, a 1° Telrad-style reticle, Southern hemisphere South-Up toggle (auto-configured for $\text{lat} < 0$), real-time astronomical horizon rendering, and below-horizon star dimming.
- **Open Cloud Telemetry**: Fetches hourly cloud and temperature forecasts from Open-Meteo's open, keyless, CORS-enabled REST API.
- **1-Tap Location & Geocoding**:
  - Browser GPS coordinate detection via `navigator.geolocation`.
  - Built-in instant city search via Open-Meteo Geocoding.
  - Persistent local storage remembering your favorite stargazing locations.
- **Progressive Web App (PWA) & TWA**:
  - Service Worker (`sw.js`) with cache-first and offline fallbacks.
  - Web App Manifest (`manifest.json`) and Trusted Web Activity (`.aab` / `.apk`) for Android.
  - Ultra-lightweight footprint: **~11 kB JS + ~5 kB CSS (gzipped)**, zero framework bloat, sub-second boot.
- **100% Private**: Zero ads, zero tracking, zero proprietary analytics.

---

## Tech Stack

- **Runtime / Bundler**: [Vite](https://vitejs.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: SVG & [Lucide](https://lucide.dev/)
- **Testing**: [Vitest](https://vitest.dev/) (unit tests for astronomical and weather invariants)
- **Deployment**: Zero-backend static assets (compatible with GitHub Pages, Cloudflare Pages, Vercel, Netlify, or local hosting)

---

## Getting Started

### Development
```bash
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Testing
Run the Vitest astronomical invariant test suite:
```bash
npm test
```

### Production Build
Build optimized, tree-shaken static assets to `dist/`:
```bash
npm run build
```

Preview the production build locally:
```bash
npm run preview
```

---

## Architecture

```text
src/
├── core/
│   ├── astronomy.ts       # NOAA / Meeus twilights, moon phase, JPL Keplerian ephemeris
│   ├── astronomy.test.ts  # Vitest invariant suite
│   ├── weather.ts         # Open-Meteo cloud cover & geocoding integration
│   ├── weather.test.ts    # Window extraction & verdict threshold tests
│   └── storage.ts         # LocalStorage persistence for locations & recents
├── style.css              # Tailwind CSS v4 styling & dark theme tokens
├── main.ts                # App initialization, reactive rendering & PWA hooks
public/
├── icon.svg               # Vector app icon & maskable asset
├── manifest.json          # Web App Manifest
└── sw.js                  # Service Worker with offline asset caching
```

For detailed architectural lineage and instructions on keeping this application synchronized with the upstream Linux desktop widgets in **SkyPhoenix EdgeHub** (`MoonWidget.qml` & `SkyTonightWidget.qml`), see **[docs/LINEAGE_AND_SYNC.md](docs/LINEAGE_AND_SYNC.md)**.

---

## Mobile Installation & Packaging

### Option 1: Browser 1-Tap Install (PWA)
1. Open the hosted web app in Chrome (Android/Desktop) or Safari (iOS).
2. Tap the **Install** button in the header or your browser menu (**"Add to Home Screen"**).
3. The app runs standalone without browser chrome and works offline.

### Option 2: Android APK via Bubblewrap (TWA)
Once hosted on an HTTPS domain (e.g. GitHub Pages):
```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest https://<your-username>.github.io/sky-tonight/manifest.json
bubblewrap build
```
This generates a signed Android `.apk` / `.aab` ready for sideloading or publishing to Google Play.

---

## License

MIT License. See [LICENSE](LICENSE) for details.
