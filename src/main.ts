import {
  calculateSunEvents,
  calculateMoonInfo,
  calculateAllPlanets,
  sunPosition,
  getMoonCoordinates,
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
  computeHorizonParams,
  angularSeparationDeg,
  getBodiesInField,
  OtherSolarBody,
  PLANET_COLORS,
  ProjectedStar,
  InFieldBody,
  SelectedStarfieldTarget,
  hitTestStarfield,
  bvToSpectralClass,
  StarfieldOrientation
} from './core/starfield.ts';

export const APP_VERSION = '1.0.14';

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
  starfieldOrientation: StarfieldOrientation;
  starfieldAperture: 'circular' | 'square';
  starfieldShowLabels: boolean;
  starfieldShowLines: boolean;
  starfieldFovDeg: number;
  starfieldTimeOffsetHours: number;
  starfieldSelectedTarget: SelectedStarfieldTarget | null;
  loading: boolean;
  error: string | null;
  searchOpen: boolean;
  searchQuery: string;
  searchResults: GeocodingResult[];
  searchLoading: boolean;
  installPrompt: any | null;
}

const initialLoc = loadLocation();
const state: AppState = {
  location: initialLoc,
  currentDate: new Date(),
  tempUnit: loadTempUnit(),
  forecast: null,
  sunEvents: null,
  moon: null,
  planets: [],
  selectedPlanet: null,
  starfieldOrientation: 'natural',
  starfieldAperture: 'circular',
  starfieldShowLabels: true,
  starfieldShowLines: false,
  starfieldFovDeg: 10,
  starfieldTimeOffsetHours: 0,
  starfieldSelectedTarget: null,
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

function getStarfieldEffectiveDate(): Date {
  if (state.starfieldTimeOffsetHours === 0) {
    return state.currentDate;
  }
  return new Date(state.currentDate.getTime() + state.starfieldTimeOffsetHours * 3600 * 1000);
}

function getOtherSolarBodies(excludePlanetKey: string, obsDate: Date = state.currentDate): OtherSolarBody[] {
  const otherPlanets: OtherSolarBody[] = state.planets
    .filter(p => p.key !== excludePlanetKey)
    .map(p => ({
      type: 'planet',
      key: p.key,
      name: p.name,
      symbol: p.symbol,
      ra: p.ra,
      dec: p.dec
    }));

  const moonCoords = getMoonCoordinates(obsDate);
  const moonBody: OtherSolarBody = {
    type: 'moon',
    key: 'moon',
    name: 'Moon',
    symbol: '🌙',
    ra: moonCoords.ra,
    dec: moonCoords.dec,
    phaseFraction: state.moon ? state.moon.illum / 100 : 0.5,
    phaseName: state.moon ? state.moon.name : 'Moon'
  };

  const sunCoords = sunPosition(obsDate);
  const sunBody: OtherSolarBody = {
    type: 'sun',
    key: 'sun',
    name: 'Sun',
    symbol: '☀️',
    ra: sunCoords.ra,
    dec: sunCoords.dec
  };

  return [...otherPlanets, moonBody, sunBody];
}

// Caches active projection geometry for sub-millisecond canvas hit-testing
let currentStarfieldResult: {
  stars: ProjectedStar[];
  inFieldBodies: InFieldBody[];
} | null = null;

function drawPlanetStarfield() {
  if (!state.selectedPlanet) return;
  const canvas = document.getElementById('planetStarfieldCanvas') as HTMLCanvasElement | null;
  if (!canvas) return;

  const effectiveDate = getStarfieldEffectiveDate();
  const otherBodies = getOtherSolarBodies(state.selectedPlanet.key, effectiveDate);

  const res = renderStarfield(canvas, state.selectedPlanet, {
    fovDeg: state.starfieldFovDeg,
    maxMag: 6.0,
    showLabels: state.starfieldShowLabels,
    showConstellationLines: state.starfieldShowLines,
    showReticle: true,
    showCompass: true,
    orientation: state.starfieldOrientation,
    observerLat: state.location.lat,
    observerLon: state.location.lon,
    currentDate: effectiveDate,
    renderHorizon: true,
    dimBelowHorizon: true,
    otherBodies,
    aperture: state.starfieldAperture,
    selectedTarget: state.starfieldSelectedTarget
  });

  currentStarfieldResult = {
    stars: res.stars,
    inFieldBodies: res.inFieldBodies
  };
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

  drawMoonCanvas();
  drawPlanetStarfield();
  attachEventHandlers();
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

  const effectiveDate = getStarfieldEffectiveDate();
  const hp = computeHorizonParams(
    state.location.lat,
    state.location.lon,
    effectiveDate,
    p.ra,
    p.dec
  );
  const planetAlt = hp.planetAltDeg;
  const isAboveHorizon = planetAlt >= 0;

  const otherBodies = getOtherSolarBodies(p.key, effectiveDate);
  const fovDeg = state.starfieldFovDeg;
  const bodiesInField = getBodiesInField(
    p.ra,
    p.dec,
    fovDeg,
    360,
    360,
    state.starfieldOrientation,
    otherBodies,
    { lat: state.location.lat, lon: state.location.lon, date: effectiveDate },
    state.starfieldAperture
  );

  const sunBody = otherBodies.find(b => b.type === 'sun');
  const sunSep = sunBody ? angularSeparationDeg(p.ra, p.dec, sunBody.ra, sunBody.dec) : 999;
  const sunInField = bodiesInField.some(b => b.type === 'sun');
  const sunNearField = !sunInField && sunSep < 30.0;

  const companionPlanets = bodiesInField.filter(b => b.type === 'planet');

  return `
    <div id="planetModalOverlay" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fade-in">
      <div class="planet-modal-content bg-[#161b22] border border-[#30363d] rounded-2xl w-full shadow-2xl flex flex-col overflow-hidden animate-scale-up">
        
        <!-- Header: Sticky / fixed at top -->
        <div class="flex items-center justify-between p-3.5 sm:p-4 border-b border-[#30363d] bg-black/25 shrink-0">
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
                <span class="px-2 py-0.5 rounded text-[11px] font-bold ${isAboveHorizon ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'}">
                  Alt: ${isAboveHorizon ? '+' : ''}${planetAlt.toFixed(1)}° · Facing ${hp.planetAzDeg.toFixed(0)}° ${hp.planetAzCompass} (${isAboveHorizon ? 'Above' : 'Below'})
                </span>
              </div>
              <p class="text-xs text-[#8b949e] mt-0.5">${state.starfieldAperture === 'circular' ? `${fovDeg}° Circular Eyepiece (${(fovDeg / 2).toFixed(1).replace(/\.0$/, '')}° Radius)` : `${fovDeg}° × ${fovDeg}° Sensor Frame`}</p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <!-- Constellation Stick Lines Toggle Button -->
            <button
              id="btnToggleConstellationLines"
              class="px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border ${state.starfieldShowLines ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 hover:bg-sky-500/30' : 'bg-white/5 text-[#8b949e] border-[#30363d] hover:text-[#e6edf3] hover:bg-white/10'}"
              title="Toggle zodiac constellation stick lines"
            >
              <span>${state.starfieldShowLines ? '✨ Lines' : '✨ Lines Off'}</span>
            </button>

            <!-- Star Names Toggle Button -->
            <button
              id="btnToggleStarLabels"
              class="px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border ${state.starfieldShowLabels ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30' : 'bg-white/5 text-[#8b949e] border-[#30363d] hover:text-[#e6edf3] hover:bg-white/10'}"
              title="Toggle star names and Bayer/Flamsteed designations in field of view"
            >
              <span>${state.starfieldShowLabels ? '🏷️ Names' : '🏷️ Off'}</span>
            </button>

            <!-- Aperture Toggle Button (Circular Eyepiece / Square Sensor) -->
            <button
              id="btnToggleAperture"
              class="px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border ${state.starfieldAperture === 'circular' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-500/30' : 'bg-white/5 text-[#8b949e] border-[#30363d] hover:text-[#e6edf3] hover:bg-white/10'}"
              title="Toggle field of view between circular eyepiece and square sensor frame"
            >
              <span>${state.starfieldAperture === 'circular' ? `◯ Eyepiece (${(fovDeg / 2).toFixed(1).replace(/\.0$/, '')}° r)` : `▢ Sensor (${fovDeg}°)`}</span>
            </button>

            <!-- Orientation Toggle Button (Natural / North-Up / South-Up) -->
            <button
              id="btnToggleOrientation"
              class="px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border ${
                state.starfieldOrientation === 'natural'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                  : state.starfieldOrientation === 'southUp'
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 hover:bg-sky-500/30'
                  : 'bg-white/5 text-[#8b949e] border-[#30363d] hover:text-[#e6edf3] hover:bg-white/10'
              }"
              title="Click to cycle orientation: Natural (Zenith Up / Level Horizon) → North Up → South Up"
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="9"/>
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v4m0 10v4m-9-9h4m10 0h4"/>
              </svg>
              <span>${
                state.starfieldOrientation === 'natural'
                  ? '👁️ Natural'
                  : state.starfieldOrientation === 'southUp'
                  ? '🧭 South Up'
                  : '🧭 North Up'
              }</span>
            </button>

            <button id="btnClosePlanetModal" class="p-1.5 rounded-lg text-[#8b949e] hover:text-white hover:bg-white/10 transition cursor-pointer" aria-label="Close starfield modal">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
        </div>

        <!-- Scrollable Modal Body: Unified scroll, zero overlap -->
        <div class="planet-modal-body p-3 sm:p-4">
          <div class="planet-modal-grid">

            <!-- 1. Info Area: Celestial Alerts, Coordinates & Telemetry Chip Bar, Time Toolbar -->
            <div class="planet-area-info flex flex-col gap-2.5">
              <!-- Conjunction & In-Field Celestial Bodies Ribbon -->
              ${bodiesInField.length > 0 ? `
                <div class="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-950/80 via-purple-950/60 to-indigo-950/80 border border-indigo-500/30 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-sm">✨</span>
                    <span class="font-bold text-indigo-200">In Field:</span>
                    ${bodiesInField.map(b => `
                      <span class="px-2 py-0.5 rounded-lg bg-indigo-500/25 text-indigo-100 border border-indigo-500/40 flex items-center gap-1 font-semibold">
                        <span>${b.symbol}</span>
                        <span>${b.name}</span>
                        <span class="text-sky-300 font-mono text-[11px] font-normal">(${b.separationDeg.toFixed(1)}° away)</span>
                      </span>
                    `).join('')}
                  </div>

                  <!-- Quick switch button if another planet is in the field -->
                  ${companionPlanets.length > 0 ? `
                    <div class="flex items-center gap-1.5 flex-wrap">
                      ${companionPlanets.map(b => `
                        <button
                          type="button"
                          class="btnCenterOtherPlanet px-2.5 py-1 rounded-lg bg-indigo-500/30 hover:bg-indigo-500/50 border border-indigo-400/50 text-xs font-semibold text-white transition cursor-pointer flex items-center gap-1"
                          data-planet="${b.key}"
                          title="Center starfield on ${b.name}"
                        >
                          <span>Center on ${b.name}</span>
                          <span>➔</span>
                        </button>
                      `).join('')}
                    </div>
                  ` : ''}
                </div>
              ` : ''}

              <!-- Solar Proximity / Hazard Warning Banner -->
              ${sunInField ? `
                <div class="px-3.5 py-2 rounded-xl bg-rose-950/90 border border-rose-500/50 flex items-center gap-2.5 text-xs text-rose-200">
                  <span class="text-lg">⚠️</span>
                  <div>
                    <span class="font-bold text-rose-300 uppercase tracking-wide">Solar Hazard Warning:</span>
                    <span>The Sun is only <strong class="text-white">${sunSep.toFixed(1)}°</strong> from ${p.name}! NEVER view through binoculars or telescopes without certified solar filters.</span>
                  </div>
                </div>
              ` : sunNearField ? `
                <div class="px-3.5 py-1.5 rounded-xl bg-amber-950/70 border border-amber-500/40 flex items-center gap-2 text-xs text-amber-200">
                  <span>☀️</span>
                  <span>Sun is <strong>${sunSep.toFixed(1)}°</strong> away (${sunSep > fovDeg / 2 ? `outside ${(fovDeg / 2).toFixed(0)}° radius · zoom out to 45° to view` : 'near field edge'}). Exercise caution observing near sunrise or sunset.</span>
                </div>
              ` : ''}

              <!-- Coordinates & Telemetry Chip Bar -->
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 bg-black/30 rounded-xl border border-[#30363d]/60 text-xs">
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
                  <span class="text-[10px] uppercase font-bold text-[#8b949e] block">Local Horizon</span>
                  <span class="font-bold ${isAboveHorizon ? 'text-emerald-400' : 'text-rose-400'} text-sm">${isAboveHorizon ? '+' : ''}${planetAlt.toFixed(1)}° Alt</span>
                  <span class="text-[10px] text-sky-300 block font-mono font-medium">Facing ${hp.planetAzDeg.toFixed(0)}° ${hp.planetAzCompass}</span>
                </div>
                <div class="p-2 rounded-xl bg-white/[0.02] border border-[#30363d]/40">
                  <span class="text-[10px] uppercase font-bold text-[#8b949e] block">Field of View</span>
                  <span class="font-bold text-amber-300 text-sm">${state.starfieldAperture === 'circular' ? `${fovDeg}° ◯ (${(fovDeg / 2).toFixed(1).replace(/\.0$/, '')}° r)` : `${fovDeg}° ▢ Sensor`}</span>
                  <span class="text-[10px] text-[#8b949e] block">${state.starfieldAperture === 'circular' ? 'Eyepiece (Mag ≤ 6.0)' : 'Sensor (Mag ≤ 6.0)'}</span>
                </div>
              </div>

              <!-- Observation Time Scrubbing Toolbar -->
              <div class="px-3.5 py-2 bg-[#0d1117] rounded-xl border border-[#30363d]/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div class="flex items-center gap-2">
                  <span class="text-[11px] font-bold text-[#8b949e] uppercase tracking-wider flex items-center gap-1">
                    <span>🕒</span>
                    <span>Time:</span>
                  </span>
                  <span class="font-mono font-semibold text-xs ${state.starfieldTimeOffsetHours === 0 ? 'text-[#e6edf3]' : 'text-amber-300'}">
                    ${formatTime(effectiveDate)}
                    ${state.starfieldTimeOffsetHours !== 0
                      ? `<span class="text-[11px] font-normal text-amber-400 font-sans ml-1">(${state.starfieldTimeOffsetHours > 0 ? '+' : ''}${state.starfieldTimeOffsetHours.toFixed(1).replace(/\.0$/, '')}h)</span>`
                      : '<span class="text-[11px] font-normal text-emerald-400 font-sans ml-1">(Live)</span>'
                    }
                  </span>
                  ${state.starfieldTimeOffsetHours !== 0 ? `
                    <button id="btnTimeResetNow" class="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition cursor-pointer" title="Reset to live current time">
                      Reset to Now
                    </button>
                  ` : ''}
                </div>

                <!-- Quick Time Presets & Steppers -->
                <div class="flex items-center gap-1 flex-wrap">
                  <button id="btnTimeStepBack" class="w-6 h-6 flex items-center justify-center rounded-lg bg-white/5 border border-[#30363d] text-[#e6edf3] hover:bg-white/10 active:scale-95 transition cursor-pointer text-xs font-bold" title="Step back 1 hour">◀</button>
                  
                  <button class="btnTimePreset px-2 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${state.starfieldTimeOffsetHours === 0 ? 'bg-emerald-500/25 text-emerald-200 border-emerald-500/40' : 'bg-white/[0.03] text-[#8b949e] border-[#30363d]/70 hover:text-white hover:bg-white/10'}" data-time-preset="now">Now</button>
                  
                  <button class="btnTimePreset px-2 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer bg-white/[0.03] text-[#8b949e] border-[#30363d]/70 hover:text-white hover:bg-white/10" data-time-preset="dusk" title="End of evening twilight (Astro Dusk tonight)">Dusk</button>
                  
                  <button class="btnTimePreset px-2 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer bg-white/[0.03] text-[#8b949e] border-[#30363d]/70 hover:text-white hover:bg-white/10" data-time-preset="10pm" title="10:00 PM local evening observing">10 PM</button>
                  
                  <button class="btnTimePreset px-2 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer bg-white/[0.03] text-[#8b949e] border-[#30363d]/70 hover:text-white hover:bg-white/10" data-time-preset="2am" title="2:00 AM local night observing">2 AM</button>
                  
                  <button class="btnTimePreset px-2 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer bg-white/[0.03] text-[#8b949e] border-[#30363d]/70 hover:text-white hover:bg-white/10" data-time-preset="dawn" title="Morning twilight (Astro Dawn)">Dawn</button>
                  
                  <button id="btnTimeStepForward" class="w-6 h-6 flex items-center justify-center rounded-lg bg-white/5 border border-[#30363d] text-[#e6edf3] hover:bg-white/10 active:scale-95 transition cursor-pointer text-xs font-bold" title="Step forward 1 hour">▶</button>
                </div>
              </div>
            </div>

            <!-- 2. Canvas Area: Starfield Eyepiece & Optical Controls -->
            <div class="planet-area-canvas flex flex-col items-center">
              <div class="planet-area-canvas-box relative w-full aspect-square">
                <canvas
                  id="planetStarfieldCanvas"
                  class="w-full h-full rounded-2xl border border-[#30363d] shadow-2xl block bg-[#020408] cursor-crosshair"
                ></canvas>
              </div>

              <!-- Zoom In / Out Controls & FOV Presets -->
              <div class="mt-2.5 flex items-center justify-between w-full max-w-[360px] px-1 text-xs gap-2">
                <div class="flex items-center gap-1.5">
                  <span class="text-[11px] font-bold text-[#8b949e] uppercase tracking-wider">FOV:</span>
                  <div class="flex items-center bg-white/5 border border-[#30363d] rounded-xl p-0.5">
                    <button
                      id="btnZoomOut"
                      type="button"
                      class="w-7 h-7 flex items-center justify-center rounded-lg text-sm font-bold text-[#e6edf3] hover:bg-white/10 active:scale-95 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                      ${state.starfieldFovDeg >= 45 ? 'disabled' : ''}
                      title="Zoom Out (Wider Field of View)"
                    >
                      −
                    </button>
                    <span class="px-2 font-mono font-bold text-sky-300 text-xs">${state.starfieldFovDeg}°</span>
                    <button
                      id="btnZoomIn"
                      type="button"
                      class="w-7 h-7 flex items-center justify-center rounded-lg text-sm font-bold text-[#e6edf3] hover:bg-white/10 active:scale-95 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                      ${state.starfieldFovDeg <= 5 ? 'disabled' : ''}
                      title="Zoom In (Narrower Field of View)"
                    >
                      +
                    </button>
                  </div>
                </div>

                <!-- Quick FOV Presets with Optical Instrument Tooltips -->
                <div class="flex items-center gap-1 flex-wrap justify-end">
                  ${[
                    { deg: 5, label: '5°', title: '5° Finder / 10×50 Binoculars' },
                    { deg: 10, label: '10°', title: '10° 7×50 Binoculars' },
                    { deg: 20, label: '20°', title: '20° Wide Finder / Telrad' },
                    { deg: 30, label: '30°', title: '30° Sky Scan' },
                    { deg: 45, label: '45°', title: '45° Naked Eye View' }
                  ].map(opt => `
                    <button
                      type="button"
                      class="btnFovPreset px-2 py-1 rounded-lg text-xs font-semibold transition cursor-pointer border ${state.starfieldFovDeg === opt.deg ? 'bg-sky-500/25 text-sky-200 border-sky-500/40' : 'bg-white/[0.03] text-[#8b949e] border-[#30363d]/70 hover:text-white hover:bg-white/10'}"
                      data-fov="${opt.deg}"
                      title="${opt.title}"
                    >
                      ${opt.label}
                    </button>
                  `).join('')}
                </div>
              </div>

              <!-- Active Optical Profile & Tap hint -->
              <div class="w-full max-w-[360px] px-1 mt-1 text-[11px] text-[#8b949e] flex items-center justify-between">
                <span class="text-sky-300/80 font-mono">
                  ${state.starfieldFovDeg === 5 ? '🔭 5° Finder / 10×50' :
                    state.starfieldFovDeg === 10 ? '🔭 10° 7×50 Binoculars' :
                    state.starfieldFovDeg === 20 ? '🔭 20° Wide Finder / Telrad' :
                    state.starfieldFovDeg === 30 ? '🔭 30° Wide Sky Scan' :
                    '👀 45° Naked Eye Central View'}
                </span>
                <span class="text-[10px] text-[#8b949e]">Tap any star to inspect & measure</span>
              </div>
            </div>

            <!-- 3. Details Area: Target Inspector Card & Guidance Caption -->
            <div class="planet-area-details flex flex-col gap-2.5">
              <!-- Unified Target Inspector & Celestial Ruler Card -->
              ${state.starfieldSelectedTarget ? `
                <div class="p-3 rounded-2xl bg-gradient-to-br from-[#1c2433] to-[#121822] border border-sky-500/40 shadow-xl flex flex-col gap-2.5 animate-fade-in text-xs">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span class="text-base">${state.starfieldSelectedTarget.type === 'star' ? '⭐' : state.starfieldSelectedTarget.type === 'planet' ? '🪐' : state.starfieldSelectedTarget.type === 'moon' ? '🌙' : '☀️'}</span>
                      <div>
                        <h4 class="font-bold text-[#e6edf3] text-sm leading-tight">${state.starfieldSelectedTarget.name}</h4>
                        <span class="text-[10px] text-sky-400 font-mono">Celestial Ruler Active</span>
                      </div>
                    </div>
                    <button id="btnDeselectTarget" class="p-1 rounded-lg text-[#8b949e] hover:text-white hover:bg-white/10 transition cursor-pointer" title="Dismiss selection and ruler">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                  </div>

                  <div class="grid grid-cols-2 gap-2 text-xs">
                    <div class="p-2 rounded-xl bg-black/40 border border-white/5">
                      <span class="text-[10px] uppercase font-bold text-[#8b949e] block">Angular Separation</span>
                      <span class="font-bold text-sky-300 text-sm font-mono">
                        ${state.starfieldSelectedTarget.separationDeg < 1.0
                          ? `${(state.starfieldSelectedTarget.separationDeg * 60).toFixed(1)}' (${(state.starfieldSelectedTarget.separationDeg * 3600).toFixed(0)}")`
                          : `${state.starfieldSelectedTarget.separationDeg.toFixed(2)}°`
                        }
                      </span>
                      <span class="text-[10px] text-[#8b949e] block">from ${p.name} center</span>
                    </div>

                    <div class="p-2 rounded-xl bg-black/40 border border-white/5">
                      <span class="text-[10px] uppercase font-bold text-[#8b949e] block">Bearing / Position Angle</span>
                      <span class="font-bold text-sky-300 text-sm font-mono">
                        ${state.starfieldSelectedTarget.bearingDeg.toFixed(0)}° (${state.starfieldSelectedTarget.bearingCompass})
                      </span>
                      <span class="text-[10px] text-[#8b949e] block">from North through East</span>
                    </div>

                    <div class="p-2 rounded-xl bg-black/40 border border-white/5">
                      <span class="text-[10px] uppercase font-bold text-[#8b949e] block">Apparent Magnitude</span>
                      <span class="font-bold text-[#e6edf3] text-sm font-mono">
                        ${state.starfieldSelectedTarget.mag !== undefined
                          ? `${state.starfieldSelectedTarget.mag >= 0 ? '+' : ''}${state.starfieldSelectedTarget.mag.toFixed(2)}`
                          : '—'
                        }
                      </span>
                      <span class="text-[10px] text-[#8b949e] block">${state.starfieldSelectedTarget.mag !== undefined && state.starfieldSelectedTarget.mag <= 3 ? 'Bright Naked-Eye' : state.starfieldSelectedTarget.mag !== undefined && state.starfieldSelectedTarget.mag <= 6 ? 'Faint / Binocular' : 'Solar System'}</span>
                    </div>

                    <div class="p-2 rounded-xl bg-black/40 border border-white/5">
                      <span class="text-[10px] uppercase font-bold text-[#8b949e] block">Classification / Color</span>
                      ${state.starfieldSelectedTarget.bv !== undefined ? `
                        <div class="flex items-center gap-1.5 mt-0.5">
                          <span class="w-2.5 h-2.5 rounded-full inline-block shrink-0 shadow-sm" style="background-color: ${bvToSpectralClass(state.starfieldSelectedTarget.bv).color}"></span>
                          <span class="font-bold text-[#e6edf3] text-xs">${bvToSpectralClass(state.starfieldSelectedTarget.bv).type}</span>
                        </div>
                        <span class="text-[10px] text-[#8b949e] block truncate">${bvToSpectralClass(state.starfieldSelectedTarget.bv).desc}</span>
                      ` : `
                        <span class="font-bold text-[#e6edf3] text-xs capitalize">${state.starfieldSelectedTarget.type}</span>
                        <span class="text-[10px] text-[#8b949e] block">Solar System Body</span>
                      `}
                    </div>
                  </div>

                  ${state.starfieldSelectedTarget.alt !== undefined && state.starfieldSelectedTarget.az !== undefined ? `
                    <div class="px-2.5 py-1.5 rounded-xl bg-black/40 border border-sky-500/20 flex items-center justify-between text-xs font-mono">
                      <span class="text-[#8b949e] font-sans text-[11px] flex items-center gap-1">
                        <span>🧭</span>
                        <span>Local Horizon:</span>
                      </span>
                      <span class="${state.starfieldSelectedTarget.alt >= 0 ? 'text-emerald-400' : 'text-rose-400'} font-bold">
                        Alt ${state.starfieldSelectedTarget.alt >= 0 ? '+' : ''}${state.starfieldSelectedTarget.alt.toFixed(1)}°
                      </span>
                      <span class="text-sky-300 font-bold">
                        Facing ${state.starfieldSelectedTarget.az.toFixed(0)}° ${state.starfieldSelectedTarget.azCompass}
                      </span>
                    </div>
                  ` : ''}
                </div>
              ` : ''}

              <!-- Guide / Caption -->
              <div class="text-center text-xs text-[#8b949e] px-1">
                <p>
                  ${state.starfieldOrientation === 'natural'
                    ? 'Natural eye view (<span class="font-semibold text-emerald-300">Zenith is UP</span> · Horizon is horizontal). '
                    : state.starfieldOrientation === 'southUp'
                    ? 'Southern sky view (<span class="font-semibold text-sky-300">South up, West left</span> · Inverted). '
                    : 'Standard sky view (<span class="font-semibold text-[#e6edf3]">North up, East left</span>). '
                  }
                  Green line marks the <span class="font-semibold text-emerald-400">local horizon</span>.
                  Dashed circle is a <span class="font-semibold text-sky-400">1° Telrad target</span>.
                  ${state.starfieldAperture === 'circular'
                    ? `Showing <span class="font-semibold text-indigo-300">${fovDeg}° circular eyepiece</span> (${(fovDeg / 2).toFixed(1).replace(/\.0$/, '')}° radius).`
                    : `Showing <span class="font-semibold text-indigo-300">${fovDeg}°×${fovDeg}° sensor frame</span>.`
                  }
                  ${bodiesInField.length > 0
                    ? `<span class="block mt-1 font-semibold text-indigo-300">In field: ${bodiesInField.map(b => `${b.symbol} ${b.name}`).join(', ')}</span>`
                    : ''
                  }
                  ${!isAboveHorizon
                    ? `<span class="block mt-1.5 text-amber-300/90 font-medium">🌍 Target is currently ${Math.abs(planetAlt).toFixed(0)}° below the local horizon (${p.status}). Previewing night sky through the Earth. Use the time scrubber above to preview when it rises tonight.</span>`
                    : ''
                  }
                </p>
              </div>
            </div>

          </div>
        </div>

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
        state.starfieldTimeOffsetHours = 0;
        state.starfieldSelectedTarget = null;
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

  // Quick re-center on companion planet in conjunction
  document.querySelectorAll<HTMLElement>('.btnCenterOtherPlanet').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-planet');
      const target = state.planets.find(item => item.key === key);
      if (target) {
        state.selectedPlanet = target;
        state.starfieldSelectedTarget = null;
        render();
      }
    });
  });

  // Toggle Constellation Stick Lines
  document.getElementById('btnToggleConstellationLines')?.addEventListener('click', () => {
    state.starfieldShowLines = !state.starfieldShowLines;
    render();
  });

  // Toggle Star Names / Labels
  document.getElementById('btnToggleStarLabels')?.addEventListener('click', () => {
    state.starfieldShowLabels = !state.starfieldShowLabels;
    render();
  });

  // Canvas Tap / Click -> Tap-to-Inspect & Celestial Ruler
  const starfieldCanvas = document.getElementById('planetStarfieldCanvas') as HTMLCanvasElement | null;
  if (starfieldCanvas && state.selectedPlanet) {
    starfieldCanvas.addEventListener('click', (e) => {
      if (!currentStarfieldResult || !state.selectedPlanet) return;
      const rect = starfieldCanvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      const hit = hitTestStarfield(
        clickX,
        clickY,
        currentStarfieldResult.stars,
        currentStarfieldResult.inFieldBodies,
        state.selectedPlanet
      );

      if (hit) {
        state.starfieldSelectedTarget = hit;
        render();
      } else {
        if (state.starfieldSelectedTarget) {
          state.starfieldSelectedTarget = null;
          render();
        }
      }
    });
  }

  // Deselect target / dismiss ruler
  document.getElementById('btnDeselectTarget')?.addEventListener('click', () => {
    state.starfieldSelectedTarget = null;
    render();
  });

  // Observation Time Scrubbing Controls
  document.getElementById('btnTimeResetNow')?.addEventListener('click', () => {
    state.starfieldTimeOffsetHours = 0;
    render();
  });

  document.getElementById('btnTimeStepBack')?.addEventListener('click', () => {
    state.starfieldTimeOffsetHours -= 1;
    render();
  });

  document.getElementById('btnTimeStepForward')?.addEventListener('click', () => {
    state.starfieldTimeOffsetHours += 1;
    render();
  });

  document.querySelectorAll<HTMLElement>('.btnTimePreset').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = btn.getAttribute('data-time-preset');
      if (preset === 'now') {
        state.starfieldTimeOffsetHours = 0;
      } else if (preset === 'dusk') {
        if (state.sunEvents?.astroDusk) {
          const diffH = (state.sunEvents.astroDusk.getTime() - state.currentDate.getTime()) / 3600000;
          state.starfieldTimeOffsetHours = Math.round(diffH * 10) / 10;
        } else {
          state.starfieldTimeOffsetHours = 6;
        }
      } else if (preset === '10pm') {
        const target = new Date(state.currentDate);
        target.setHours(22, 0, 0, 0);
        let diffH = (target.getTime() - state.currentDate.getTime()) / 3600000;
        if (diffH < -3) diffH += 24;
        state.starfieldTimeOffsetHours = Math.round(diffH * 10) / 10;
      } else if (preset === '2am') {
        const target = new Date(state.currentDate);
        target.setHours(2, 0, 0, 0);
        let diffH = (target.getTime() - state.currentDate.getTime()) / 3600000;
        if (diffH < 0) diffH += 24;
        state.starfieldTimeOffsetHours = Math.round(diffH * 10) / 10;
      } else if (preset === 'dawn') {
        if (state.sunEvents?.astroDawn) {
          const diffH = (state.sunEvents.astroDawn.getTime() - state.currentDate.getTime()) / 3600000;
          state.starfieldTimeOffsetHours = Math.round(diffH * 10) / 10;
        } else {
          state.starfieldTimeOffsetHours = 12;
        }
      }
      render();
    });
  });

  // Zoom In / Out & FOV Presets
  const FOV_STEPS = [5, 10, 20, 30, 45];

  document.getElementById('btnZoomOut')?.addEventListener('click', () => {
    const idx = FOV_STEPS.indexOf(state.starfieldFovDeg);
    if (idx !== -1 && idx < FOV_STEPS.length - 1) {
      state.starfieldFovDeg = FOV_STEPS[idx + 1];
    } else if (idx === -1) {
      const next = FOV_STEPS.find(s => s > state.starfieldFovDeg);
      state.starfieldFovDeg = next ?? 45;
    }
    render();
  });

  document.getElementById('btnZoomIn')?.addEventListener('click', () => {
    const idx = FOV_STEPS.indexOf(state.starfieldFovDeg);
    if (idx !== -1 && idx > 0) {
      state.starfieldFovDeg = FOV_STEPS[idx - 1];
    } else if (idx === -1) {
      const prev = [...FOV_STEPS].reverse().find(s => s < state.starfieldFovDeg);
      state.starfieldFovDeg = prev ?? 5;
    }
    render();
  });

  document.querySelectorAll<HTMLElement>('.btnFovPreset').forEach(btn => {
    btn.addEventListener('click', () => {
      const fov = parseFloat(btn.getAttribute('data-fov') || '10');
      if (!isNaN(fov)) {
        state.starfieldFovDeg = fov;
        render();
      }
    });
  });

  // Wheel zoom on canvas
  const canvasEl = document.getElementById('planetStarfieldCanvas');
  if (canvasEl) {
    canvasEl.addEventListener('wheel', (e) => {
      e.preventDefault();
      const idx = FOV_STEPS.indexOf(state.starfieldFovDeg);
      if (e.deltaY > 0) {
        if (idx !== -1 && idx < FOV_STEPS.length - 1) {
          state.starfieldFovDeg = FOV_STEPS[idx + 1];
          render();
        }
      } else if (e.deltaY < 0) {
        if (idx !== -1 && idx > 0) {
          state.starfieldFovDeg = FOV_STEPS[idx - 1];
          render();
        }
      }
    }, { passive: false });
  }

  // Toggle Aperture (Circular Eyepiece vs Square Sensor Frame)
  document.getElementById('btnToggleAperture')?.addEventListener('click', () => {
    state.starfieldAperture = state.starfieldAperture === 'circular' ? 'square' : 'circular';
    render();
  });

  // Toggle Starfield Orientation (Natural -> North-Up -> South-Up)
  document.getElementById('btnToggleOrientation')?.addEventListener('click', () => {
    if (state.starfieldOrientation === 'natural') {
      state.starfieldOrientation = 'northUp';
    } else if (state.starfieldOrientation === 'northUp') {
      state.starfieldOrientation = 'southUp';
    } else {
      state.starfieldOrientation = 'natural';
    }
    render();
  });

  // Close Planet Modal
  const closePlanetModal = () => {
    state.selectedPlanet = null;
    state.starfieldSelectedTarget = null;
    state.starfieldTimeOffsetHours = 0;
    render();
  };

  document.getElementById('btnClosePlanetModal')?.addEventListener('click', closePlanetModal);

  document.getElementById('planetModalOverlay')?.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).id === 'planetModalOverlay') {
      closePlanetModal();
    }
  });
}

// Global Keyboard & Window Listeners
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (state.selectedPlanet) {
      state.selectedPlanet = null;
      state.starfieldSelectedTarget = null;
      state.starfieldTimeOffsetHours = 0;
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
