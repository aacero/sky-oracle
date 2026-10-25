/**
 * Standalone Astronomical Ephemeris Engine
 * 
 * Implements:
 * - NOAA / Jean Meeus solar altitude and twilight calculations
 * - Jean Meeus lunar illumination, synodic age, and phase naming
 * - NASA JPL Keplerian orbital elements for the 5 classical naked-eye planets
 * - IAU ecliptic constellation boundaries (13 constellations)
 * 
 * 100% offline, zero-dependency, <1ms execution.
 */

export interface SunEvents {
  sunset: Date | null;
  civilDusk: Date | null;
  nauticalDusk: Date | null;
  astroDusk: Date | null;
  astroDawn: Date | null;
  sunrise: Date | null;
}

export interface MoonInfo {
  illum: number;      // 0 - 100%
  age: number;        // days in synodic cycle (0 - 29.53)
  name: string;       // e.g. "Waxing Crescent"
  glyph: string;      // e.g. "🌒"
  cyclePos: number;   // 0.0 - 1.0
  phaseDirection: 'Waxing' | 'Waning';
  rise?: Date | null;
  set?: Date | null;
  nextNew?: Date | null;
  nextFull?: Date | null;
  altitude?: number;  // current altitude in degrees
  isUp?: boolean;     // true if altitude >= 0.125 deg
}

export interface PlanetInfo {
  key: string;
  name: string;
  symbol: string;
  rise: Date | null;
  set: Date | null;
  status: string;
  constellation: string;
  ecLon: number;
  ra: number;
  dec: number;
}

export interface ConstellationInfo {
  name: string;
  symbol: string;
  start: number;
  end: number;
}

// ── 1. Solar Altitude & Twilights ──────────────────────────────────────────

export function sunPosition(date: Date): { ra: number; dec: number } {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const n = jd - 2451545.0;
  const L = (280.460 + 0.9856474 * n) % 360;
  const g = ((357.528 + 0.9856003 * n) % 360) * Math.PI / 180;
  const Lnorm = (L + 360) % 360;
  const lambda = (Lnorm + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * Math.PI / 180;
  const eps = (23.439 - 0.0000004 * n) * Math.PI / 180;
  const alpha = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda));
  const delta = Math.asin(Math.sin(eps) * Math.sin(lambda));
  const ra = ((alpha * 180 / Math.PI) % 360 + 360) % 360;
  const dec = delta * 180 / Math.PI;
  return { ra, dec };
}

export function solarAltitude(date: Date, latitude: number, longitude: number): number {
  const pos = sunPosition(date);
  const jd = date.getTime() / 86400000 + 2440587.5;
  const n = jd - 2451545.0;
  const gmst = (280.46061837 + 360.98564736629 * n) % 360;
  const lmst = (gmst + longitude + 360) % 360;
  const ha = (lmst - pos.ra) * Math.PI / 180;
  const latR = latitude * Math.PI / 180;
  const decR = pos.dec * Math.PI / 180;
  const sinAlt = Math.sin(latR) * Math.sin(decR) + Math.cos(latR) * Math.cos(decR) * Math.cos(ha);
  return Math.asin(Math.max(-1, Math.min(1, sinAlt))) * 180 / Math.PI;
}

function interpTime(t1: number, t2: number, a1: number, a2: number, target: number): Date {
  const span = a2 - a1;
  if (Math.abs(span) < 0.0001) return new Date((t1 + t2) / 2);
  const frac = Math.max(0, Math.min(1, (target - a1) / span));
  return new Date(t1 + (t2 - t1) * frac);
}

