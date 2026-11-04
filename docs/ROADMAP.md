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

## 4. Upcoming Enhancements

- **Deep-Sky Object (DSO) Catalog Expansion**: Add Messier objects (M31, M42, M45) to the interactive starfield telescope view.
- **Meteor Shower Peak Alerts**: Browser notification reminders for peak nights of major showers.
