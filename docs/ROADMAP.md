# SkyOracle: Roadmap & Active Technical Tasks

This document tracks prioritized future features, architectural enhancements, and platform compatibility issues for **SkyOracle**.

---

## 1. Internationalization (i18n)

### Objective
Expand SkyOracle's reach by localizing all user-facing interfaces, astronomical terminology, and forecast narratives without exceeding the $\le 50\text{ kB}$ gzip bundle budget.

### Architecture
- **Zero Runtime Dependencies**: Lightweight, type-safe dictionary lookup (`src/core/i18n.ts`) mapping semantic string keys to localized translations.
- **Auto-Detection & Persistence**: Automatically detect device language via `navigator.language`, with an in-app language picker persisting user preference in `localStorage`.
- **Planned Initial Locales**:
  - `en` (English - default)
  - `es` (Spanish)
  - `de` (German)
  - `fr` (French)
  - `tr` (Turkish)

### Localization Scope
1. **Dashboard & Weather**: Observing verdict descriptions, hourly cloud tracks, dew point alerts, and twilight names.
2. **Solar System Targets**: Planet visibility statuses (*"Up all night"*, *"Evening viewable"*, etc.), rise/set labels, and IAU constellation names.
3. **Lunar & Solar Ephemeris**: Moon phase names (*"Waxing Crescent"*, *"Full Moon"*), illumination percentages, and solar safety hazard warnings.
4. **Interactive 10° Starfield**: HUD telemetry, aperture modes (*"Circular FOV"* vs. *"Square Sensor Frame"*), orientation indicators (*"Natural"*, *"North-Up"*, *"South-Up"*), time scrubber presets (*"Now"*, *"Dusk"*, *"Dawn"*, *"Rise"*, *"Set"*), and celestial ruler units (*"sep"*, *"PA"*).
5. **Onboarding Tour**: 4-slide feature carousel titles, taglines, and descriptions.

---

## 2. Android API & Interface Compatibility Warnings [Placeholder]

### Status
- **State**: Awaiting exact warning text / stack trace from Google Play Console or Android build output.
- **Category**: Android OS Interface / Platform API Deprecation.

### Suspected Candidates to Investigate
1. **Non-SDK Interface Usage**:
   - Google Play Pre-Launch Report automated flag on private Android runtime APIs accessed via reflection by older support libraries.
2. **Predictive Back & Edge-to-Edge Interface Changes (Android 14 / 15)**:
   - Deprecation of legacy `onBackPressed()` interfaces in favor of `OnBackPressedCallback`.
   - Android 15 mandatory edge-to-edge window insets handling for activities.
3. **`android-browser-helper` Dependency Version**:
   - Upgrade the underlying TWA library in Bubblewrap to the latest Android 14/15-compliant release.
4. **Target SDK & Compilation Toolchain**:
   - Verification of `compileSdkVersion` and `targetSdkVersion` compliance with Play Store requirements.

### Action Plan
When the warning is encountered in Play Console or build logs:
1. Log the exact error/warning code and affected class or interface.
2. Update the corresponding Android wrapper manifest, Gradle dependencies, or `twa-manifest.json` flags.
3. Verify via CI bundle build and Play Console pre-launch report.