export function calculateSunEvents(refDate: Date, latitude: number, longitude: number): SunEvents | null {
  if (latitude === 0 && longitude === 0) return null;
  let noon = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate(), 12, 0, 0);
  if (refDate.getHours() < 6) {
    noon = new Date(noon.getTime() - 24 * 3600000);
  }
  const startMs = noon.getTime();
  const endMs = startMs + 24 * 3600000;
  const stepMs = 5 * 60 * 1000;

  let sunset: Date | null = null;
  let civilDusk: Date | null = null;
  let nauticalDusk: Date | null = null;
  let astroDusk: Date | null = null;
  let astroDawn: Date | null = null;
  let sunrise: Date | null = null;

  let prevAlt = solarAltitude(noon, latitude, longitude);
  let prevMs = startMs;

  for (let ms = startMs + stepMs; ms <= endMs; ms += stepMs) {
    const curDate = new Date(ms);
    const curAlt = solarAltitude(curDate, latitude, longitude);

    if (prevAlt >= -0.833 && curAlt < -0.833 && !sunset) {
      sunset = interpTime(prevMs, ms, prevAlt, curAlt, -0.833);
    }
    if (prevAlt >= -6.0 && curAlt < -6.0 && !civilDusk) {
      civilDusk = interpTime(prevMs, ms, prevAlt, curAlt, -6.0);
    }
    if (prevAlt >= -12.0 && curAlt < -12.0 && !nauticalDusk) {
      nauticalDusk = interpTime(prevMs, ms, prevAlt, curAlt, -12.0);
    }
    if (prevAlt >= -18.0 && curAlt < -18.0 && !astroDusk) {
      astroDusk = interpTime(prevMs, ms, prevAlt, curAlt, -18.0);
    }

    if (prevAlt < -18.0 && curAlt >= -18.0 && !astroDawn) {
      astroDawn = interpTime(prevMs, ms, prevAlt, curAlt, -18.0);
    }
    if (prevAlt < -0.833 && curAlt >= -0.833 && !sunrise) {
      sunrise = interpTime(prevMs, ms, prevAlt, curAlt, -0.833);
    }

    prevAlt = curAlt;
    prevMs = ms;
  }

  return { sunset, civilDusk, nauticalDusk, astroDusk, astroDawn, sunrise };
}

// ── 2. Moon Phase & Illumination ──────────────────────────────────────────

export function calculateMoonInfo(date: Date, latitude?: number, longitude?: number): MoonInfo {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const days = jd - 2451545.0;
  const T = days / 36525;
  const RAD = Math.PI / 180;
  const DEG = 180 / Math.PI;
  const Dm = (297.8501921 + 445267.1114034 * T) * RAD;
  const M = (357.5291092 + 35999.0502909 * T) * RAD;
  const Mp = (134.9633964 + 477198.8675055 * T) * RAD;
  let i = 180 - Dm * DEG
        - 6.289 * Math.sin(Mp) + 2.100 * Math.sin(M)
        - 1.274 * Math.sin(2 * Dm - Mp) - 0.658 * Math.sin(2 * Dm)
        - 0.214 * Math.sin(2 * Mp) - 0.110 * Math.sin(Dm);
  i = ((i % 360) + 360) % 360;
  const illum = Math.round((1 + Math.cos(i * RAD)) / 2 * 100);
  const phaseFrac = ((((Dm * DEG) % 360) + 360) % 360) / 360;
  const age = phaseFrac * 29.530588853;

  const names: [number, string, string][] = [
    [1.84566, 'New Moon', '🌑'],
    [5.53699, 'Waxing Crescent', '🌒'],
    [9.22831, 'First Quarter', '🌓'],
    [12.91963, 'Waxing Gibbous', '🌔'],
    [16.61096, 'Full Moon', '🌕'],
    [20.30228, 'Waning Gibbous', '🌖'],
    [23.99361, 'Last Quarter', '🌗'],
    [27.68493, 'Waning Crescent', '🌘']
  ];

  let name = 'New Moon';
  let glyph = '🌑';
  for (let k = 0; k < names.length; k++) {
    if (age <= names[k][0]) {
      name = names[k][1];
      glyph = names[k][2];
      break;
    }
  }

  const phaseDirection: 'Waxing' | 'Waning' = phaseFrac < 0.5 ? 'Waxing' : 'Waning';

  // Synodic month = 2551443.0 seconds (~29.53059 days)
  const synodicMs = 2551443.0 * 1000;
  const getNextPhaseDate = (targetPos: number): Date => {
    let ahead = targetPos - phaseFrac;
    if (ahead <= 0) ahead += 1;
    return new Date(date.getTime() + ahead * synodicMs);
  };

  const nextNew = getNextPhaseDate(0);
  const nextFull = getNextPhaseDate(0.5);

  let rise: Date | null = null;
  let set: Date | null = null;
  let altitude: number | undefined;
  let isUp: boolean | undefined;

  if (latitude !== undefined && longitude !== undefined && (latitude !== 0 || longitude !== 0)) {
    altitude = Math.round(lunarAltitude(date, latitude, longitude) * 10) / 10;
    isUp = altitude >= 0.125;
    const rs = calculateMoonRiseSet(date, latitude, longitude);
    rise = rs.rise;
    set = rs.set;
  }

  return {
    illum,
    age,
    name,
    glyph,
    cyclePos: phaseFrac,
    phaseDirection,
    nextNew,
    nextFull,
    rise,
    set,
    altitude,
    isUp
  };
}

