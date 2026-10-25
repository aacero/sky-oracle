import {
  calculateSunEvents,
  calculateMoonInfo,
  calculateAllPlanets,
  formatTime,
  formatShortDate,
  SunEvents,
  MoonInfo,
  PlanetInfo
} from './core/astronomy.ts';

import {
  fetchCloudForecast,
  searchCities,
  ObservingForecast,
  GeocodingResult
} from './core/weather.ts';

import {
  loadLocation,
  saveLocation,
  loadRecents,
  loadTempUnit,
  saveTempUnit,
  SavedLocation
} from './core/storage.ts';

import {
  renderStarfield,
  formatRa,
  formatDec,
  PLANET_COLORS
} from './core/starfield.ts';

export const APP_VERSION = '1.0.2';

// ── Application State ───────────────────────────────────────────────────────

interface AppState {
  location: SavedLocation;
  currentDate: Date;
  tempUnit: 'F' | 'C';
  forecast: ObservingForecast | null;
  sunEvents: SunEvents | null;
  moon: MoonInfo | null;
  planets: PlanetInfo[];
  selectedPlanet: PlanetInfo | null;
  loading: boolean;
  error: string | null;
  searchOpen: boolean;
  searchQuery: string;
  searchResults: GeocodingResult[];
  searchLoading: boolean;
  installPrompt: any | null;
}

const state: AppState = {
  location: loadLocation(),
  currentDate: new Date(),
  tempUnit: loadTempUnit(),
  forecast: null,
  sunEvents: null,
  moon: null,
  planets: [],
  selectedPlanet: null,
  loading: false,
  error: null,
  searchOpen: false,
  searchQuery: '',
  searchResults: [],
  searchLoading: false,
  installPrompt: null
};

// ── PWA Install Prompt Listener ─────────────────────────────────────────────

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  state.installPrompt = e;
  render();
});

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  });
}

// ── Data Loading & Computation ──────────────────────────────────────────────

async function refreshAll() {
  state.loading = true;
  state.error = null;
  render();

  try {
    // 1. Compute local astronomical ephemeris (100% offline, <1ms)
    state.sunEvents = calculateSunEvents(state.currentDate, state.location.lat, state.location.lon);
    state.moon = calculateMoonInfo(state.currentDate, state.location.lat, state.location.lon);
    state.planets = calculateAllPlanets(state.currentDate, state.location.lat, state.location.lon);

    // 2. Fetch cloud cover telemetry from Open-Meteo
    state.forecast = await fetchCloudForecast(state.location.lat, state.location.lon, state.currentDate);
  } catch (err: any) {
    console.error('Forecast fetch failed:', err);
    state.error = err.message || 'Forecast unavailable';
  } finally {
    state.loading = false;
    render();
  }
}

// ── Realistic Moon Image Asset & Canvas Visualizer ──────────────────────────

const moonImage = new Image();
let moonImageLoaded = false;
moonImage.src = './moon_photo.png';
moonImage.onload = () => {
  moonImageLoaded = true;
  drawMoonCanvas();
};
if (moonImage.complete && moonImage.naturalWidth !== 0) {
  moonImageLoaded = true;
}

function drawMoonCanvas() {
  const canvas = document.getElementById('moonCanvas') as HTMLCanvasElement | null;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.max(0, Math.min(width, height) / 2 - 6);

  ctx.save();
  ctx.clearRect(0, 0, width, height);
  if (radius <= 0) {
    ctx.restore();
    return;
  }

  // Base circular clip for the whole moon disc
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();

  // Dark background disc
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

  // Unilluminated Earthshine layer: faint realistic moon photo
  if (moonImageLoaded && moonImage.complete && moonImage.naturalWidth !== 0) {
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.drawImage(moonImage, cx - radius, cy - radius, radius * 2, radius * 2);
    ctx.restore();
  } else {
    ctx.fillStyle = '#161b22';
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
  }

  // Illuminated portion with Bezier terminator clipping
  const cyclePos = state.moon ? state.moon.cyclePos : 0.25;
  const phase = Math.max(0, Math.min(1, cyclePos));
  const k = 1.333333; // 4/3 cubic Bezier constant for circle arc approximation

  if (phase > 0.001 && phase < 0.999) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy - radius);

    if (phase <= 0.5) {
      // Waxing (illuminated on right)
      ctx.bezierCurveTo(
        cx + k * radius, cy - radius,
        cx + k * radius, cy + radius,
        cx, cy + radius
      );
      const waxingTerminator = cx + k * radius * Math.cos(2 * Math.PI * phase);
      ctx.bezierCurveTo(
        waxingTerminator, cy + radius,
        waxingTerminator, cy - radius,
        cx, cy - radius
      );
    } else {
      // Waning (illuminated on left)
      ctx.bezierCurveTo(
        cx - k * radius, cy - radius,
        cx - k * radius, cy + radius,
        cx, cy + radius
      );
      const waningTerminator = cx - k * radius * Math.cos(2 * Math.PI * phase);
      ctx.bezierCurveTo(
        waningTerminator, cy + radius,
        waningTerminator, cy - radius,
        cx, cy - radius
      );
    }

    ctx.closePath();
    ctx.clip();

    // Draw full-brightness realistic photo in illuminated region
    if (moonImageLoaded && moonImage.complete && moonImage.naturalWidth !== 0) {
      ctx.drawImage(moonImage, cx - radius, cy - radius, radius * 2, radius * 2);
    } else {
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    }
    ctx.restore();
  }

  ctx.restore(); // Restore base circular clip

  // Subtle luminous rim / accent ring
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
  ctx.lineWidth = Math.max(2, radius * 0.035);
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore(); // Restore initial canvas state
}

