# SkyOracle: Stargazing Forecast & Ephemeris 🔭✨

A fast, lightweight, standalone Progressive Web App (PWA) and Android app for stargazers, astronomers, and night-sky enthusiasts.

Provides dynamic dark-sky observing forecasts, NOAA/Meeus solar twilight timelines, Meeus lunar phases, and NASA JPL naked-eye planetary ephemeris with IAU constellation tracking.

---

## Key Features

- **Dynamic Dark-Hours Observing Window**: Automatically identifies the full post-sunset to pre-sunrise window (typically 10–13 hours). Displays hourly cloud percentage, clarity tracks (color-graded emerald to red), and highlights active astronomical darkness (`isDarkSky`).
- **100% Offline Astronomical Ephemeris**:
  - **Solar Twilights**: Exact times for Sunset (-0.8°), Civil Dusk (-6°), Nautical Dusk (-12°), Astronomical Dusk (-18°), Astronomical Dawn (-18°), and Sunrise (-0.8°).
  - **Moon Phase & Illumination**: Exact geocentric lunar age in days, illuminated percentage, synodic phase name, and SVG lunar terminator visualizer.
  - **Naked-Eye Planets**: Local rise and set times, viewing conditions, and host astronomical constellation positions (Pisces, Aries, Taurus, Gemini, Cancer, Leo, Virgo, Libra, Scorpius, Ophiuchus, Sagittarius, Capricornus, Aquarius) for Mercury, Venus, Mars, Jupiter, and Saturn.
- **Open Cloud Telemetry**: Fetches hourly cloud forecasts from Open-Meteo's open, keyless, CORS-enabled REST API.
- **1-Tap Location & Geocoding**:
  - Browser GPS coordinate detection via `navigator.geolocation`.
  - Built-in instant city search via Open-Meteo Geocoding.
  - Persistent local storage remembering your favorite stargazing locations.
- **Progressive Web App (PWA)**:
  - Service Worker (`sw.js`) with cache-first and offline fallbacks.
  - Web App Manifest (`manifest.json`) for 1-tap installation on Android, iOS, Linux, Windows, and macOS.
  - Ultra-lightweight footprint: **~11 kB JS + ~5 kB CSS (gzipped)**, zero framework bloat, sub-second boot.

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

Dual MIT / Apache-2.0.