export function moonPosition(date: Date): { ra: number; dec: number } {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const d = jd - 2451545.0;
  const T = d / 36525;
  const RAD = Math.PI / 180;
  const DEG = 180 / Math.PI;

  const Lp = (218.3164477 + 481267.88123421 * T) * RAD;
  const Dm = (297.8501921 + 445267.1114034 * T) * RAD;
  const M = (357.5291092 + 35999.0502909 * T) * RAD;
  const Mp = (134.9633964 + 477198.8675055 * T) * RAD;
  const F = (93.2720950 + 483202.0175233 * T) * RAD;

  let l = Lp * DEG
    + 6.289 * Math.sin(Mp)
    + 1.274 * Math.sin(2 * Dm - Mp)
    + 0.658 * Math.sin(2 * Dm)
    + 0.214 * Math.sin(2 * Mp)
    - 0.186 * Math.sin(M)
    - 0.114 * Math.sin(2 * F);
  l = ((l % 360) + 360) % 360;

  const b = 5.128 * Math.sin(F)
    + 0.280 * Math.sin(Mp + F)
    + 0.277 * Math.sin(Mp - F)
    + 0.173 * Math.sin(2 * Dm - F);

  const eps = (23.439 - 0.0000004 * d) * RAD;
  const lR = l * RAD;
  const bR = b * RAD;

  const sinDec = Math.sin(bR) * Math.cos(eps) + Math.cos(bR) * Math.sin(eps) * Math.sin(lR);
  const dec = Math.asin(sinDec);

  const y = Math.cos(bR) * Math.cos(eps) * Math.sin(lR) - Math.sin(bR) * Math.sin(eps);
  const x = Math.cos(bR) * Math.cos(lR);
  const ra = ((Math.atan2(y, x) * DEG) % 360 + 360) % 360;

  return { ra, dec };
}

/**
 * Returns lunar coordinates with declination converted to standard degrees.
 */
export function getMoonCoordinates(date: Date): { ra: number; dec: number } {
  const pos = moonPosition(date);
  return {
    ra: pos.ra,
    dec: pos.dec * 180 / Math.PI
  };
}

export function lunarAltitude(date: Date, lat: number, lon: number): number {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const d = jd - 2451545.0;
  const pos = moonPosition(date);
  const gmst = ((280.46061837 + 360.98564736629 * d) % 360 + 360) % 360;
  const lmst = (gmst + lon + 360) % 360;
  const ha = (lmst - pos.ra + 360) % 360;

  const latR = lat * Math.PI / 180;
  const decR = pos.dec;
  const haR = ha * Math.PI / 180;

  const sinAlt = Math.sin(latR) * Math.sin(decR) + Math.cos(latR) * Math.cos(decR) * Math.cos(haR);
  return Math.asin(sinAlt) * 180 / Math.PI;
}

export function calculateMoonRiseSet(refDate: Date, lat: number, lon: number): { rise: Date | null; set: Date | null } {
  const startMs = refDate.getTime();
  const endMs = startMs + 36 * 3600000;
  const stepMs = 5 * 60 * 1000;
  const targetAlt = 0.125;

  let rise: Date | null = null;
  let set: Date | null = null;

  let prevAlt = lunarAltitude(refDate, lat, lon);
  let prevMs = startMs;

  for (let ms = startMs + stepMs; ms <= endMs && (!rise || !set); ms += stepMs) {
    const curDate = new Date(ms);
    const curAlt = lunarAltitude(curDate, lat, lon);

    if (prevAlt < targetAlt && curAlt >= targetAlt && !rise) {
      const span = curAlt - prevAlt;
      const frac = Math.abs(span) < 0.0001 ? 0.5 : (targetAlt - prevAlt) / span;
      rise = new Date(prevMs + (ms - prevMs) * Math.max(0, Math.min(1, frac)));
    }
    if (prevAlt >= targetAlt && curAlt < targetAlt && !set) {
      const span = curAlt - prevAlt;
      const frac = Math.abs(span) < 0.0001 ? 0.5 : (targetAlt - prevAlt) / span;
      set = new Date(prevMs + (ms - prevMs) * Math.max(0, Math.min(1, frac)));
    }

    prevAlt = curAlt;
    prevMs = ms;
  }

  return { rise, set };
}

