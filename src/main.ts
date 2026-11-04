import {
  calculateSunEvents,
  calculateMoonInfo,
  calculateAllPlanets,
  calculateMoonPlanetInfo,
  calculateSunPlanetInfo,
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

import {
  t,
  getLocale,
  setLocale,
  SUPPORTED_LOCALES,
  onLocaleChange,
  formatLocalizedDate,
  Locale
} from './core/i18n.ts';

export const APP_VERSION = '1.0.18';

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
  starfieldTimeAnchorHours: number;
  starfieldSelectedTarget: SelectedStarfieldTarget | null;
  loading: boolean;
  error: string | null;
  searchOpen: boolean;
  searchQuery: string;
  searchResults: GeocodingResult[];
  searchLoading: boolean;
  installPrompt: any | null;
  tourModalOpen: boolean;
  tourSlideIndex: number;
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
  starfieldTimeAnchorHours: 0,
  starfieldSelectedTarget: null,
  loading: false,
  error: null,
  searchOpen: false,
  searchQuery: '',
  searchResults: [],
  searchLoading: false,
  installPrompt: null,
  tourModalOpen: false,
  tourSlideIndex: 0
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

function getTargetEffectiveCoordinates(p: PlanetInfo, obsDate: Date): { ra: number; dec: number } {
  if (p.key === 'moon') {
    return getMoonCoordinates(obsDate);
  }
  if (p.key === 'sun') {
    return sunPosition(obsDate);
  }
  return { ra: p.ra, dec: p.dec };
}

function getAllSolarTargets(st: AppState): PlanetInfo[] {
  const moonObj = calculateMoonPlanetInfo(st.currentDate, st.location.lat, st.location.lon, st.moon);
  const sunObj = calculateSunPlanetInfo(st.currentDate, st.location.lat, st.location.lon, st.sunEvents);
  return [moonObj, ...st.planets, sunObj];
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

  const bodies: OtherSolarBody[] = [...otherPlanets];

  if (excludePlanetKey !== 'moon') {
    const moonCoords = getMoonCoordinates(obsDate);
    bodies.push({
      type: 'moon',
      key: 'moon',
      name: 'Moon',
      symbol: '🌙',
      ra: moonCoords.ra,
      dec: moonCoords.dec,
      phaseFraction: state.moon ? state.moon.illum / 100 : 0.5,
      phaseName: state.moon ? state.moon.name : 'Moon'
    });
  }

  if (excludePlanetKey !== 'sun') {
    const sunCoords = sunPosition(obsDate);
    bodies.push({
      type: 'sun',
      key: 'sun',
      name: 'Sun',
      symbol: '☀️',
      ra: sunCoords.ra,
      dec: sunCoords.dec
    });
  }

  return bodies;
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
  const coords = getTargetEffectiveCoordinates(state.selectedPlanet, effectiveDate);
  const activePlanet = {
    ...state.selectedPlanet,
    ra: coords.ra,
    dec: coords.dec
  };
  const otherBodies = getOtherSolarBodies(state.selectedPlanet.key, effectiveDate);

  const res = renderStarfield(canvas, activePlanet, {
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

function updateStarfieldLiveScrub() {
  if (!state.selectedPlanet) return;
  const p = state.selectedPlanet;

  const effectiveDate = getStarfieldEffectiveDate();
  const coords = getTargetEffectiveCoordinates(p, effectiveDate);
  const hp = computeHorizonParams(
    state.location.lat,
    state.location.lon,
    effectiveDate,
    coords.ra,
    coords.dec
  );
  const planetAlt = hp.planetAltDeg;
  const isAboveHorizon = planetAlt >= 0;

  // 1. Redraw starfield canvas at 60fps
  drawPlanetStarfield();

  // 2. Update time readout display
  const timeDisplay = document.getElementById('starfieldTimeDisplay');
  if (timeDisplay) {
    const isLive = state.starfieldTimeOffsetHours === 0;
    timeDisplay.className = `font-mono font-semibold text-xs ${isLive ? 'text-[#e6edf3]' : 'text-amber-300'}`;
    const offsetStr = isLive
      ? '<span class="text-[11px] font-normal text-emerald-400 font-sans ml-1">(Live)</span>'
      : `<span class="text-[11px] font-normal text-amber-400 font-sans ml-1">(${state.starfieldTimeOffsetHours > 0 ? '+' : ''}${state.starfieldTimeOffsetHours.toFixed(1).replace(/\.0$/, '')}h)</span>`;
    timeDisplay.innerHTML = `${formatTime(effectiveDate)} ${offsetStr}`;
  }

  // 3. Update header altitude badge
  const headerBadge = document.getElementById('modalPlanetAltBadge');
  if (headerBadge) {
    headerBadge.className = `px-2 py-0.5 rounded text-[11px] font-bold ${isAboveHorizon ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'}`;
    headerBadge.textContent = `Alt: ${isAboveHorizon ? '+' : ''}${planetAlt.toFixed(1)}° · Facing ${hp.planetAzDeg.toFixed(0)}° ${hp.planetAzCompass} (${isAboveHorizon ? 'Above' : 'Below'})`;
  }

  // 4. Update Local Horizon telemetry chip
  const chipAlt = document.getElementById('chipPlanetAlt');
  if (chipAlt) {
    chipAlt.className = `font-bold ${isAboveHorizon ? 'text-emerald-400' : 'text-rose-400'} text-sm`;
    chipAlt.textContent = `${isAboveHorizon ? '+' : ''}${planetAlt.toFixed(1)}° Alt`;
  }
  const chipAz = document.getElementById('chipPlanetAz');
  if (chipAz) {
    chipAz.textContent = `Facing ${hp.planetAzDeg.toFixed(0)}° ${hp.planetAzCompass}`;
  }

  // 5. Update Reset to Now button visibility
  const resetBtn = document.getElementById('btnTimeResetNow');
  if (resetBtn) {
    if (state.starfieldTimeOffsetHours === 0) {
      resetBtn.classList.add('hidden');
    } else {
      resetBtn.classList.remove('hidden');
    }
  }
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

// ── Localization Helpers ───────────────────────────────────────────────────

function getLocalizedVerdict(v?: string): string {
  if (!v) return t('verdict.clear');
  if (v.startsWith('Clear')) return t('verdict.clear');
  if (v.startsWith('Partly')) return t('verdict.partly_cloudy');
  if (v.startsWith('Mostly')) return t('verdict.mostly_cloudy');
  if (v.startsWith('Overcast')) return t('verdict.overcast');
  return v;
}

function getLocalizedDewRisk(f?: ObservingForecast | null): string {
  if (!f) return t('weather.dew_low');
  if (f.dewRisk === 'high') {
    return f.minTempC <= 0 ? t('weather.dew_frost') : t('weather.dew_high');
  }
  if (f.dewRisk === 'moderate') {
    return t('weather.dew_moderate');
  }
  return t('weather.dew_low');
}

function getLocalizedMoonPhase(name?: string): string {
  if (!name) return t('moon.phase.waxing_crescent');
  const key = 'moon.phase.' + name.toLowerCase().replace(/ /g, '_');
  return t(key);
}

function getLocalizedMoonDirection(dir?: string): string {
  return dir === 'Waning' ? t('moon.waning') : t('moon.waxing');
}

function formatLocalizedPlanetStatus(p: PlanetInfo): string {
  if (p.key === 'sun') {
    return t('planets.daylight_solar');
  }
  if (p.key === 'moon') {
    if (state.moon) {
      const phaseKey = 'moon.phase.' + state.moon.name.toLowerCase().replace(/ /g, '_');
      return `${t(phaseKey)} · ${t('moon.lit', { pct: state.moon.illum })}`;
    }
  }
  if (p.status === 'Up all night') return t('planets.up_all_night');
  if (p.status === 'Below horizon') return t('planets.below_horizon');
  if (p.status === 'Circumpolar') return t('planets.circumpolar');
  if (p.status.startsWith('Evening · sets ')) {
    return t('planets.evening_sets', { time: p.set ? formatTime(p.set) : '' });
  }
  if (p.status.startsWith('Morning · rises ')) {
    return t('planets.morning_rises', { time: p.rise ? formatTime(p.rise) : '' });
  }
  if (p.status.startsWith('Sets ')) {
    return t('planets.sets_at', { time: p.set ? formatTime(p.set) : '' });
  }
  return p.status;
}

function getLocalizedObservingDate(f?: ObservingForecast | null): string {
  if (!f) return '';
  const now = state.currentDate;
  const dayFmt = formatLocalizedDate(now);
  if (f.observingDateLabel.startsWith('Tonight')) {
    return t('verdict.tonight', { date: dayFmt });
  }
  return dayFmt;
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
    <header class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 border-b border-[#30363d]">
      <!-- Brand & Tagline -->
      <div class="flex items-center gap-3 shrink-0">
        <img src="./icon.svg" alt="SkyOracle Logo" class="w-10 h-10 rounded-xl shadow-lg border border-[#30363d] shrink-0" />
        <div class="min-w-0">
          <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-[#e6edf3] flex items-center gap-2">
            SkyOracle
            <a
              href="./releases.html"
              target="_blank"
              rel="noopener noreferrer"
              title="View release notes & changelog"
              class="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#58a6ff]/15 hover:bg-[#58a6ff]/25 text-[#58a6ff] hover:text-white border border-[#58a6ff]/30 hover:border-[#58a6ff]/60 font-mono transition cursor-pointer inline-flex items-center gap-1"
            >
              v${APP_VERSION}
            </a>
          </h1>
          <p class="text-xs text-[#8b949e] truncate max-w-[240px] sm:max-w-[280px] md:max-w-[340px]">${t('app.tagline')}</p>
        </div>
      </div>

      <!-- Controls Container: Single clean row on sm+, stacked on mobile -->
      <div class="flex flex-col xs:flex-row items-stretch xs:items-center gap-2 shrink-0">
        <!-- Location & GPS Group -->
        <div class="flex items-center gap-1.5 min-w-0">
          <button id="btnOpenSearch" class="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] text-xs sm:text-sm font-medium transition cursor-pointer min-w-0 flex-1 xs:flex-initial">
            <span class="text-[#58a6ff] shrink-0">📍</span>
            <span class="text-[#e6edf3] truncate max-w-[120px] sm:max-w-[140px] md:max-w-[170px] lg:max-w-[220px]">${state.location.place}</span>
            <span class="text-[11px] sm:text-xs text-[#8b949e] font-mono shrink-0 hidden xl:inline">(${state.location.lat.toFixed(2)}°, ${state.location.lon.toFixed(2)}°)</span>
          </button>

          <button id="btnGeolocate" title="${t('app.use_gps')}" class="p-2 rounded-lg bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] text-[#58a6ff] hover:text-white transition cursor-pointer shrink-0">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          </button>
        </div>

        <!-- Utility Toolbar Group (Tour, Lang, Unit, Refresh): Non-wrapping flex group -->
        <div class="flex items-center justify-between xs:justify-start gap-1.5 shrink-0">
          ${state.installPrompt ? `
            <button id="btnInstallPwa" class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400 text-xs font-semibold transition cursor-pointer shrink-0">
              <span>📲</span><span class="hidden md:inline">${t('app.install_app')}</span>
            </button>
          ` : ''}

          <button id="btnOpenTour" title="${t('app.tour_tooltip')}" class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#161b22] hover:bg-[#21262d] border border-amber-400/30 hover:border-amber-400/60 text-xs font-semibold text-amber-300 hover:text-white transition cursor-pointer shrink-0">
            <span>💡</span><span class="hidden md:inline">${t('app.tour')}</span>
          </button>

          <!-- Language Selector -->
          <div class="relative shrink-0">
            <select id="selectLang" title="Select Language" class="appearance-none px-2 py-1.5 pr-5.5 rounded-lg bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] text-xs font-bold text-[#e6edf3] hover:text-[#58a6ff] transition cursor-pointer focus:outline-none focus:border-[#58a6ff]">
              ${SUPPORTED_LOCALES.map(l => `<option value="${l.code}" ${getLocale() === l.code ? 'selected' : ''}>${l.flag} ${l.label}</option>`).join('')}
            </select>
            <span class="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-[#8b949e]">▾</span>
          </div>

          <!-- Unit Toggle Button -->
          <button id="btnToggleUnit" title="Switch to ${state.tempUnit === 'F' ? 'Celsius' : 'Fahrenheit'}" class="px-2.5 py-1.5 rounded-lg bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] text-xs font-bold text-[#58a6ff] hover:text-white transition cursor-pointer shrink-0">
            °${state.tempUnit}
          </button>

          <!-- Refresh Button -->
          <button id="btnRefresh" title="${t('app.refresh')}" class="p-2 rounded-lg bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] text-[#8b949e] hover:text-white transition cursor-pointer shrink-0 ${state.loading ? 'animate-spin text-[#58a6ff]' : ''}">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 py-6 flex flex-col gap-6">

      <!-- Hero Verdict & Observing Summary Card -->
      <section class="rounded-2xl p-5 sm:p-6 bg-[#161b22] border border-[#30363d] relative overflow-hidden shadow-xl" style="border-left: 6px solid ${state.forecast?.verdictAccent || '#58a6ff'};">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-2 mb-2 flex-wrap">
              <span class="text-xs uppercase tracking-wider font-bold text-[#8b949e]">${t('verdict.tonight', { date: '' }).split('(')[0].trim().toUpperCase()}</span>
              ${isDarkSkyNow ? `
                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#58a6ff]/20 text-[#58a6ff] border border-[#58a6ff]/40 animate-pulse-subtle">
                  🌌 DARK SKY ACTIVE
                </span>
              ` : ''}
              ${state.forecast ? `
                <span class="text-xs text-[#8b949e] ml-auto">
                  ${getLocalizedObservingDate(state.forecast)}
                </span>
              ` : ''}
            </div>

            <div class="flex items-center gap-3">
              <span class="text-3xl sm:text-4xl">${state.forecast?.verdictEmoji || '🔭'}</span>
              <div>
                <h2 class="text-xl sm:text-2xl font-bold text-[#e6edf3]">
                  ${state.forecast ? getLocalizedVerdict(state.forecast.verdict) : (state.loading ? t('app.calculating') : t('verdict.clear'))}
                </h2>
                <p class="text-sm text-[#8b949e] mt-0.5">
                  ${state.forecast?.bestWindow ? `${t('verdict.best_window')}: <span class="text-white font-semibold">${state.forecast.bestWindow.label}</span> (${state.forecast.bestWindow.cloud}% ${t('verdict.avg_cloud').toLowerCase()})` : t('app.calculating')}
                  ${state.forecast ? ` · ${t('verdict.avg_cloud')}: ${state.forecast.avgCloud}%` : ''}
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
                    (Low: <strong class="text-white font-medium">${state.tempUnit === 'F' ? `${state.forecast.minTempF}°F` : `${state.forecast.minTempC}°C`}</strong>)
                  </span>
                </div>

                <!-- Feels Like Pill -->
                <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-[#30363d]/60">
                  <span class="text-[#8b949e]">${t('weather.feels_like')}:</span>
                  <span class="font-semibold text-[#e6edf3]">
                    ${state.tempUnit === 'F' ? `${state.forecast.feelsLikeF}°F` : `${state.forecast.feelsLikeC}°C`}
                  </span>
                </div>

                <!-- Dew / Frost Alert Pill -->
                <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${state.forecast.dewRisk === 'high' ? 'bg-amber-500/10 border-amber-500/40 text-amber-300' : (state.forecast.dewRisk === 'moderate' ? 'bg-sky-500/10 border-sky-500/30 text-sky-300' : 'bg-white/[0.04] border-[#30363d]/60 text-[#8b949e]')}">
                  <span>${state.forecast.minTempC <= 0 && state.forecast.dewRisk === 'high' ? '❄️' : '💧'}</span>
                  <span class="font-medium">${getLocalizedDewRisk(state.forecast)}</span>
                  <span class="text-[10px] opacity-75 font-mono">(${t('weather.dew_point')} ${state.tempUnit === 'F' ? `${state.forecast.dewPointF}°` : `${state.forecast.dewPointC}°`})</span>
                </div>

                <!-- Wind Pill -->
                <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-[#30363d]/60 text-[#8b949e]">
                  <span>💨</span>
                  <span>${t('weather.wind')}: <strong class="text-white font-medium">${state.tempUnit === 'F' ? `${state.forecast.windSpeedMph} mph` : `${state.forecast.windSpeedKmh} km/h`}</strong></span>
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

        <!-- Solar System Targets Card -->
        <section class="rounded-2xl p-5 sm:p-6 bg-[#161b22] border border-[#30363d] shadow-lg flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between pb-3 mb-3 border-b border-[#30363d] flex-wrap gap-2">
              <h3 class="text-sm font-bold tracking-wider uppercase text-[#8b949e] flex items-center gap-2">
                <span>🪐</span> ${t('planets.title').toUpperCase()}
              </h3>
              <div class="flex items-center gap-2">
                <span class="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20" title="Targets in amber text are up all night or well-positioned in the evening sky">
                  <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  Amber = Evening / Night Viewable
                </span>
              </div>
            </div>

            <!-- Discovery Callout Banner -->
            <div class="flex items-center justify-between p-2.5 mb-3 rounded-xl bg-gradient-to-r from-amber-500/10 via-sky-500/10 to-transparent border border-amber-500/25 text-xs text-[#cbd5e1]">
              <div class="flex items-center gap-2">
                <span class="text-base">💡</span>
                <span><strong>Tap any target below</strong> to launch its interactive 10° eyepiece, live horizon & time scrubber.</span>
              </div>
              <button id="btnOpenTourFromList" class="shrink-0 text-[11px] font-bold text-amber-300 hover:text-white hover:underline transition ml-2 cursor-pointer">
                Tour ➔
              </button>
            </div>

            <div class="flex flex-col gap-2.5">
              ${getAllSolarTargets(state).map(p => {
                const isPrime = p.status.includes('Up all night') || p.status.includes('Evening') || (p.key === 'moon' && (state.moon?.isUp ?? false));
                return `
                  <div
                    role="button"
                    tabindex="0"
                    data-planet="${p.key}"
                    class="btnPlanetCard flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-[#30363d]/50 hover:border-amber-400/40 transition cursor-pointer group"
                    title="${t('planets.view_starfield')} (${t('planets.' + p.key) || p.name})"
                  >
                    <div class="flex items-center gap-3">
                      <span class="text-xl ${isPrime ? 'text-amber-400' : 'text-[#e6edf3]'} font-bold w-6 text-center group-hover:scale-110 transition-transform">${p.symbol}</span>
                      <div>
                        <div class="flex items-center gap-2">
                          <span class="font-bold text-sm text-[#e6edf3] group-hover:text-amber-300 transition-colors">${t('planets.' + p.key) || p.name}</span>
                          <!-- Plain-text Constellation badge -->
                          <span class="px-2 py-0.5 rounded text-[11px] font-bold bg-[#56d4dd]/15 text-[#56d4dd] border border-[#56d4dd]/30">
                            ${p.constellation}
                          </span>
                        </div>
                        <span class="text-xs font-medium ${isPrime ? 'text-amber-400' : 'text-[#8b949e]'}">
                          ${formatLocalizedPlanetStatus(p)}
                        </span>
                      </div>
                    </div>

                    <div class="flex items-center gap-3">
                      <div class="text-right text-xs text-[#8b949e]">
                        ${p.set ? `<div>${t('planets.set')} ${formatTime(p.set)}</div>` : ''}
                        ${p.rise ? `<div>${t('planets.rise')} ${formatTime(p.rise)}</div>` : ''}
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
                <span>🌙</span> ${t('moon.title').toUpperCase()}
              </h3>
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-[#58a6ff]/15 text-[#58a6ff] border border-[#58a6ff]/30">
                  ${getLocalizedMoonDirection(state.moon?.phaseDirection)}
                </span>
                <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-400 border border-amber-400/30">
                  ${t('moon.illum', { pct: state.moon?.illum || 0 })}
                </span>
              </div>
            </div>

            <!-- Top Row: Moon Canvas + Details -->
            <div class="flex items-center justify-between gap-4">
              <div class="flex items-center gap-4">
                <canvas id="moonCanvas" width="180" height="180" class="w-20 h-20 sm:w-24 sm:h-24 shrink-0 drop-shadow-[0_0_14px_rgba(251,191,36,0.3)]"></canvas>
                <div>
                  <h4 class="text-lg font-bold text-[#e6edf3]">${getLocalizedMoonPhase(state.moon?.name)}</h4>
                  <p class="text-xs text-[#8b949e] mt-0.5">
                    Age: <span class="text-white font-medium">${state.moon?.age.toFixed(1) || '0'} days</span> · ${getLocalizedMoonDirection(state.moon?.phaseDirection)}
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
                <span class="text-[#8b949e] block text-[10px] uppercase font-bold">${t('moon.rises')}</span>
                <span class="text-sm font-bold text-amber-300">${formatTime(state.moon?.rise || null)}</span>
              </div>
              <div class="p-2.5 rounded-xl bg-white/[0.02] border border-[#30363d]/40">
                <span class="text-[#8b949e] block text-[10px] uppercase font-bold">${t('moon.sets')}</span>
                <span class="text-sm font-bold text-amber-300">${formatTime(state.moon?.set || null)}</span>
              </div>
              <div class="p-2.5 rounded-xl bg-white/[0.02] border border-[#30363d]/40">
                <span class="text-[#8b949e] block text-[10px] uppercase font-bold">${t('moon.next_new')}</span>
                <span class="text-sm font-bold text-[#58a6ff]">${formatShortDate(state.moon?.nextNew || null)}</span>
              </div>
              <div class="p-2.5 rounded-xl bg-white/[0.02] border border-[#30363d]/40">
                <span class="text-[#8b949e] block text-[10px] uppercase font-bold">${t('moon.next_full')}</span>
                <span class="text-sm font-bold text-amber-300">${formatShortDate(state.moon?.nextFull || null)}</span>
              </div>
            </div>
          </section>

          <!-- Sun & Twilight Events Card -->
          <section class="rounded-2xl p-5 bg-[#161b22] border border-[#30363d] shadow-lg flex-1">
            <div class="flex items-center justify-between pb-3 mb-3 border-b border-[#30363d]">
              <h3 class="text-sm font-bold tracking-wider uppercase text-[#8b949e] flex items-center gap-2">
                <span>☀️</span> ${t('sun.title').toUpperCase()}
              </h3>
              <span class="text-xs text-[#8b949e]">Local Solar Times</span>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div class="p-2.5 rounded-xl bg-white/[0.02] border border-[#30363d]/40">
                <span class="text-[#8b949e] block text-[10px] uppercase font-bold">${t('sun.sunset')} (-0.8°)</span>
                <span class="text-sm font-bold text-amber-300">${formatTime(state.sunEvents?.sunset || null)}</span>
              </div>
              <div class="p-2.5 rounded-xl bg-white/[0.02] border border-[#30363d]/40">
                <span class="text-[#8b949e] block text-[10px] uppercase font-bold">${t('sun.civil_dusk')} (-6°)</span>
                <span class="text-sm font-bold text-sky-300">${formatTime(state.sunEvents?.civilDusk || null)}</span>
              </div>
              <div class="p-2.5 rounded-xl bg-white/[0.02] border border-[#30363d]/40">
                <span class="text-[#8b949e] block text-[10px] uppercase font-bold">${t('sun.nautical_dusk')} (-12°)</span>
                <span class="text-sm font-bold text-indigo-300">${formatTime(state.sunEvents?.nauticalDusk || null)}</span>
              </div>
              <div class="p-2.5 rounded-xl bg-[#58a6ff]/10 border border-[#58a6ff]/40">
                <span class="text-[#58a6ff] block text-[10px] uppercase font-bold">🌌 ${t('sun.astro_dusk')} (-18°)</span>
                <span class="text-sm font-bold text-[#58a6ff]">${formatTime(state.sunEvents?.astroDusk || null)}</span>
              </div>
              <div class="p-2.5 rounded-xl bg-[#58a6ff]/10 border border-[#58a6ff]/40">
                <span class="text-[#58a6ff] block text-[10px] uppercase font-bold">🌅 ${t('sun.astro_dawn')} (-18°)</span>
                <span class="text-sm font-bold text-[#58a6ff]">${formatTime(state.sunEvents?.astroDawn || null)}</span>
              </div>
              <div class="p-2.5 rounded-xl bg-white/[0.02] border border-[#30363d]/40">
                <span class="text-[#8b949e] block text-[10px] uppercase font-bold">${t('sun.sunrise')} (-0.8°)</span>
                <span class="text-sm font-bold text-amber-300">${formatTime(state.sunEvents?.sunrise || null)}</span>
              </div>
            </div>
          </section>

        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="pt-6 border-t border-[#30363d] flex flex-col sm:flex-row items-center justify-between text-xs text-[#8b949e] gap-2">
      <div>SkyOracle <span class="font-mono text-[#58a6ff]">v${APP_VERSION}</span> · ${t('app.powered_by')}</div>
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

    <!-- Feature Tour Carousel Modal -->
    ${state.tourModalOpen ? renderTourModal() : ''}
  `;

  drawMoonCanvas();
  drawPlanetStarfield();
  attachEventHandlers();
}

function renderSearchResultsList(results: GeocodingResult[]): string {
  if (!results.length) return '';
  return `
    <div class="flex flex-col gap-1 max-h-56 overflow-y-auto">
      <span class="text-[11px] font-bold uppercase tracking-wider text-[#8b949e] px-1">${t('search.results')}</span>
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

interface TourSlide {
  badge: string;
  title: string;
  tagline: string;
  icon: string;
  accentColor: string;
  description: string;
  highlights: { emoji: string; label: string }[];
}

function getTourSlides(): TourSlide[] {
  return [
    {
      badge: '🔭 1 / 4',
      title: t('tour.welcome_title'),
      tagline: 'High-precision telescopic starfield for Moon, Sun & planets',
      icon: '🔭',
      accentColor: '#38bdf8',
      description: t('tour.welcome_desc'),
      highlights: [
        { emoji: '◯', label: t('starfield.circular_fov') },
        { emoji: '✨', label: t('modal.constellation') },
        { emoji: '🏷️', label: t('modal.altitude') }
      ]
    },
    {
      badge: '🌅 2 / 4',
      title: t('tour.twilight_title'),
      tagline: 'Precision Civil, Nautical, and Astronomical twilight tracking',
      icon: '🌅',
      accentColor: '#10b981',
      description: t('tour.twilight_desc'),
      highlights: [
        { emoji: '━━━', label: t('starfield.horizon') },
        { emoji: '🌌', label: t('sun.astro_dusk') },
        { emoji: '📐', label: t('sun.true_night') }
      ]
    },
    {
      badge: '💧 3 / 4',
      title: t('tour.weather_title'),
      tagline: 'Hyperlocal cloud cover and dew point monitoring',
      icon: '💧',
      accentColor: '#f59e0b',
      description: t('tour.weather_desc'),
      highlights: [
        { emoji: '●', label: t('weather.temp') },
        { emoji: '💧', label: t('weather.dew_point') },
        { emoji: '💨', label: t('weather.wind') }
      ]
    },
    {
      badge: '🔒 4 / 4',
      title: t('tour.offline_title'),
      tagline: '100% offline ephemeris with zero tracking',
      icon: '🔒',
      accentColor: '#a855f7',
      description: t('tour.offline_desc'),
      highlights: [
        { emoji: '⭐', label: t('planets.title') },
        { emoji: '🌙', label: t('moon.title') },
        { emoji: '🛡️', label: t('app.offline') }
      ]
    }
  ];
}

function renderTourModal(): string {
  const slides = getTourSlides();
  const slide = slides[state.tourSlideIndex] || slides[0];

  return `
    <div id="tourModalOverlay" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div class="bg-[#161b22] border border-[#30363d] rounded-2xl max-w-lg w-full shadow-2xl flex flex-col overflow-hidden animate-scale-up">
        <!-- Header -->
        <div class="flex items-center justify-between p-3.5 sm:p-4 border-b border-[#30363d] bg-black/25">
          <div class="flex items-center gap-2">
            <span class="text-xl">💡</span>
            <h3 class="text-base sm:text-lg font-bold text-[#e6edf3]">SkyOracle Feature Tour</h3>
          </div>
          <button id="btnCloseTourModal" class="p-1.5 rounded-lg text-[#8b949e] hover:text-white hover:bg-white/10 transition cursor-pointer" aria-label="Close tour">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <!-- Slide Body -->
        <div class="p-5 sm:p-6 flex flex-col gap-4">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full" style="color: ${slide.accentColor}; background: ${slide.accentColor}20; border: 1px solid ${slide.accentColor}40;">
              ${slide.badge}
            </span>
            <div class="flex items-center gap-1.5">
              ${slides.map((_, i) => `
                <button
                  type="button"
                  class="btnTourDot w-2.5 h-2.5 rounded-full transition cursor-pointer ${i === state.tourSlideIndex ? 'bg-amber-400 scale-125' : 'bg-white/20 hover:bg-white/40'}"
                  data-slide="${i}"
                  title="Go to slide ${i + 1}"
                ></button>
              `).join('')}
            </div>
          </div>

          <div class="flex items-start gap-4">
            <div class="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0 border" style="background: ${slide.accentColor}15; border-color: ${slide.accentColor}40;">
              ${slide.icon}
            </div>
            <div>
              <h4 class="text-lg font-bold text-[#e6edf3] leading-snug">${slide.title}</h4>
              <p class="text-xs text-sky-300 font-medium mt-0.5">${slide.tagline}</p>
            </div>
          </div>

          <p class="text-sm text-[#cbd5e1] leading-relaxed">
            ${slide.description}
          </p>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-[#30363d]/60">
            ${slide.highlights.map(h => `
              <div class="p-2 rounded-xl bg-white/[0.03] border border-[#30363d]/40 flex items-center gap-2 text-xs">
                <span class="text-base">${h.emoji}</span>
                <span class="text-white font-medium">${h.label}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Footer Controls -->
        <div class="p-3.5 sm:p-4 border-t border-[#30363d] bg-black/25 flex items-center justify-between">
          <button
            id="btnTourPrev"
            type="button"
            class="px-3 py-1.5 rounded-xl border border-[#30363d] text-xs font-semibold text-[#8b949e] hover:text-white hover:bg-white/5 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            ${state.tourSlideIndex === 0 ? 'disabled' : ''}
          >
            ${t('tour.back')}
          </button>

          <span class="text-xs text-[#8b949e] font-mono">
            ${state.tourSlideIndex + 1} of ${slides.length}
          </span>

          ${state.tourSlideIndex < slides.length - 1 ? `
            <button
              id="btnTourNext"
              type="button"
              class="px-4 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/35 border border-sky-500/40 text-xs font-semibold text-sky-200 transition cursor-pointer"
            >
              ${t('tour.next')}
            </button>
          ` : `
            <button
              id="btnTourFinish"
              type="button"
              class="px-4 py-1.5 rounded-xl bg-amber-500/25 hover:bg-amber-500/35 border border-amber-500/50 text-xs font-bold text-amber-200 transition cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.3)]"
            >
              ${t('tour.get_started')}
            </button>
          `}
        </div>
      </div>
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
            <span>📍</span> ${t('search.title')}
          </h3>
          <button id="btnCloseSearch" class="p-1 rounded-lg text-[#8b949e] hover:text-white transition cursor-pointer" aria-label="${t('search.close')}">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <!-- Search Input -->
        <div class="relative">
          <input
            id="inputCitySearch"
            type="text"
            placeholder="${t('search.placeholder')}"
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
          <span class="text-[11px] font-bold uppercase tracking-wider text-[#8b949e]">${t('search.recent')}</span>
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
  const coords = getTargetEffectiveCoordinates(p, effectiveDate);
  const hp = computeHorizonParams(
    state.location.lat,
    state.location.lon,
    effectiveDate,
    coords.ra,
    coords.dec
  );
  const planetAlt = hp.planetAltDeg;
  const isAboveHorizon = planetAlt >= 0;

  const otherBodies = getOtherSolarBodies(p.key, effectiveDate);
  const fovDeg = state.starfieldFovDeg;
  const bodiesInField = getBodiesInField(
    coords.ra,
    coords.dec,
    fovDeg,
    360,
    360,
    state.starfieldOrientation,
    otherBodies,
    { lat: state.location.lat, lon: state.location.lon, date: effectiveDate },
    state.starfieldAperture
  );

  const sunBody = otherBodies.find(b => b.type === 'sun');
  const sunSep = p.key === 'sun'
    ? 0
    : (sunBody ? angularSeparationDeg(coords.ra, coords.dec, sunBody.ra, sunBody.dec) : 999);
  const sunInField = p.key === 'sun' || bodiesInField.some(b => b.type === 'sun');
  const sunNearField = p.key !== 'sun' && !sunInField && sunSep < 30.0;

  const companionPlanets = bodiesInField.filter(b => b.type === 'planet');

  const anchorH = typeof state.starfieldTimeAnchorHours === 'number' ? state.starfieldTimeAnchorHours : state.starfieldTimeOffsetHours;
  const sliderMin = anchorH - 1.0;
  const sliderMax = anchorH + 1.0;
  const minDate = new Date(state.currentDate.getTime() + sliderMin * 3600000);
  const maxDate = new Date(state.currentDate.getTime() + sliderMax * 3600000);

  let pSetDiffH: number | null = null;
  if (p.set) {
    pSetDiffH = (p.set.getTime() - state.currentDate.getTime()) / 3600000;
  }
  let pRiseDiffH: number | null = null;
  if (p.rise) {
    pRiseDiffH = (p.rise.getTime() - state.currentDate.getTime()) / 3600000;
  }

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
                <span id="modalPlanetAltBadge" class="px-2 py-0.5 rounded text-[11px] font-bold ${isAboveHorizon ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'}">
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
              <span>${state.starfieldShowLines ? `✨ ${t('starfield.lines')}` : `✨ ${t('starfield.lines_off')}`}</span>
            </button>

            <!-- Star Names Toggle Button -->
            <button
              id="btnToggleStarLabels"
              class="px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border ${state.starfieldShowLabels ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30' : 'bg-white/5 text-[#8b949e] border-[#30363d] hover:text-[#e6edf3] hover:bg-white/10'}"
              title="Toggle star names and Bayer/Flamsteed designations in field of view"
            >
              <span>${state.starfieldShowLabels ? `🏷️ ${t('starfield.names')}` : `🏷️ ${t('starfield.names_off')}`}</span>
            </button>

            <!-- Aperture Toggle Button (Circular Eyepiece / Square Sensor) -->
            <button
              id="btnToggleAperture"
              class="px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border ${state.starfieldAperture === 'circular' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-500/30' : 'bg-white/5 text-[#8b949e] border-[#30363d] hover:text-[#e6edf3] hover:bg-white/10'}"
              title="Toggle field of view between circular eyepiece and square sensor frame"
            >
              <span>${state.starfieldAperture === 'circular' ? `◯ ${t('starfield.eyepiece')} (${(fovDeg / 2).toFixed(1).replace(/\.0$/, '')}° r)` : `▢ ${t('starfield.sensor')} (${fovDeg}°)`}</span>
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
                  ? `👁️ ${t('starfield.orient_natural').split('(')[0].trim()}`
                  : state.starfieldOrientation === 'southUp'
                  ? `🧭 ${t('starfield.orient_south_up').split('(')[0].trim()}`
                  : `🧭 ${t('starfield.orient_north_up').split('(')[0].trim()}`
              }</span>
            </button>

            <button id="btnClosePlanetModal" class="p-1.5 rounded-lg text-[#8b949e] hover:text-white hover:bg-white/10 transition cursor-pointer" aria-label="${t('modal.close')}">
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
                    <span class="font-bold text-indigo-200">${t('modal.in_field')}</span>
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
                          <span>${t('modal.center_on', { name: b.name })}</span>
                          <span>➔</span>
                        </button>
                      `).join('')}
                    </div>
                  ` : ''}
                </div>
              ` : ''}

              <!-- Solar Proximity / Hazard Warning Banner -->
              ${p.key === 'sun' ? `
                <div class="px-3.5 py-2 rounded-xl bg-rose-950/90 border border-rose-500/50 flex items-center gap-2.5 text-xs text-rose-200">
                  <span class="text-lg">⚠️</span>
                  <div>
                    <span class="font-bold text-rose-300 uppercase tracking-wide">Solar Observation Hazard:</span>
                    <span>Directly viewing the Sun through binoculars or telescopes without certified solar filters causes immediate, permanent blindness!</span>
                  </div>
                </div>
              ` : sunInField ? `
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
                  <span class="text-[10px] uppercase font-bold text-[#8b949e] block">${t('modal.ra')}</span>
                  <span class="font-bold text-[#e6edf3] text-sm">${formatRa(coords.ra)}</span>
                  <span class="text-[10px] text-[#8b949e] block font-mono">(${coords.ra.toFixed(2)}°)</span>
                </div>
                <div class="p-2 rounded-xl bg-white/[0.02] border border-[#30363d]/40">
                  <span class="text-[10px] uppercase font-bold text-[#8b949e] block">${t('modal.dec')}</span>
                  <span class="font-bold text-[#e6edf3] text-sm">${formatDec(coords.dec)}</span>
                  <span class="text-[10px] text-[#8b949e] block font-mono">(${coords.dec >= 0 ? '+' : ''}${coords.dec.toFixed(2)}°)</span>
                </div>
                <div class="p-2 rounded-xl bg-white/[0.02] border border-[#30363d]/40">
                  <span class="text-[10px] uppercase font-bold text-[#8b949e] block">${t('starfield.horizon')}</span>
                  <span id="chipPlanetAlt" class="font-bold ${isAboveHorizon ? 'text-emerald-400' : 'text-rose-400'} text-sm">${isAboveHorizon ? '+' : ''}${planetAlt.toFixed(1)}° Alt</span>
                  <span id="chipPlanetAz" class="text-[10px] text-sky-300 block font-mono font-medium">Facing ${hp.planetAzDeg.toFixed(0)}° ${hp.planetAzCompass}</span>
                </div>
                <div class="p-2 rounded-xl bg-white/[0.02] border border-[#30363d]/40">
                  <span class="text-[10px] uppercase font-bold text-[#8b949e] block">${t('starfield.title')}</span>
                  <span class="font-bold text-amber-300 text-sm">${state.starfieldAperture === 'circular' ? `${fovDeg}° ◯ (${(fovDeg / 2).toFixed(1).replace(/\.0$/, '')}° r)` : `${fovDeg}° ▢ Sensor`}</span>
                  <span class="text-[10px] text-[#8b949e] block">${state.starfieldAperture === 'circular' ? `${t('starfield.eyepiece')} (Mag ≤ 6.0)` : `${t('starfield.sensor')} (Mag ≤ 6.0)`}</span>
                </div>
              </div>

              <!-- Observation Time Scrubbing Toolbar -->
              <div class="px-3.5 py-2.5 bg-[#0d1117] rounded-xl border border-[#30363d]/60 flex flex-col gap-2 text-xs">
                <!-- Top Row: Time Readout + Reset + Quick Jump Presets -->
                <div class="flex items-center justify-between gap-2 flex-wrap">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="text-[11px] font-bold text-[#8b949e] uppercase tracking-wider flex items-center gap-1">
                      <span>🕒</span>
                      <span>${t('starfield.time')}:</span>
                    </span>
                    <span id="starfieldTimeDisplay" class="font-mono font-semibold text-xs ${state.starfieldTimeOffsetHours === 0 ? 'text-[#e6edf3]' : 'text-amber-300'}">
                      ${formatTime(effectiveDate)}
                      ${state.starfieldTimeOffsetHours !== 0
                        ? `<span class="text-[11px] font-normal text-amber-400 font-sans ml-1">(${state.starfieldTimeOffsetHours > 0 ? '+' : ''}${state.starfieldTimeOffsetHours.toFixed(1).replace(/\.0$/, '')}h)</span>`
                        : '<span class="text-[11px] font-normal text-emerald-400 font-sans ml-1">(Live)</span>'
                      }
                    </span>
                    <button
                      id="btnTimeResetNow"
                      class="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition cursor-pointer ${state.starfieldTimeOffsetHours === 0 ? 'hidden' : ''}"
                      title="Reset to live current time"
                    >
                      ${t('starfield.reset_now')}
                    </button>
                  </div>

                  <!-- Quick Time Presets & Planetary Rise/Set Jumpers -->
                  <div class="flex items-center gap-1 flex-wrap">
                    <button class="btnTimePreset px-2 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${state.starfieldTimeOffsetHours === 0 ? 'bg-emerald-500/25 text-emerald-200 border-emerald-500/40' : 'bg-white/[0.03] text-[#8b949e] border-[#30363d]/70 hover:text-white hover:bg-white/10'}" data-time-preset="now">${t('starfield.preset_now')}</button>

                    <button class="btnTimePreset px-2 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer bg-white/[0.03] text-[#8b949e] border-[#30363d]/70 hover:text-white hover:bg-white/10" data-time-preset="dusk" title="End of evening twilight (Astro Dusk tonight)">${t('starfield.preset_dusk')}</button>

                    ${p.set && pSetDiffH !== null && pSetDiffH >= -6 && pSetDiffH <= 18 ? `
                      <button
                        class="btnTimePreset px-2 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${Math.abs(state.starfieldTimeOffsetHours - pSetDiffH) < 0.15 ? 'bg-amber-500/25 text-amber-200 border-amber-500/40' : 'bg-white/[0.03] text-[#8b949e] border-[#30363d]/70 hover:text-white hover:bg-white/10'}"
                        data-time-preset="planet-set"
                        title="Simulate ${p.name} setting on the horizon (${formatTime(p.set)})"
                      >
                        🌇 ${t('starfield.preset_set')} (${formatTime(p.set)})
                      </button>
                    ` : ''}

                    ${p.rise && pRiseDiffH !== null && pRiseDiffH >= -6 && pRiseDiffH <= 18 ? `
                      <button
                        class="btnTimePreset px-2 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${Math.abs(state.starfieldTimeOffsetHours - pRiseDiffH) < 0.15 ? 'bg-amber-500/25 text-amber-200 border-amber-500/40' : 'bg-white/[0.03] text-[#8b949e] border-[#30363d]/70 hover:text-white hover:bg-white/10'}"
                        data-time-preset="planet-rise"
                        title="Simulate ${p.name} rising on the horizon (${formatTime(p.rise)})"
                      >
                        🌅 ${t('starfield.preset_rise')} (${formatTime(p.rise)})
                      </button>
                    ` : ''}

                    <button class="btnTimePreset px-2 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer bg-white/[0.03] text-[#8b949e] border-[#30363d]/70 hover:text-white hover:bg-white/10" data-time-preset="10pm" title="10:00 PM local evening observing">10 PM</button>

                    <button class="btnTimePreset px-2 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer bg-white/[0.03] text-[#8b949e] border-[#30363d]/70 hover:text-white hover:bg-white/10" data-time-preset="2am" title="2:00 AM local night observing">2 AM</button>

                    <button class="btnTimePreset px-2 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer bg-white/[0.03] text-[#8b949e] border-[#30363d]/70 hover:text-white hover:bg-white/10" data-time-preset="dawn" title="Morning twilight (Astro Dawn)">${t('starfield.preset_dawn')}</button>
                  </div>
                </div>

                <!-- Bottom Row: 2h Stepper ◀ | Interactive 2-Hour Scrubber Bar | 2h Stepper ▶ -->
                <div class="flex items-center gap-2 pt-1 border-t border-[#30363d]/50">
                  <button
                    id="btnTimeStepBack"
                    class="px-2 py-1 flex items-center justify-center rounded-lg bg-white/5 border border-[#30363d] text-[#e6edf3] hover:bg-white/10 active:scale-95 transition cursor-pointer text-xs font-bold shrink-0"
                    title="Step back 2 hours"
                  >
                    ◀ −2h
                  </button>

                  <div class="flex-1 flex flex-col gap-1 min-w-0">
                    <div class="flex items-center justify-between text-[10px] text-[#8b949e] font-mono leading-none px-0.5">
                      <span id="scrubberMinTime">${formatTime(minDate)}</span>
                      <span class="text-amber-400/90 font-semibold flex items-center gap-1">
                        <span>●</span>
                        <span>2h Window (±1h) · Drag to scrub</span>
                      </span>
                      <span id="scrubberMaxTime">${formatTime(maxDate)}</span>
                    </div>

                    <input
                      type="range"
                      id="starfieldTimeScrubber"
                      class="time-scrubber-slider"
                      min="${sliderMin.toFixed(2)}"
                      max="${sliderMax.toFixed(2)}"
                      step="0.01"
                      value="${state.starfieldTimeOffsetHours.toFixed(2)}"
                      aria-label="Starfield observation time scrubber"
                    />
                  </div>

                  <button
                    id="btnTimeStepForward"
                    class="px-2 py-1 flex items-center justify-center rounded-lg bg-white/5 border border-[#30363d] text-[#e6edf3] hover:bg-white/10 active:scale-95 transition cursor-pointer text-xs font-bold shrink-0"
                    title="Step forward 2 hours"
                  >
                    +2h ▶
                  </button>
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
                <span class="text-[10px] text-[#8b949e]">${t('modal.tap_hint')}</span>
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
                      <span class="text-[10px] uppercase font-bold text-[#8b949e] block">${t('starfield.angular_separation')}</span>
                      <span class="font-bold text-sky-300 text-sm font-mono">
                        ${state.starfieldSelectedTarget.separationDeg < 1.0
                          ? `${(state.starfieldSelectedTarget.separationDeg * 60).toFixed(1)}' (${(state.starfieldSelectedTarget.separationDeg * 3600).toFixed(0)}")`
                          : `${state.starfieldSelectedTarget.separationDeg.toFixed(2)}°`
                        }
                      </span>
                      <span class="text-[10px] text-[#8b949e] block">from ${p.name} center</span>
                    </div>

                    <div class="p-2 rounded-xl bg-black/40 border border-white/5">
                      <span class="text-[10px] uppercase font-bold text-[#8b949e] block">${t('starfield.bearing')}</span>
                      <span class="font-bold text-sky-300 text-sm font-mono">
                        ${state.starfieldSelectedTarget.bearingDeg.toFixed(0)}° (${state.starfieldSelectedTarget.bearingCompass})
                      </span>
                      <span class="text-[10px] text-[#8b949e] block">from North through East</span>
                    </div>

                    <div class="p-2 rounded-xl bg-black/40 border border-white/5">
                      <span class="text-[10px] uppercase font-bold text-[#8b949e] block">${t('modal.magnitude')}</span>
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

  // Tour Modal Open / Close / Navigation
  const openTour = () => {
    state.tourModalOpen = true;
    state.tourSlideIndex = 0;
    render();
  };
  document.getElementById('btnOpenTour')?.addEventListener('click', openTour);
  document.getElementById('btnOpenTourFromList')?.addEventListener('click', openTour);

  const closeTour = () => {
    state.tourModalOpen = false;
    render();
  };
  document.getElementById('btnCloseTourModal')?.addEventListener('click', closeTour);
  document.getElementById('btnTourFinish')?.addEventListener('click', closeTour);
  document.getElementById('tourModalOverlay')?.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).id === 'tourModalOverlay') {
      closeTour();
    }
  });

  document.getElementById('btnTourPrev')?.addEventListener('click', () => {
    if (state.tourSlideIndex > 0) {
      state.tourSlideIndex--;
      render();
    }
  });

  document.getElementById('btnTourNext')?.addEventListener('click', () => {
    if (state.tourSlideIndex < getTourSlides().length - 1) {
      state.tourSlideIndex++;
      render();
    }
  });

  document.querySelectorAll<HTMLElement>('.btnTourDot').forEach(btn => {
    btn.addEventListener('click', () => {
      const slideIdx = parseInt(btn.getAttribute('data-slide') || '0', 10);
      if (!isNaN(slideIdx) && slideIdx >= 0 && slideIdx < getTourSlides().length) {
        state.tourSlideIndex = slideIdx;
        render();
      }
    });
  });

  // Language Selector
  const selectLang = document.getElementById('selectLang') as HTMLSelectElement | null;
  selectLang?.addEventListener('change', () => {
    setLocale(selectLang.value as Locale);
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

  // Planet / Target Card Click -> 10° Starfield Modal
  document.querySelectorAll<HTMLElement>('.btnPlanetCard').forEach(btn => {
    btn.addEventListener('click', () => {
      const pKey = btn.getAttribute('data-planet');
      const allTargets = getAllSolarTargets(state);
      const p = allTargets.find(item => item.key === pKey);
      if (p) {
        state.selectedPlanet = p;
        state.starfieldTimeOffsetHours = 0;
        state.starfieldTimeAnchorHours = 0;
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
      const allTargets = getAllSolarTargets(state);
      const target = allTargets.find(item => item.key === key);
      if (target) {
        state.selectedPlanet = target;
        state.starfieldTimeOffsetHours = 0;
        state.starfieldTimeAnchorHours = 0;
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
    state.starfieldTimeAnchorHours = 0;
    render();
  });

  document.getElementById('btnTimeStepBack')?.addEventListener('click', () => {
    state.starfieldTimeOffsetHours -= 2;
    state.starfieldTimeAnchorHours = state.starfieldTimeOffsetHours;
    render();
  });

  document.getElementById('btnTimeStepForward')?.addEventListener('click', () => {
    state.starfieldTimeOffsetHours += 2;
    state.starfieldTimeAnchorHours = state.starfieldTimeOffsetHours;
    render();
  });

  // Range Slider live input & change listeners
  const scrubber = document.getElementById('starfieldTimeScrubber') as HTMLInputElement | null;
  scrubber?.addEventListener('input', () => {
    const val = parseFloat(scrubber.value);
    if (!isNaN(val)) {
      state.starfieldTimeOffsetHours = val;
      updateStarfieldLiveScrub();
    }
  });

  scrubber?.addEventListener('change', () => {
    const val = parseFloat(scrubber.value);
    if (!isNaN(val)) {
      state.starfieldTimeOffsetHours = val;
      if (Math.abs(state.starfieldTimeOffsetHours - state.starfieldTimeAnchorHours) > 0.85) {
        state.starfieldTimeAnchorHours = Math.round(state.starfieldTimeOffsetHours * 10) / 10;
        render();
      } else {
        updateStarfieldLiveScrub();
      }
    }
  });

  document.querySelectorAll<HTMLElement>('.btnTimePreset').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = btn.getAttribute('data-time-preset');
      const p = state.selectedPlanet;
      if (preset === 'now') {
        state.starfieldTimeOffsetHours = 0;
        state.starfieldTimeAnchorHours = 0;
      } else if (preset === 'dusk') {
        if (state.sunEvents?.astroDusk) {
          const diffH = (state.sunEvents.astroDusk.getTime() - state.currentDate.getTime()) / 3600000;
          state.starfieldTimeOffsetHours = Math.round(diffH * 10) / 10;
        } else {
          state.starfieldTimeOffsetHours = 6;
        }
        state.starfieldTimeAnchorHours = state.starfieldTimeOffsetHours;
      } else if (preset === 'planet-set' && p?.set) {
        const diffH = (p.set.getTime() - state.currentDate.getTime()) / 3600000;
        state.starfieldTimeOffsetHours = Math.round(diffH * 100) / 100;
        state.starfieldTimeAnchorHours = state.starfieldTimeOffsetHours;
      } else if (preset === 'planet-rise' && p?.rise) {
        const diffH = (p.rise.getTime() - state.currentDate.getTime()) / 3600000;
        state.starfieldTimeOffsetHours = Math.round(diffH * 100) / 100;
        state.starfieldTimeAnchorHours = state.starfieldTimeOffsetHours;
      } else if (preset === '10pm') {
        const target = new Date(state.currentDate);
        target.setHours(22, 0, 0, 0);
        let diffH = (target.getTime() - state.currentDate.getTime()) / 3600000;
        if (diffH < -3) diffH += 24;
        state.starfieldTimeOffsetHours = Math.round(diffH * 10) / 10;
        state.starfieldTimeAnchorHours = state.starfieldTimeOffsetHours;
      } else if (preset === '2am') {
        const target = new Date(state.currentDate);
        target.setHours(2, 0, 0, 0);
        let diffH = (target.getTime() - state.currentDate.getTime()) / 3600000;
        if (diffH < 0) diffH += 24;
        state.starfieldTimeOffsetHours = Math.round(diffH * 10) / 10;
        state.starfieldTimeAnchorHours = state.starfieldTimeOffsetHours;
      } else if (preset === 'dawn') {
        if (state.sunEvents?.astroDawn) {
          const diffH = (state.sunEvents.astroDawn.getTime() - state.currentDate.getTime()) / 3600000;
          state.starfieldTimeOffsetHours = Math.round(diffH * 10) / 10;
        } else {
          state.starfieldTimeOffsetHours = 12;
        }
        state.starfieldTimeAnchorHours = state.starfieldTimeOffsetHours;
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
    state.starfieldTimeAnchorHours = 0;
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
    if (state.tourModalOpen) {
      state.tourModalOpen = false;
      render();
    } else if (state.selectedPlanet) {
      state.selectedPlanet = null;
      state.starfieldSelectedTarget = null;
      state.starfieldTimeOffsetHours = 0;
      state.starfieldTimeAnchorHours = 0;
      render();
    } else if (state.searchOpen) {
      state.searchOpen = false;
      render();
    }
  } else if (state.tourModalOpen) {
    if (e.key === 'ArrowRight' && state.tourSlideIndex < getTourSlides().length - 1) {
      state.tourSlideIndex++;
      render();
    } else if (e.key === 'ArrowLeft' && state.tourSlideIndex > 0) {
      state.tourSlideIndex--;
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

onLocaleChange(() => {
  render();
});

refreshAll();