function drawPlanetStarfield() {
  if (!state.selectedPlanet) return;
  const canvas = document.getElementById('planetStarfieldCanvas') as HTMLCanvasElement | null;
  if (!canvas) return;

  renderStarfield(canvas, state.selectedPlanet, {
    fovDeg: 10.0,
    maxMag: 6.0,
    showLabels: true,
    showReticle: true,
    showCompass: true
  });
}

// ── Geolocation & IP Fallback ───────────────────────────────────────────────

async function fetchIpLocation(): Promise<SavedLocation | null> {
  try {
    const res = await fetch('https://ipwho.is/');
    if (!res.ok) return null;
    const data = await res.json();
    if (data.success && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
      const place = [data.city, data.region_code || data.region, data.country_code || data.country]
        .filter(Boolean)
        .join(', ');
      return {
        place: place || 'My Location',
        lat: Math.round(data.latitude * 10000) / 10000,
        lon: Math.round(data.longitude * 10000) / 10000
      };
    }
  } catch (err) {
    console.warn('IP geolocation lookup failed:', err);
  }
  return null;
}

async function handleGeolocate() {
  state.loading = true;
  render();

  const fallbackToIp = async () => {
    const ipLoc = await fetchIpLocation();
    if (ipLoc) {
      state.location = ipLoc;
      saveLocation(ipLoc);
      await refreshAll();
      return true;
    }
    return false;
  };

  if (!navigator.geolocation) {
    const ok = await fallbackToIp();
    if (!ok) {
      state.loading = false;
      alert('Unable to determine location automatically. Please search for your city above.');
      render();
    }
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const lat = Math.round(pos.coords.latitude * 10000) / 10000;
      const lon = Math.round(pos.coords.longitude * 10000) / 10000;
      const newLoc: SavedLocation = {
        place: 'My Location',
        lat,
        lon
      };
      state.location = newLoc;
      saveLocation(newLoc);
      await refreshAll();
    },
    async (err) => {
      console.warn('Browser geolocation failed, attempting IP fallback:', err.message);
      const ok = await fallbackToIp();
      if (!ok) {
        state.loading = false;
        alert(`Location access failed: ${err.message}. Please search for your city above.`);
        render();
      }
    },
    { timeout: 7000, enableHighAccuracy: true }
  );
}

// ── UI Rendering ────────────────────────────────────────────────────────────

