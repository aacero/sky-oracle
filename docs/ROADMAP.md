# SkyOracle: Roadmap & Active Technical Tasks

This document tracks prioritized future features, architectural enhancements, and platform compatibility issues for **SkyOracle**.

---

## 1. Internationalization (i18n) [Implemented in v1.0.18, v1.0.19 & v1.0.20]

### Objective
Expand SkyOracle's reach by localizing all user-facing interfaces, astronomical terminology, and forecast narratives without exceeding the $\le 50\text{ kB}$ gzip bundle budget.

### Architecture
- **Zero Runtime Dependencies**: Lightweight, type-safe dictionary lookup (`src/core/i18n.ts`) mapping semantic string keys to localized translations with dynamic parameter interpolation (`{pct}%`, `{time}`, `{date}`).
- **Auto-Detection & Persistence**: Automatically detects device language via `navigator.language`, with an in-app language picker persisting user preference in `localStorage`.
- **Active Locales (v1.0.20)**:
  - `en` (English - default)
  - `es` (Spanish)
  - `pt` (Portuguese / Brazil & Portugal)
  - `de` (German)
  - `fr` (French)
  - `it` (Italian)
  - `ja` (Japanese)

---

## 2. Observing Window & Celestial Enhancements [Implemented in v1.0.19, v1.0.20 & v1.0.21]

### Contiguous Observing Window Engine
- Multi-constraint window selection incorporating astronomical darkness boundaries (Astro Dusk to Astro Dawn), lunar interference penalties (moon illumination $\times$ altitude above horizon), low cloud cover prioritization, and peak solar-midnight tiebreakers.
- Dedicated continuous Moon Altitude line track below the observing window chart, featuring a $0^\circ$ horizon reference line, subtle muted dashed styling when below horizon, and glowing gold path when above horizon.

### Meteor Showers & 50° Naked-Eye Radiant Starfield (v1.0.20)
- Major annual meteor shower ephemeris engine tracking active dates, peak dates, ZHR rates, moon phase interference, velocity, and parent comets.
- Dedicated Meteor Shower dashboard card positioned below Sun & Twilight ephemeris.
- Interactive $50^\circ$ naked-eye sky window modal for meteor radiants, replacing telescopic eyepiece controls with:
  - Full constellation stick figures and bright anchor stars for Cassiopeia, Cygnus Northern Cross, Hercules Keystone, Big Dipper, Boötes, and Ursa Minor/Polaris.
  - $10^\circ$ "Fist width" angular scale bar.
  - Custom radiant reticle with radiating streak markers.
  - Practical naked-eye observing guidance (recline and look $30^\circ\text{–}60^\circ$ away from the radiant into the darkest part of the sky).

### Universal 24-Hour Time Formatting (v1.0.21)
- Standardized all time representations across the application to 24-hour astronomical format (`HH:mm` e.g., `19:42`, `02:15`, `00:00`).
- Constant 5-character string lengths stabilize column alignment across twilight, lunar, and planetary ephemeris tables without UI jitter.
- Hourly observing timeline displays `HH:00` (e.g. `19:00`, `20:00`) on desktop and `HHh` (e.g. `19h`, `20h`) on compact mobile views to cleanly distinguish hour timestamps from temperature values.

### Independently Draggable Dashboard Cards (v1.0.21)
- Kept the **Hero Verdict & Observing Window** card pinned at the top of `<main>` while making **Moon Ephemeris** (`moon`), **Sun & Twilight** (`sun`), **Solar System Targets** (`planets`), and **Meteor Showers** (`meteors`) independently reorderable via a 6-dot drag handle (`⠿`) using unified `PointerEvents` (touch + mouse) and keyboard arrow keys (`Alt+ArrowUp` / `Alt+ArrowDown`).
- Adaptive 2-column grid layout automatically pairs `moon` and `sun` side-by-side (`md:col-span-1`) when adjacent and expands them to full width (`md:col-span-2`) when separated, persisting custom card order in `localStorage` (`skyoracle_card_order`).

---

## 3. Android 15 Edge-to-Edge & API Compatibility [Resolved in v1.0.18 & v1.0.19]

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

## 4. Upcoming Enhancements & TestCircle Feedback Roadmap

### Priority 1: Android In-Process WebView Wrapper (Native Usage Timer & Seamless App Experience)
- **Context (TestCircle Feedback)**: Testers using TestCircle (which relies on Android's `PACKAGE_USAGE_STATS` / `UsageStatsManager` permission to track foreground time in `com.lapsedacademics.skyoracle`) reported not receiving timer credit because a Trusted Web Activity (TWA) delegates rendering to an external browser process (`com.android.chrome`), and falls back to a visible Custom Tab if Digital Asset Links or the default browser does not support TWA.
- **Planned Solution**: Replace the external Chrome TWA handoff in `LauncherActivity` with an **in-process Android `WebView`** (with `domStorageEnabled`, `javaScriptEnabled`, native Android Geolocation permission bridge, and dark edge-to-edge window styling) so the app runs 100% inside the `com.lapsedacademics.skyoracle` process while continuing to load live OTA updates from `https://aacero.github.io/sky-oracle/`.

### Priority 2: Beginner-Friendly Interactive Onboarding Tutorial
- **Context (TestCircle Feedback)**: Several testers noted that while astronomy enthusiasts love the information density, beginners can find the telemetry intimidating at first glance and requested a clearer interactive tutorial explaining deep-sky observing windows, custom location setup, and how to read the sky charts.
- **Planned Solution**:
  - Upgrade the onboarding tour (`src/ui/tour-modal.ts`) into an interactive, step-by-step guided walkthrough that highlights live UI sections (Observing Verdict & Dark Sky Window, Location Picker & GPS, Planetary Starfield Eyepiece, and Draggable Cards).
  - Add concise plain-language "What does this mean?" explanations for astronomical terms (Astro Dusk, ZHR, Altitude/Azimuth, Moon Interference).

### Priority 3: Interactive Starfield Zoom Controls
- **Context (TestCircle Feedback)**: Testers requested the ability to zoom in and out on the interactive starfield view.
- **Planned Solution**: Add smooth zoom controls (`+` / `-` buttons, pinch-to-zoom gesture support, and quick FOV presets such as `2°` high-power view, `10°` finder/binocular view, and `50°` naked-eye window) to `src/core/starfield.ts`.

### Priority 4: Catalog & Notification Enhancements
- **Deep-Sky Object (DSO) Catalog Expansion**: Add Messier objects (M31, M42, M45) to the interactive starfield telescope view.
- **Meteor Shower Peak Alerts**: Browser/app notification reminders for peak nights of major showers.