// ── 3. Constellations (IAU Ecliptic Boundaries) ───────────────────────────

export const CONSTELLATIONS: ConstellationInfo[] = [
  { name: "Pisces", symbol: "♓", start: 351.6, end: 29.8 },
  { name: "Aries", symbol: "♈", start: 29.8, end: 53.5 },
  { name: "Taurus", symbol: "♉", start: 53.5, end: 90.2 },
  { name: "Gemini", symbol: "♊", start: 90.2, end: 118.1 },
  { name: "Cancer", symbol: "♋", start: 118.1, end: 138.2 },
  { name: "Leo", symbol: "♌", start: 138.2, end: 174.2 },
  { name: "Virgo", symbol: "♍", start: 174.2, end: 218.0 },
  { name: "Libra", symbol: "♎", start: 218.0, end: 241.0 },
  { name: "Scorpius", symbol: "♏", start: 241.0, end: 247.9 },
  { name: "Ophiuchus", symbol: "⛎", start: 247.9, end: 266.3 },
  { name: "Sagittarius", symbol: "♐", start: 266.3, end: 299.7 },
  { name: "Capricornus", symbol: "♑", start: 299.7, end: 327.9 },
  { name: "Aquarius", symbol: "♒", start: 327.9, end: 351.6 }
];

export function getConstellation(ecLon: number): ConstellationInfo {
  const norm = ((ecLon % 360) + 360) % 360;
  for (let k = 0; k < CONSTELLATIONS.length; k++) {
    const c = CONSTELLATIONS[k];
    if (c.start > c.end) {
      if (norm >= c.start || norm < c.end) return c;
    } else {
      if (norm >= c.start && norm < c.end) return c;
    }
  }
  return { name: "Pisces", symbol: "♓", start: 351.6, end: 29.8 };
}

// ── 4. Planetary Ephemeris (NASA JPL Keplerian Elements) ───────────────────

interface PlanetOrbitalElements {
  name: string;
  symbol: string;
  a0: number; aRate: number;
  e0: number; eRate: number;
  I0: number; IRate: number;
  L0: number; LRate: number;
  longPeri0: number; longPeriRate: number;
  longNode0: number; longNodeRate: number;
}

const PLANETS_DATA: Record<string, PlanetOrbitalElements> = {
  mercury: {
    name: "Mercury", symbol: "☿",
    a0: 0.38709927, aRate: 0.00000037,
    e0: 0.20563593, eRate: 0.00001906,
    I0: 7.00497902, IRate: -0.00594749,
    L0: 252.25032350, LRate: 149472.67411175,
    longPeri0: 77.45779628, longPeriRate: 0.16047689,
    longNode0: 48.33076593, longNodeRate: -0.12534081
  },
  venus: {
    name: "Venus", symbol: "♀",
    a0: 0.72333566, aRate: 0.00000390,
    e0: 0.00677672, eRate: -0.00004107,
    I0: 3.39467605, IRate: -0.00078890,
    L0: 181.97909950, LRate: 58517.81538729,
    longPeri0: 131.60246718, longPeriRate: 0.00268329,
    longNode0: 76.67984255, longNodeRate: -0.27769418
  },
  mars: {
    name: "Mars", symbol: "♂",
    a0: 1.52371034, aRate: 0.00001847,
    e0: 0.09339410, eRate: 0.00007882,
    I0: 1.84969142, IRate: -0.00813131,
    L0: -4.55343205, LRate: 19140.30268499,
    longPeri0: -23.94362959, longPeriRate: 0.44441088,
    longNode0: 49.55953891, longNodeRate: -0.29257343
  },
  jupiter: {
    name: "Jupiter", symbol: "♃",
    a0: 5.20288700, aRate: -0.00011607,
    e0: 0.04838624, eRate: -0.00013253,
    I0: 1.30439695, IRate: -0.00183714,
    L0: 34.39644051, LRate: 3034.74612775,
    longPeri0: 14.72847983, longPeriRate: 0.21252668,
    longNode0: 100.47390909, longNodeRate: 0.20469106
  },
  saturn: {
    name: "Saturn", symbol: "♄",
    a0: 9.53667594, aRate: -0.00125060,
    e0: 0.05386179, eRate: -0.00050991,
    I0: 2.48599187, IRate: 0.00193609,
    L0: 49.95424423, LRate: 1222.49362201,
    longPeri0: 92.59887831, longPeriRate: -0.41897216,
    longNode0: 113.66242448, longNodeRate: -0.28867794
  }
};