function render() {
  const root = document.getElementById('app');
  if (!root) return;

  const now = new Date();
  const isDarkSkyNow = Boolean(
    state.sunEvents?.astroDusk &&
    state.sunEvents?.astroDawn &&
    now >= state.sunEvents.astroDusk &&
    now <= state.sunEvents.astroDawn
  );

  root.innerHTML = `
    <!-- Top Navigation & Brand Header -->
    <header class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#30363d]">
      <div class="flex items-center gap-3">
        <img src="./icon.svg" alt="SkyOracle Logo" class="w-10 h-10 rounded-xl shadow-lg border border-[#30363d]" />
        <div>
          <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-[#e6edf3] flex items-center gap-2">
            SkyOracle
            <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#58a6ff]/15 text-[#58a6ff] border border-[#58a6ff]/30 font-mono">v${APP_VERSION}</span>
          </h1>
          <p class="text-xs text-[#8b949e]">Stargazing forecast, ephemeris & planet guide</p>
        </div>
      </div>

      <div class="flex items-center gap-2 flex-wrap">
        <!-- Location Picker Button -->
        <button id="btnOpenSearch" class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] text-sm font-medium transition cursor-pointer">
          <span class="text-[#58a6ff]">📍</span>
          <span class="text-[#e6edf3]">${state.location.place}</span>
          <span class="text-xs text-[#8b949e] font-mono">(${state.location.lat.toFixed(2)}°, ${state.location.lon.toFixed(2)}°)</span>
        </button>

        <!-- 1-Tap GPS Button -->
        <button id="btnGeolocate" title="Use current GPS location" class="p-2 rounded-lg bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] text-[#58a6ff] hover:text-white transition cursor-pointer">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
        </button>

        <!-- Install PWA Button (if available) -->
        ${state.installPrompt ? `
          <button id="btnInstallPwa" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400 text-xs font-semibold transition cursor-pointer">
            <span>📲 Install App</span>
          </button>
        ` : ''}

        <!-- Unit Toggle Button -->
        <button id="btnToggleUnit" title="Switch to ${state.tempUnit === 'F' ? 'Celsius' : 'Fahrenheit'}" class="px-2.5 py-1.5 rounded-lg bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] text-xs font-bold text-[#58a6ff] hover:text-white transition cursor-pointer">
          °${state.tempUnit}
        </button>

        <!-- Refresh Button -->
        <button id="btnRefresh" title="Refresh Forecast" class="p-2 rounded-lg bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] text-[#8b949e] hover:text-white transition cursor-pointer ${state.loading ? 'animate-spin text-[#58a6ff]' : ''}">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
        </button>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 py-6 flex flex-col gap-6">

      <!-- Hero Verdict & Observing Summary Card -->
      <section class="rounded-2xl p-5 sm:p-6 bg-[#161b22] border border-[#30363d] relative overflow-hidden shadow-xl" style="border-left: 6px solid ${state.forecast?.verdictAccent || '#58a6ff'};">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-2 mb-2 flex-wrap">
              <span class="text-xs uppercase tracking-wider font-bold text-[#8b949e]">TONIGHT'S OBSERVING VERDICT</span>
              ${isDarkSkyNow ? `
                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#58a6ff]/20 text-[#58a6ff] border border-[#58a6ff]/40 animate-pulse-subtle">
                  🌌 DARK SKY ACTIVE
                </span>
              ` : ''}
              ${state.forecast ? `
                <span class="text-xs text-[#8b949e] ml-auto">
                  ${state.forecast.observingDateLabel}
                </span>
              ` : ''}
            </div>

            <div class="flex items-center gap-3">
              <span class="text-3xl sm:text-4xl">${state.forecast?.verdictEmoji || '🔭'}</span>
              <div>
                <h2 class="text-xl sm:text-2xl font-bold text-[#e6edf3]">
                  ${state.forecast?.verdict || (state.loading ? 'Forecasting skies…' : 'Clear skies expected')}
                </h2>
                <p class="text-sm text-[#8b949e] mt-0.5">
                  ${state.forecast?.bestWindow ? `Clearest around <span class="text-white font-semibold">${state.forecast.bestWindow.label}</span> (${state.forecast.bestWindow.cloud}% cloud cover)` : 'Calculating observing window…'}
                  ${state.forecast ? ` · Avg cloud: ${state.forecast.avgCloud}%` : ''}
                </p>
              </div>
            </div>

            ${state.forecast ? `
              <!-- Night Stargazing Weather Telemetry -->
              <div class="flex items-center gap-2 sm:gap-3 mt-4 flex-wrap text-xs">
                <!-- Temp Pill -->
                <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-[#30363d]/60">
                  <span class="text-amber-400 font-bold">🌡️</span>
                  <span class="font-bold text-[#e6edf3] text-sm">
                    ${state.tempUnit === 'F' ? `${state.forecast.currentTempF}°F` : `${state.forecast.currentTempC}°C`}
                  </span>
                  <span class="text-[#8b949e]">
                    (Overnight Low: <strong class="text-white font-medium">${state.tempUnit === 'F' ? `${state.forecast.minTempF}°F` : `${state.forecast.minTempC}°C`}</strong>)
                  </span>
                </div>

                <!-- Feels Like Pill -->
                <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-[#30363d]/60">
                  <span class="text-[#8b949e]">Feels:</span>
                  <span class="font-semibold text-[#e6edf3]">
                    ${state.tempUnit === 'F' ? `${state.forecast.feelsLikeF}°F` : `${state.forecast.feelsLikeC}°C`}
                  </span>
                </div>

                <!-- Dew / Frost Alert Pill -->
                <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${state.forecast.dewRisk === 'high' ? 'bg-amber-500/10 border-amber-500/40 text-amber-300' : (state.forecast.dewRisk === 'moderate' ? 'bg-sky-500/10 border-sky-500/30 text-sky-300' : 'bg-white/[0.04] border-[#30363d]/60 text-[#8b949e]')}">
                  <span>${state.forecast.minTempC <= 0 && state.forecast.dewRisk === 'high' ? '❄️' : '💧'}</span>
                  <span class="font-medium">${state.forecast.dewRiskLabel}</span>
                  <span class="text-[10px] opacity-75 font-mono">(${state.tempUnit === 'F' ? `Dew pt ${state.forecast.dewPointF}°` : `Dew pt ${state.forecast.dewPointC}°`})</span>
                </div>

                <!-- Wind Pill -->
                <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-[#30363d]/60 text-[#8b949e]">
                  <span>💨</span>
                  <span>Wind: <strong class="text-white font-medium">${state.tempUnit === 'F' ? `${state.forecast.windSpeedMph} mph` : `${state.forecast.windSpeedKmh} km/h`}</strong></span>
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Quick Stats Pill -->
          <div class="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-[#30363d]/60 gap-1 text-xs">
            <span class="text-[#8b949e]">Last Updated: ${state.forecast ? formatTime(state.forecast.lastUpdated) : '—'}</span>
            <span class="text-[#56d4dd] font-medium">100% Offline Astronomy</span>
          </div>
        </div>

        <!-- Hourly Observing Window Chart -->
        <div class="mt-6 pt-5 border-t border-[#30363d]">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-xs font-bold tracking-wider uppercase text-[#8b949e] flex items-center gap-1.5">
              <span>🔭 OBSERVING WINDOW (${state.forecast?.hourlyWindow[0]?.label || '7 PM'} – ${state.forecast?.hourlyWindow[state.forecast?.hourlyWindow.length - 1]?.label || '6 AM'})</span>
            </h3>
            <span class="text-[11px] text-[#8b949e] hidden sm:inline">Taller bar = Clearer sky · Highlight = Astronomical Dark Sky</span>
          </div>

          ${state.forecast?.hourlyWindow && state.forecast.hourlyWindow.length > 0 ? `
            <div class="grid gap-1 sm:gap-2" style="grid-template-columns: repeat(${state.forecast.hourlyWindow.length}, minmax(0, 1fr));">
              ${state.forecast.hourlyWindow.map(h => {
                const isBest = state.forecast?.bestWindow?.hr === h.hr;
                return `
                  <div class="flex flex-col items-center gap-1 group relative cursor-pointer" title="${h.label}: ${h.cloud}% clouds, ${state.tempUnit === 'F' ? `${h.tempF}°F (feels ${h.feelsLikeF}°F)` : `${h.tempC}°C (feels ${h.feelsLikeC}°C)`}, wind ${state.tempUnit === 'F' ? `${h.windSpeedMph} mph` : `${h.windSpeedKmh} km/h`}${h.isDarkSky ? ' [True Dark Sky]' : ''}">
                    <!-- Cloud % / Clear text -->
                    <span class="text-[10px] sm:text-xs font-semibold ${isBest ? 'text-amber-400 font-bold' : (h.cloud <= 20 ? 'text-emerald-400' : (h.cloud <= 55 ? 'text-[#58a6ff]' : 'text-[#8b949e]'))}">
                      ${h.cloud <= 5 ? '0%' : `${h.cloud}%`}
                    </span>

                    <!-- Track and Clarity bar -->
                    <div class="w-full max-w-[28px] h-24 sm:h-28 rounded-md relative flex flex-col justify-end p-0.5 border ${isBest ? 'border-amber-400/60 shadow-[0_0_10px_rgba(251,191,36,0.25)]' : (h.isDarkSky ? 'border-[#58a6ff]/40' : 'border-transparent')} ${h.isDarkSky ? 'bg-[#58a6ff]/10' : 'bg-white/[0.04]'}">
                      <div
                        class="w-full rounded-sm transition-all duration-500"
                        style="height: ${Math.max(8, h.clarity)}%; background: ${h.clarity >= 80 ? 'linear-gradient(to top, #059669, #34d399)' : (h.clarity >= 50 ? 'linear-gradient(to top, #2563eb, #60a5fa)' : (h.clarity >= 25 ? 'linear-gradient(to top, #d97706, #fbbf24)' : 'linear-gradient(to top, #dc2626, #f87171)'))};"
                      ></div>
                    </div>

                    <!-- Hour label -->
                    <span class="text-[10px] sm:text-xs font-medium ${isBest ? 'text-white font-bold' : 'text-[#8b949e]'}">
                      <span class="sm:hidden">${h.labelCompact}</span>
                      <span class="hidden sm:inline">${h.label}</span>
                    </span>

                    <!-- Hourly Temperature -->
                    <span class="text-[10px] sm:text-[11px] font-mono font-medium ${h.tempC <= 0 ? 'text-sky-300' : 'text-[#8b949e]'}">
                      ${state.tempUnit === 'F' ? `${h.tempF}°` : `${h.tempC}°`}
                    </span>
                  </div>
                `;
              }).join('')}
            </div>
          ` : `
            <div class="py-10 text-center text-sm text-[#8b949e]">
              ${state.loading ? 'Calculating observing window…' : 'Forecast data currently unavailable offline'}
            </div>
          `}
        </div>
      </section>

      <!-- 2-Column Responsive Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

        <!-- Naked-Eye Planets Card -->
        <section class="rounded-2xl p-5 sm:p-6 bg-[#161b22] border border-[#30363d] shadow-lg flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between pb-3 mb-4 border-b border-[#30363d] flex-wrap gap-2">
              <h3 class="text-sm font-bold tracking-wider uppercase text-[#8b949e] flex items-center gap-2">
                <span>🪐</span> NAKED-EYE PLANETS
              </h3>
              <div class="flex items-center gap-2">
                <span class="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20" title="Planets in amber text are up all night or well-positioned in the evening sky">
                  <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  Amber = Evening / Night Viewable
                </span>
              </div>
            </div>

            <div class="flex flex-col gap-2.5">
              ${state.planets.map(p => {
                const isPrime = p.status.includes('Up all night') || p.status.includes('Evening');
                return `
                  <div
                    role="button"
                    tabindex="0"
                    data-planet="${p.key}"
                    class="btnPlanetCard flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-[#30363d]/50 hover:border-amber-400/40 transition cursor-pointer group"
                    title="Click to view 10° starfield centered on ${p.name}"
                  >
                    <div class="flex items-center gap-3">
                      <span class="text-xl ${isPrime ? 'text-amber-400' : 'text-[#e6edf3]'} font-bold w-6 text-center group-hover:scale-110 transition-transform">${p.symbol}</span>
                      <div>
                        <div class="flex items-center gap-2">
                          <span class="font-bold text-sm text-[#e6edf3] group-hover:text-amber-300 transition-colors">${p.name}</span>
                          <!-- Plain-text Constellation badge -->
                          <span class="px-2 py-0.5 rounded text-[11px] font-bold bg-[#56d4dd]/15 text-[#56d4dd] border border-[#56d4dd]/30">
                            ${p.constellation}
                          </span>
                        </div>
                        <span class="text-xs font-medium ${isPrime ? 'text-amber-400' : 'text-[#8b949e]'}">
                          ${p.status}
                        </span>
                      </div>
                    </div>

                    <div class="flex items-center gap-3">
                      <div class="text-right text-xs text-[#8b949e]">
                        ${p.set ? `<div>Set ${formatTime(p.set)}</div>` : ''}
                        ${p.rise ? `<div>Rise ${formatTime(p.rise)}</div>` : ''}
                      </div>
                      <div class="flex items-center gap-1 text-[#8b949e] group-hover:text-amber-400 transition-colors pl-1">
                        <span class="text-[11px] font-bold hidden sm:inline opacity-70 group-hover:opacity-100 transition-opacity">10° Field</span>
                        <span class="text-sm">🔭</span>
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </section>

        <!-- Moon Phase & Twilight Timeline Column -->
        <div class="flex flex-col gap-6">

          <!-- Moon Phase Card -->
          <section class="rounded-2xl p-5 bg-[#161b22] border border-[#30363d] shadow-lg">
            <div class="flex items-center justify-between pb-3 mb-3 border-b border-[#30363d]">
              <h3 class="text-sm font-bold tracking-wider uppercase text-[#8b949e] flex items-center gap-2">
                <span>🌙</span> MOON PHASE & ILLUMINATION
              </h3>
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-[#58a6ff]/15 text-[#58a6ff] border border-[#58a6ff]/30">
                  ${state.moon?.phaseDirection || 'Waxing'}
                </span>
                <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-400 border border-amber-400/30">
                  ${state.moon?.illum || 0}% Illuminated
                </span>
              </div>
            </div>

            <!-- Top Row: Moon Canvas + Details -->
            <div class="flex items-center justify-between gap-4">
              <div class="flex items-center gap-4">
                <canvas id="moonCanvas" width="180" height="180" class="w-20 h-20 sm:w-24 sm:h-24 shrink-0 drop-shadow-[0_0_14px_rgba(251,191,36,0.3)]"></canvas>
                <div>
                  <h4 class="text-lg font-bold text-[#e6edf3]">${state.moon?.name || 'Waxing Moon'}</h4>
                  <p class="text-xs text-[#8b949e] mt-0.5">
                    Age: <span class="text-white font-medium">${state.moon?.age.toFixed(1) || '0'} days</span> · ${state.moon?.phaseDirection || 'Waxing'}
                  </p>
                  <p class="text-xs text-[#8b949e] mt-0.5">
                    Altitude: <span class="${(state.moon?.isUp ?? false) ? 'text-emerald-400' : 'text-[#8b949e]'} font-medium">
                      ${state.moon?.altitude !== undefined ? `${state.moon.altitude > 0 ? '+' : ''}${state.moon.altitude.toFixed(1)}° (${state.moon.isUp ? 'Above Horizon' : 'Below Horizon'})` : '—'}
                    </span>
                  </p>
                  <p class="text-xs text-[#8b949e] mt-0.5">
                    Deep sky impact: <span class="${(state.moon?.illum || 0) < 30 ? 'text-emerald-400' : 'text-amber-400'} font-medium">${(state.moon?.illum || 0) < 30 ? 'Minimal (Faint DSOs visible)' : 'Moderate wash out'}</span>
                  </p>
                </div>
              </div>
            </div>

            <!-- Lunar Cycle Progress Bar -->
            <div class="mt-4 pt-3 border-t border-[#30363d]/60">
              <div class="flex justify-between items-center text-[10px] font-bold text-[#8b949e] tracking-wider uppercase mb-1.5">
                <span>LUNAR CYCLE</span>
                <span>${Math.round((state.moon?.cyclePos || 0) * 100)}%</span>
              </div>
              <div class="w-full h-2 rounded-full bg-[#21262d] overflow-hidden relative">
                <div class="h-full bg-gradient-to-r from-amber-400/80 to-amber-300 rounded-full transition-all duration-500" style="width: ${Math.max(2, Math.min(100, Math.round((state.moon?.cyclePos || 0) * 100)))}%"></div>
              </div>
              <div class="flex justify-between text-[10px] text-[#8b949e] font-semibold mt-1">
                <span>NEW</span>
                <span>FULL</span>
                <span>NEW</span>
              </div>
            </div>

            <!-- Rise / Set / Next Dates Grid -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3 pt-3 border-t border-[#30363d]/60 text-xs">
              <div class="p-2.5 rounded-xl bg-white/[0.02] border border-[#30363d]/40">
                <span class="text-[#8b949e] block text-[10px] uppercase font-bold">Next Rise</span>
                <span class="text-sm font-bold text-amber-300">${formatTime(state.moon?.rise || null)}</span>
              </div>
              <div class="p-2.5 rounded-xl bg-white/[0.02] border border-[#30363d]/40">
                <span class="text-[#8b949e] block text-[10px] uppercase font-bold">Next Set</span>
                <span class="text-sm font-bold text-amber-300">${formatTime(state.moon?.set || null)}</span>
              </div>
              <div class="p-2.5 rounded-xl bg-white/[0.02] border border-[#30363d]/40">
                <span class="text-[#8b949e] block text-[10px] uppercase font-bold">Next New</span>
                <span class="text-sm font-bold text-[#58a6ff]">${formatShortDate(state.moon?.nextNew || null)}</span>
              </div>
              <div class="p-2.5 rounded-xl bg-white/[0.02] border border-[#30363d]/40">
                <span class="text-[#8b949e] block text-[10px] uppercase font-bold">Next Full</span>
                <span class="text-sm font-bold text-amber-300">${formatShortDate(state.moon?.nextFull || null)}</span>
              </div>
            </div>
          </section>

          <!-- Sun & Twilight Events Card -->
          <section class="rounded-2xl p-5 bg-[#161b22] border border-[#30363d] shadow-lg flex-1">
            <div class="flex items-center justify-between pb-3 mb-3 border-b border-[#30363d]">
              <h3 class="text-sm font-bold tracking-wider uppercase text-[#8b949e] flex items-center gap-2">
                <span>☀️</span> SOLAR TWILIGHT TIMELINE
              </h3>
              <span class="text-xs text-[#8b949e]">Local Solar Times</span>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div class="p-2.5 rounded-xl bg-white/[0.02] border border-[#30363d]/40">
                <span class="text-[#8b949e] block text-[10px] uppercase font-bold">Sunset (-0.8°)</span>
                <span class="text-sm font-bold text-amber-300">${formatTime(state.sunEvents?.sunset || null)}</span>
              </div>
              <div class="p-2.5 rounded-xl bg-white/[0.02] border border-[#30363d]/40">
                <span class="text-[#8b949e] block text-[10px] uppercase font-bold">Civil Dusk (-6°)</span>
                <span class="text-sm font-bold text-sky-300">${formatTime(state.sunEvents?.civilDusk || null)}</span>
              </div>
              <div class="p-2.5 rounded-xl bg-white/[0.02] border border-[#30363d]/40">
                <span class="text-[#8b949e] block text-[10px] uppercase font-bold">Nautical Dusk (-12°)</span>
                <span class="text-sm font-bold text-indigo-300">${formatTime(state.sunEvents?.nauticalDusk || null)}</span>
              </div>
              <div class="p-2.5 rounded-xl bg-[#58a6ff]/10 border border-[#58a6ff]/40">
                <span class="text-[#58a6ff] block text-[10px] uppercase font-bold">🌌 Astro Dusk (-18°)</span>
                <span class="text-sm font-bold text-[#58a6ff]">${formatTime(state.sunEvents?.astroDusk || null)}</span>
              </div>
              <div class="p-2.5 rounded-xl bg-[#58a6ff]/10 border border-[#58a6ff]/40">
                <span class="text-[#58a6ff] block text-[10px] uppercase font-bold">🌅 Astro Dawn (-18°)</span>
                <span class="text-sm font-bold text-[#58a6ff]">${formatTime(state.sunEvents?.astroDawn || null)}</span>
              </div>
              <div class="p-2.5 rounded-xl bg-white/[0.02] border border-[#30363d]/40">
                <span class="text-[#8b949e] block text-[10px] uppercase font-bold">Sunrise (-0.8°)</span>
                <span class="text-sm font-bold text-amber-300">${formatTime(state.sunEvents?.sunrise || null)}</span>
              </div>
            </div>
          </section>

        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="pt-6 border-t border-[#30363d] flex flex-col sm:flex-row items-center justify-between text-xs text-[#8b949e] gap-2">
      <div>SkyOracle <span class="font-mono text-[#58a6ff]">v${APP_VERSION}</span> · Offline NOAA/Meeus Astronomy + Open-Meteo Telemetry</div>
      <div class="flex items-center gap-3">
        <span>No API Keys Needed</span>
        <span>·</span>
        <span>PWA Ready</span>
        <span>·</span>
        <a href="./privacy.html" target="_blank" class="hover:text-[#58a6ff] transition underline">Privacy Policy</a>
      </div>
    </footer>

    <!-- Location Search Modal -->
    ${state.searchOpen ? renderSearchModal() : ''}

    <!-- Planet 10x10 Starfield Modal -->
    ${state.selectedPlanet ? renderPlanetModal() : ''}
  `;

  attachEventHandlers();
  drawMoonCanvas();
  drawPlanetStarfield();
}

function renderSearchResultsList(results: GeocodingResult[]): string {
  if (!results.length) return '';
  return `
    <div class="flex flex-col gap-1 max-h-56 overflow-y-auto">
      <span class="text-[11px] font-bold uppercase tracking-wider text-[#8b949e] px-1">Search Results</span>
      ${results.map(r => `
        <button
          type="button"
          class="btnSelectCity flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.05] text-left transition cursor-pointer"
          data-place="${r.name}${r.admin1 ? `, ${r.admin1}` : ''}${r.country ? `, ${r.country}` : ''}"
          data-lat="${r.latitude}"
          data-lon="${r.longitude}"
        >
          <div>
            <div class="text-sm font-semibold text-[#e6edf3]">${r.name}</div>
            <div class="text-xs text-[#8b949e]">${[r.admin1, r.country].filter(Boolean).join(', ')}</div>
          </div>
          <div class="text-xs font-mono text-[#58a6ff]">${r.latitude.toFixed(2)}°, ${r.longitude.toFixed(2)}°</div>
        </button>
      `).join('')}
    </div>
  `;
}

function renderSearchModal(): string {
  const recents = loadRecents();

  return `
    <div id="searchModalOverlay" class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center p-4 pt-20 animate-fade-in">
      <div class="bg-[#161b22] border border-[#30363d] rounded-2xl w-full max-w-lg shadow-2xl p-5 flex flex-col gap-4">
        <div class="flex items-center justify-between pb-3 border-b border-[#30363d]">
          <h3 class="text-base font-bold text-[#e6edf3] flex items-center gap-2">
            <span>📍</span> Change Stargazing Location
          </h3>
          <button id="btnCloseSearch" class="p-1 rounded-lg text-[#8b949e] hover:text-white transition cursor-pointer" aria-label="Close">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <!-- Search Input -->
        <div class="relative">
          <input
            id="inputCitySearch"
            type="text"
            placeholder="Search city or location (e.g. Flagstaff, Denver, Tokyo)…"
            value="${state.searchQuery}"
            class="w-full px-4 py-2.5 rounded-xl bg-[#0d1117] border border-[#30363d] text-sm text-[#e6edf3] placeholder-[#8b949e] focus:outline-none focus:border-[#58a6ff] transition"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
          />
          <div id="searchLoadingSpinner" class="${state.searchLoading ? '' : 'hidden'} absolute right-3 top-3 w-4 h-4 border-2 border-[#58a6ff] border-t-transparent rounded-full animate-spin"></div>
        </div>

        <!-- Search Results Container -->
        <div id="searchResultsContainer">
          ${renderSearchResultsList(state.searchResults)}
        </div>

        <!-- Recents List -->
        <div class="flex flex-col gap-2 pt-2 border-t border-[#30363d]/60">
          <span class="text-[11px] font-bold uppercase tracking-wider text-[#8b949e]">Recent Locations</span>
          <div class="flex flex-wrap gap-2">
            ${recents.map(r => `
              <button
                type="button"
                class="btnSelectCity px-3 py-1.5 rounded-lg bg-[#0d1117] hover:bg-[#21262d] border border-[#30363d] text-xs font-medium text-[#e6edf3] transition cursor-pointer"
                data-place="${r.place}"
                data-lat="${r.lat}"
                data-lon="${r.lon}"
              >
                ${r.place}
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderPlanetModal(): string {
  const p = state.selectedPlanet;
  if (!p) return '';

  const isPrime = p.status.includes('Up all night') || p.status.includes('Evening');
  const pColors = PLANET_COLORS[p.key] || { fill: '#fed7aa', stroke: '#fb923c', glow: '', name: p.name };

  return `
    <div id="planetModalOverlay" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div class="bg-[#161b22] border border-[#30363d] rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[94vh] overflow-hidden animate-scale-up">
        
        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b border-[#30363d] bg-black/20">
          <div class="flex items-center gap-3">
            <span class="text-3xl font-bold w-8 text-center drop-shadow" style="color: ${pColors.fill}">${p.symbol}</span>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="text-lg font-bold text-[#e6edf3]">${p.name}</h3>
                <span class="px-2 py-0.5 rounded text-xs font-bold bg-[#56d4dd]/15 text-[#56d4dd] border border-[#56d4dd]/30">
                  ${p.constellation}
                </span>
                <span class="px-2 py-0.5 rounded text-[11px] font-bold ${isPrime ? 'bg-amber-400/15 text-amber-400 border border-amber-400/30' : 'bg-slate-700/30 text-slate-300 border border-slate-700/50'}">
                  ${p.status}
                </span>
              </div>
              <p class="text-xs text-[#8b949e] mt-0.5">10° × 10° Geocentric Telescopic / Binocular Starfield</p>
            </div>
          </div>

          <button id="btnClosePlanetModal" class="p-1.5 rounded-lg text-[#8b949e] hover:text-white hover:bg-white/10 transition cursor-pointer" aria-label="Close starfield modal">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <!-- Coordinates & Telemetry Chip Bar -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-black/30 border-b border-[#30363d]/60 text-xs">
          <div class="p-2 rounded-xl bg-white/[0.02] border border-[#30363d]/40">
            <span class="text-[10px] uppercase font-bold text-[#8b949e] block">Right Ascension</span>
            <span class="font-bold text-[#e6edf3] text-sm">${formatRa(p.ra)}</span>
            <span class="text-[10px] text-[#8b949e] block font-mono">(${p.ra.toFixed(2)}°)</span>
          </div>
          <div class="p-2 rounded-xl bg-white/[0.02] border border-[#30363d]/40">
            <span class="text-[10px] uppercase font-bold text-[#8b949e] block">Declination</span>
            <span class="font-bold text-[#e6edf3] text-sm">${formatDec(p.dec)}</span>
            <span class="text-[10px] text-[#8b949e] block font-mono">(${p.dec >= 0 ? '+' : ''}${p.dec.toFixed(2)}°)</span>
          </div>
          <div class="p-2 rounded-xl bg-white/[0.02] border border-[#30363d]/40">
            <span class="text-[10px] uppercase font-bold text-[#8b949e] block">Field of View</span>
            <span class="font-bold text-sky-400 text-sm">10° × 10°</span>
            <span class="text-[10px] text-[#8b949e] block">7×50 / Finder FOV</span>
          </div>
          <div class="p-2 rounded-xl bg-white/[0.02] border border-[#30363d]/40">
            <span class="text-[10px] uppercase font-bold text-[#8b949e] block">Star Depth</span>
            <span class="font-bold text-amber-300 text-sm">Mag ≤ 6.0</span>
            <span class="text-[10px] text-[#8b949e] block">Naked-Eye Limit</span>
          </div>
        </div>

        <!-- Starfield Canvas Container -->
        <div class="p-4 flex flex-col items-center justify-center overflow-y-auto">
          <div class="relative w-full max-w-[360px] aspect-square">
            <canvas
              id="planetStarfieldCanvas"
              class="w-full h-full rounded-2xl border border-[#30363d] shadow-2xl block bg-[#020408]"
            ></canvas>
          </div>

          <!-- Guide / Caption -->
          <div class="mt-3 text-center text-xs text-[#8b949e] max-w-sm">
            <p>
              Standard sky view (<span class="font-semibold text-[#e6edf3]">North up, East left</span>). Dashed circle is a <span class="font-semibold text-sky-400">1° Telrad-style target</span>. Stars colored by spectral class.
            </p>
          </div>
        </div>

      </div>
    </div>
  `;
}

function attachEventHandlers() {
  const selectCity = (el: HTMLElement) => {
    const place = el.getAttribute('data-place') || 'Custom Location';
    const lat = parseFloat(el.getAttribute('data-lat') || '0');
    const lon = parseFloat(el.getAttribute('data-lon') || '0');

    const loc: SavedLocation = { place, lat, lon };
    state.location = loc;
    saveLocation(loc);
    state.searchOpen = false;
    refreshAll();
  };

  // Open search modal
  document.getElementById('btnOpenSearch')?.addEventListener('click', () => {
    state.searchOpen = true;
    state.searchQuery = '';
    state.searchResults = [];
    state.searchLoading = false;
    render();
    setTimeout(() => {
      document.getElementById('inputCitySearch')?.focus();
    }, 50);
  });

  // Close search modal
  document.getElementById('btnCloseSearch')?.addEventListener('click', () => {
    state.searchOpen = false;
    render();
  });

  document.getElementById('searchModalOverlay')?.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).id === 'searchModalOverlay') {
      state.searchOpen = false;
      render();
    }
  });

  // Geolocate
  document.getElementById('btnGeolocate')?.addEventListener('click', () => {
    handleGeolocate();
  });

  // Refresh
  document.getElementById('btnRefresh')?.addEventListener('click', () => {
    refreshAll();
  });

  // Toggle Temperature Unit (°F / °C)
  document.getElementById('btnToggleUnit')?.addEventListener('click', () => {
    state.tempUnit = state.tempUnit === 'F' ? 'C' : 'F';
    saveTempUnit(state.tempUnit);
    render();
  });

  // Install PWA
  document.getElementById('btnInstallPwa')?.addEventListener('click', async () => {
    if (state.installPrompt) {
      state.installPrompt.prompt();
      const outcome = await state.installPrompt.userChoice;
      if (outcome.outcome === 'accepted') {
        state.installPrompt = null;
      }
      render();
    }
  });

  // City Search Input
  let debounceTimer: any = null;
  const inputSearch = document.getElementById('inputCitySearch') as HTMLInputElement | null;
  if (inputSearch) {
    inputSearch.addEventListener('input', (e) => {
      const val = (e.target as HTMLInputElement).value;
      state.searchQuery = val;
      clearTimeout(debounceTimer);
      const spinner = document.getElementById('searchLoadingSpinner');
      const resultsContainer = document.getElementById('searchResultsContainer');

      if (val.trim().length >= 2) {
        if (spinner) spinner.classList.remove('hidden');
        state.searchLoading = true;
        debounceTimer = setTimeout(async () => {
          const results = await searchCities(val);
          state.searchResults = results;
          state.searchLoading = false;
          if (spinner) spinner.classList.add('hidden');
          if (resultsContainer) {
            resultsContainer.innerHTML = renderSearchResultsList(results);
            resultsContainer.querySelectorAll<HTMLElement>('.btnSelectCity').forEach(btn => {
              btn.addEventListener('click', () => selectCity(btn));
            });
          }
        }, 350);
      } else {
        state.searchResults = [];
        state.searchLoading = false;
        if (spinner) spinner.classList.add('hidden');
        if (resultsContainer) {
          resultsContainer.innerHTML = '';
        }
      }
    });

    inputSearch.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const firstBtn = document.querySelector<HTMLElement>('#searchResultsContainer .btnSelectCity');
        if (firstBtn) {
          selectCity(firstBtn);
        }
      } else if (e.key === 'Escape') {
        state.searchOpen = false;
        render();
      }
    });
  }

  // City Result Selection for Recents & pre-existing buttons
  document.querySelectorAll<HTMLElement>('.btnSelectCity').forEach(btn => {
    btn.addEventListener('click', () => selectCity(btn));
  });

  // Planet Card Click -> 10° Starfield Modal
  document.querySelectorAll<HTMLElement>('.btnPlanetCard').forEach(btn => {
    btn.addEventListener('click', () => {
      const pKey = btn.getAttribute('data-planet');
      const p = state.planets.find(item => item.key === pKey);
      if (p) {
        state.selectedPlanet = p;
        render();
      }
    });

    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        btn.click();
      }
    });
  });

  // Close Planet Modal
  document.getElementById('btnClosePlanetModal')?.addEventListener('click', () => {
    state.selectedPlanet = null;
    render();
  });

  document.getElementById('planetModalOverlay')?.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).id === 'planetModalOverlay') {
      state.selectedPlanet = null;
      render();
    }
  });
}

// Global Keyboard & Window Listeners
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (state.selectedPlanet) {
      state.selectedPlanet = null;
      render();
    } else if (state.searchOpen) {
      state.searchOpen = false;
      render();
    }
  }
});

window.addEventListener('resize', () => {
  if (state.selectedPlanet) {
    drawPlanetStarfield();
  }
});

// ── App Startup ─────────────────────────────────────────────────────────────

refreshAll();
