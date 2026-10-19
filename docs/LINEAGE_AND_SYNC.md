# SkyOracle & EdgeHub Lineage, Evolution & Synchronization Architecture 🔭🌙

This document tracks the technical lineage, evolution, and synchronization points between the desktop widgets in **SkyPhoenix EdgeHub** (`skyphoenix-edgehub-linux`) and the standalone **SkyOracle** application (`sky-oracle` / `sky-tonight`).

---

## 1. Project Lineage & History

### The Origin: SkyPhoenix EdgeHub (Linux Desktop / QML)
The core astronomical algorithms and user interface paradigms originated inside **[SkyPhoenix EdgeHub Linux](file:///home/acero/src/skyphoenix-edgehub-linux)**, a QtQuick/QML desktop dashboard for Linux devices.

In EdgeHub, night-sky telemetry was split across two specialized widgets:
1. **`MoonWidget.qml`** (`ui/qml/widgets/MoonWidget.qml`):
   - A dedicated lunar widget computing local moon phase, illumination percentage, synodic cycle age, Waxing/Waning phase direction, upcoming New and Full Moon dates, photorealistic moon canvas rendering, a visual lunar cycle progress bar, and 36-hour local moonrise and moonset times using Meeus/Schlyter orbital altitude crossing formulas.
2. **`SkyTonightWidget.qml`** (`ui/qml/widgets/SkyTonightWidget.qml`):
   - An all-in-one stargazing conditions widget focusing on solar twilight boundaries (Civil, Nautical, Astronomical dusk/dawn), the "Dark Sky Window", naked-eye classical planet ephemeris (Mercury, Venus, Mars, Jupiter, Saturn), and hourly cloud forecast telemetry from Open-Meteo.
   - When `SkyTonightWidget.qml` was created in EdgeHub, it included a simplified inline `calculateMoonInfo()` helper that only calculated illumination % and phase name, omitting the local rise/set and upcoming phase date computations that lived in `MoonWidget.qml`.

### The Evolution: Standalone Web App & Android TWA
To make these capabilities accessible outside the Linux desktop environment, **SkyOracle** was created as a zero-dependency, high-performance Progressive Web App (PWA) and Android Trusted Web Activity (TWA).

- **Initial Porting**: The initial web implementation primarily adapted `SkyTonightWidget.qml`'s engine into TypeScript (`src/core/astronomy.ts`, `src/core/weather.ts`, `src/main.ts`).
- **Feature Gap**: Because `SkyTonightWidget.qml` was the primary reference, `MoonWidget.qml`'s local rise/set calculations, upcoming phase dates, and cycle progress bar were initially left behind.
- **Re-importing & Synchronization**: The full lunar mechanics from `MoonWidget.qml` were subsequently ported into `sky-oracle`'s astronomy engine and UI, restoring complete parity with the desktop widget.

---

## 2. Repository Architecture & Dual-Mirror Strategy

SkyOracle currently operates across two GitHub repositories:

| Repository | Path | Branch | Purpose |
| :--- | :--- | :--- | :--- |
| **`sky-oracle`** | `/home/acero/src/sky-oracle` | `main` | **Canonical repository** for all active development, bugfixes, and documentation. |
| **`sky-tonight`** | `/home/acero/src/sky-tonight` | `master` | **Mirror repository** maintained in parallel while Google Play Console completes store listing review. |
| **`skyphoenix-edgehub-linux`** | `/home/acero/src/skyphoenix-edgehub-linux` | `master` | **Upstream desktop widget suite** in QtQuick/QML. |

> [!IMPORTANT]
> Whenever changes are made to `sky-oracle`, they should be mirrored to `/home/acero/src/sky-tonight` to keep both git trees synchronized.

---

## 3. Code Cross-Reference & Synchronization Map

The table below maps the astronomical logic and UI components between EdgeHub QML and SkyOracle TypeScript:

| Feature / Logic | EdgeHub Desktop (`skyphoenix-edgehub-linux`) | SkyOracle Web/TWA (`sky-oracle`) | Implementation Notes / Formulas |
| :--- | :--- | :--- | :--- |
| **Moon Rise & Set Events** | `ui/qml/widgets/MoonWidget.qml` (`calculateLocalEvents()`, `_crossingTime()`) | `src/core/astronomy.ts` (`calculateMoonRiseSet()`) | Scans a **36-hour horizon** in 5-minute steps. Target altitude threshold is **`+0.125°`** (accounts for ~0.95° horizontal parallax, -0.57° refraction, and -0.27° semidiameter). |
| **Lunar Altitude** | `ui/qml/widgets/MoonWidget.qml` (`_moonAltitude()`) | `src/core/astronomy.ts` (`lunarAltitude()`, `moonPosition()`) | Meeus/Schlyter lunar coordinates converted to topocentric/geocentric local hour angle and altitude. |
| **Upcoming Phase Dates** | `ui/qml/widgets/MoonWidget.qml` (`nextNew`, `nextFull`, `_nextDate()`) | `src/core/astronomy.ts` (`calculateMoonInfo()`) | Uses synodic month constant **`2551443.0s`** (~29.53059 days) projected from reference epoch `2000-01-06T18:14:00Z`. |
| **Phase Direction & Age** | `ui/qml/widgets/MoonWidget.qml` (`phaseDirection`, `ageDays`) | `src/core/astronomy.ts` (`MoonInfo.phaseDirection`, `MoonInfo.age`) | `cyclePos < 0.5 ? 'Waxing' : 'Waning'`. Age = `cyclePos * 29.530588853`. |
| **Lunar Cycle Progress Bar** | `ui/qml/widgets/MoonWidget.qml` (`moonCyclePosition`) | `src/main.ts` (Moon Phase card) | Visual horizontal bar: `NEW ──── FULL ──── NEW` scaled by `cyclePos * 100%`. |
| **Solar Twilights** | `ui/qml/widgets/SkyTonightWidget.qml` (`calculateSunEvents()`) | `src/core/astronomy.ts` (`calculateSunEvents()`) | Scans 24h starting at observing day noon. Solar thresholds: Sunset `-0.833°`, Civil `-6.0°`, Nautical `-12.0°`, Astronomical `-18.0°`. |
| **Naked-Eye Planets** | `ui/qml/widgets/SkyTonightWidget.qml` (`calculateAllPlanets()`) | `src/core/astronomy.ts` (`calculateAllPlanets()`, `calculatePlanetRiseSet()`) | Classical 5 planets (Mercury, Venus, Mars, Jupiter, Saturn) with IAU ecliptic constellation boundaries. |
| **Observing Forecast & Cloud Telemetry** | `ui/qml/widgets/SkyTonightWidget.qml` (`_fetchForecast()`) | `src/core/weather.ts` (`fetchCloudForecast()`) | Open-Meteo hourly cloud cover (total, low, mid, high), 2m temperature, relative humidity, dew point, wind speed. |

---

## 4. Checklist for Keeping Codebases in Sync

When updating astronomy mathematics or UI behaviors in either repository:

1. **Verify Altitude Thresholds**:
   - Moon horizon threshold: **`+0.125°`** (never use 0° or -0.833° for the Moon, as the Moon's large horizontal parallax makes its geometric rise occur when its center is above the true horizon).
   - Sun horizon threshold: **`-0.833°`** (accounts for atmospheric refraction -34' and solar semidiameter -16').
2. **Preserve Epochs & Synodic Constants**:
   - Synodic period: `2551443.0` seconds (`29.530588853` days).
   - Reference New Moon epoch: `Date.UTC(2000, 0, 6, 18, 14)` UTC.
3. **Horizon Scan Intervals**:
   - The Moon moves eastward relative to the stars, resulting in a ~24h 50m lunar day. Always scan **36 hours** forward from the query time to guarantee capturing the upcoming rise and set regardless of time of day.
4. **Unit Tests**:
   - When modifying `src/core/astronomy.ts`, ensure all unit tests in `src/core/astronomy.test.ts` pass (`npm test`).
5. **Git Synchronization**:
   - Commit changes to `sky-oracle` (`main`).
   - Mirror the changes to `/home/acero/src/sky-tonight` (`master`).
   - If improvements are made to algorithms or new features are developed in TypeScript, back-port the matching logic to `skyphoenix-edgehub-linux/ui/qml/widgets/` where appropriate.