const EARTH_ELEMENTS = {
  a0: 1.00000261, aRate: 0.00000562,
  e0: 0.01671123, eRate: -0.00004392,
  I0: -0.00001531, IRate: -0.01294668,
  L0: 100.46457166, LRate: 35999.37244981,
  longPeri0: 102.93768193, longPeriRate: 0.32327364,
  longNode0: 0.0, longNodeRate: 0.0
};

interface HeliocentricCoords {
  x: number;
  y: number;
  z: number;
}

function getHeliocentric(elem: typeof EARTH_ELEMENTS, T: number): HeliocentricCoords {
  const d2r = Math.PI / 180;
  const a = elem.a0 + elem.aRate * T;
  const e = elem.e0 + elem.eRate * T;
  const I = (elem.I0 + elem.IRate * T) * d2r;
  const L = elem.L0 + elem.LRate * T;
  const longPeri = elem.longPeri0 + elem.longPeriRate * T;
  const longNode = elem.longNode0 + elem.longNodeRate * T;

  const omega = (longPeri - longNode) * d2r;
  const Omega = longNode * d2r;
  const M = ((L - longPeri) % 360 + 360) % 360 * d2r;

  let E = M;
  for (let k = 0; k < 6; ++k) {
    E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  }

  const xPrime = a * (Math.cos(E) - e);
  const yPrime = a * Math.sqrt(1 - e * e) * Math.sin(E);

  const x = (Math.cos(omega) * Math.cos(Omega) - Math.sin(omega) * Math.sin(Omega) * Math.cos(I)) * xPrime
          + (-Math.sin(omega) * Math.cos(Omega) - Math.cos(omega) * Math.sin(Omega) * Math.cos(I)) * yPrime;
  const y = (Math.cos(omega) * Math.sin(Omega) + Math.sin(omega) * Math.cos(Omega) * Math.cos(I)) * xPrime
          + (-Math.sin(omega) * Math.sin(Omega) + Math.cos(omega) * Math.cos(Omega) * Math.cos(I)) * yPrime;
  const z = (Math.sin(omega) * Math.sin(I)) * xPrime
          + (Math.cos(omega) * Math.sin(I)) * yPrime;

  return { x, y, z };
}

export function getPlanetEquatorial(planetKey: string, date: Date) {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const T = (jd - 2451545.0) / 36525.0;
  const d2r = Math.PI / 180;
  const r2d = 180 / Math.PI;

  const pElem = PLANETS_DATA[planetKey];
  const pHelio = getHeliocentric(pElem, T);
  const eHelio = getHeliocentric(EARTH_ELEMENTS, T);

  const gx = pHelio.x - eHelio.x;
  const gy = pHelio.y - eHelio.y;
  const gz = pHelio.z - eHelio.z;

  const eps = (23.43928 - 0.0000004 * (jd - 2451545.0)) * d2r;
  const eqX = gx;
  const eqY = gy * Math.cos(eps) - gz * Math.sin(eps);
  const eqZ = gy * Math.sin(eps) + gz * Math.cos(eps);
  const ra = Math.atan2(eqY, eqX);
  const dec = Math.atan2(eqZ, Math.sqrt(eqX * eqX + eqY * eqY));
  const ecLon = (Math.atan2(gy, gx) * r2d + 360) % 360;

  return {
    ra: (ra * r2d + 360) % 360,
    dec: dec * r2d,
    ecLon
  };
}

