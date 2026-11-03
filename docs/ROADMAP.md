# SkyOracle: Roadmap & Active Technical Tasks

This document tracks prioritized future features, architectural enhancements, and platform compatibility issues for **SkyOracle**.

---

## 1. Internationalization (i18n) [Implemented in v1.0.18]

### Objective
Expand SkyOracle's reach by localizing all user-facing interfaces, astronomical terminology, and forecast narratives without exceeding the $\le 50\text{ kB}$ gzip bundle budget.

### Architecture
- **Zero Runtime Dependencies**: Lightweight, type-safe dictionary lookup (`src/core/i18n.ts`) mapping semantic string keys to localized translations with dynamic parameter interpolation (`{pct}%`, `{time}`, `{date}`).
- **Auto-Detection & Persistence**: Automatically detects device language via `navigator.language`, with an in-app language picker persisting user preference in `localStorage`.
- **Active Locales (v1.0.18)**:
  - `en` (English - default)
  - `es` (Spanish)
  - `pt` (Portuguese / Brazil & Portugal)
  - `de` (German)
  - `fr` (French)
- **Upcoming Locales**:
  - `ja` (Japanese - planned for next iteration)

### Localization Scope
1. **Dashboard & Weather**: Observing verdict descriptions, hourly cloud tracks, dew point alerts, and twilight names.
2. **Solar System Targets**: Planet visibility statuses (*"Up all night"*, *"Evening viewable"*, etc.), rise/set labels, and IAU constellation names.
3. **Lunar & Solar Ephemeris**: Moon phase names (*"Waxing Crescent"*, *"Full Moon"*), illumination percentages, and solar safety hazard warnings.
4. **Interactive 10° Starfield**: HUD telemetry, aperture modes (*"Circular FOV"* vs. *"Square Sensor Frame"*), orientation indicators (*"Natural"*, *"North-Up"*, *"South-Up"*), time scrubber presets (*"Now"*, *"Dusk"*, *"Dawn"*, *"Rise"*, *"Set"*), and celestial ruler units (*"sep"*, *"PA"*).
5. **Onboarding Tour**: 4-slide feature carousel titles, taglines, highlights, and descriptions.

---

## 2. Android 15 Edge-to-Edge & API Compatibility [Resolved in v1.0.18]

### Warnings Diagnosed from Google Play Console
1. **Warning 1 (Mandatory Edge-to-Edge in Android 15 / SDK 35)**:
   > *"Edge-to-edge may not display for all users: From Android 15, apps targeting SDK 35 will display edge-to-edge by default. Apps targeting SDK 35 should handle insets to make sure that their app displays correctly on Android 15 and later. Investigate this issue and allow time to test edge-to-edge and make the required updates. Alternatively, call enableEdgeToEdge() for Kotlin or EdgeToEdge.enable() for Java for backward compatibility."*
2. **Warning 2 (Deprecated APIs or Parameters)**:
   > *"Your app uses deprecated APIs or parameters for edge-to-edge: One or more of the APIs you use or parameters that you set for edge-to-edge and window display have been deprecated in Android 15. To fix this, migrate away from these APIs or parameters."*

### Resolution & Implementation
1. **CSS Safe-Area Insets**:
   - Added standard CSS safe-area insets (`env(safe-area-inset-top)`, `env(safe-area-inset-bottom)`, etc.) to `:root` variables and `body` padding in `src/style.css` so web content naturally clears system status/navigation bars on Android 15+.
2. **Custom LauncherActivity with `EdgeToEdge.enable(this)`**:
   - Updated `.github/workflows/build-android.yml` to automatically scaffold a custom `LauncherActivity.java` inheriting from `com.google.androidbrowserhelper.trusted.LauncherActivity` that calls `androidx.activity.EdgeToEdge.enable(this);` inside `onCreate()`.
   - Injected `implementation 'androidx.activity:activity:1.9.3'` into `app/build.gradle`.
3. **Removed Deprecated Manifest Parameters**:
   - Stripped legacy `android.support.customtabs.trusted.STATUS_BAR_COLOR` and `NAVIGATION_BAR_COLOR` meta-data tags from `app/src/main/AndroidManifest.xml` which triggered deprecated `Window.setStatusBarColor()` calls in older Android TWA runtimes.

---

## 3. Upcoming Enhancements

- **Japanese (`ja`) Localization**: Add Japanese language dictionary and locale option.
- **Deep-Sky Object (DSO) Catalog Expansion**: Add Messier objects (M31, M42, M45) to the 10° interactive starfield telescope view.