export function calculatePlanetRiseSet(
  planetKey: string,
  refDate: Date,
  latitude: number,
  longitude: number
): PlanetInfo | null {
  if (latitude === 0 && longitude === 0) return null;
  const noon = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate(), 12, 0, 0);
  const eq = getPlanetEquatorial(planetKey, noon);
  const d2r = Math.PI / 180;
  const r2d = 180 / Math.PI;
  const cInfo = getConstellation(eq.ecLon);

  const ut0 = new Date(Date.UTC(noon.getUTCFullYear(), noon.getUTCMonth(), noon.getUTCDate(), 0, 0, 0));
  const dUT0 = (ut0.getTime() / 86400000 + 2440587.5) - 2451545.0;
  const theta0 = ((280.46061837 + 360.98564736629 * dUT0) % 360 + 360) % 360;

  const latR = latitude * d2r;
  const decR = eq.dec * d2r;
  const h0 = -0.566 * d2r;

  const cosH0 = (Math.sin(h0) - Math.sin(latR) * Math.sin(decR)) / (Math.cos(latR) * Math.cos(decR));
  const pData = PLANETS_DATA[planetKey];

  if (cosH0 > 1) {
    return {
      key: planetKey,
      name: pData.name,
      symbol: pData.symbol,
      rise: null,
      set: null,
      status: "Below horizon",
      constellation: cInfo.name,
      ecLon: eq.ecLon,
      ra: eq.ra,
      dec: eq.dec
    };
  }
  if (cosH0 < -1) {
    return {
      key: planetKey,
      name: pData.name,
      symbol: pData.symbol,
      rise: null,
      set: null,
      status: "Circumpolar",
      constellation: cInfo.name,
      ecLon: eq.ecLon,
      ra: eq.ra,
      dec: eq.dec
    };
  }

  const H0 = Math.acos(cosH0) * r2d;
  const m0 = ((eq.ra - longitude - theta0) % 360 + 360) % 360 / 360;
  const m1 = (m0 - H0 / 360 + 1) % 1;
  const m2 = (m0 + H0 / 360) % 1;

  const riseDate = new Date(ut0.getTime() + m1 * 86400000);
  const setDate = new Date(ut0.getTime() + m2 * 86400000);

  const rH = riseDate.getHours();
  const sH = setDate.getHours();
  let stat = "";
  if (rH >= 17 && rH <= 22 && (sH >= 4 && sH <= 9)) {
    stat = "Up all night";
  } else if (sH >= 18 && sH <= 23) {
    stat = "Evening · sets " + formatTime(setDate);
  } else if (rH >= 1 && rH <= 6) {
    stat = "Morning · rises " + formatTime(riseDate);
  } else {
    stat = "Sets " + formatTime(setDate);
  }

  return {
    key: planetKey,
    name: pData.name,
    symbol: pData.symbol,
    rise: riseDate,
    set: setDate,
    status: stat,
    constellation: cInfo.name,
    ecLon: eq.ecLon,
    ra: eq.ra,
    dec: eq.dec
  };
}

export function calculateAllPlanets(refDate: Date, latitude: number, longitude: number): PlanetInfo[] {
  if (latitude === 0 && longitude === 0) return [];
  const keys = ["mercury", "venus", "mars", "jupiter", "saturn"];
  const out: PlanetInfo[] = [];
  for (let i = 0; i < keys.length; i++) {
    const p = calculatePlanetRiseSet(keys[i], refDate, latitude, longitude);
    if (p) out.push(p);
  }
  return out;
}

// ── 5. Formatting Helpers ──────────────────────────────────────────────────

export function formatTime(d: Date | null, timeZone?: string): string {
  if (!d || isNaN(d.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone
    }).format(d);
  } catch {
    let hr = d.getHours();
    const min = d.getMinutes();
    const ampm = hr >= 12 ? 'PM' : 'AM';
    hr = hr % 12;
    hr = hr ? hr : 12;
    const minStr = min < 10 ? '0' + min : String(min);
    return `${hr}:${minStr} ${ampm}`;
  }
}

export function formatShortDate(d: Date | null, timeZone?: string): string {
  if (!d || isNaN(d.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone
    }).format(d);
  } catch {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
  }
}

export function formatHour(hr: number): string {
  if (hr === 0) return "12 AM";
  if (hr < 12) return `${hr} AM`;
  if (hr === 12) return "12 PM";
  return `${hr - 12} PM`;
}

export function formatHourCompact(hr: number): string {
  if (hr === 0) return "12a";
  if (hr < 12) return `${hr}a`;
  if (hr === 12) return "12p";
  return `${hr - 12}p`;
}
