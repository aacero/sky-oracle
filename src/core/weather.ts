/**
 * Weather & Stargazing Clarity Engine
 * 
 * Integrates with Open-Meteo for keyless, CORS-enabled cloud cover forecasts.
 * Extracts dynamic dark-sky observing window (post-sunset through pre-sunrise).
 */

import {
  calculateSunEvents,
  formatHour,
  formatHourCompact,
  solarAltitude,
  lunarAltitude,
  calculateMoonInfo
} from './astronomy.ts';

export interface ObservingHour {
  hr: number;
  cloud: number;
  clarity: number; // 0 - 100%
  tempC: number;
  tempF: number;
  feelsLikeC: number;
  feelsLikeF: number;
  dewPointC: number;
  dewPointF: number;
  windSpeedMph: number;
  windSpeedKmh: number;
  label: string;
  labelCompact: string;
  isDarkSky: boolean;
  score?: number;
  sunAlt?: number;
  moonAlt?: number;
  moonIllum?: number;
  moonGlyph?: string;
  inBestBlock?: boolean;
  isPeakHour?: boolean;
}

export interface BestObservingWindow {
  startHour: number;
  endHour: number;
  startLabel: string;
  endLabel: string;
  durationHours: number;
  avgCloud: number;
  avgScore: number;
  peakHour: ObservingHour;
  // Backwards compatibility properties (matching previous ObservingHour interface usage)
  hr: number;
  cloud: number;
  label: string;
}

export type VerdictCode = 'clear' | 'partly_cloudy' | 'mostly_cloudy' | 'overcast';

export interface ObservingForecast {
  hourlyWindow: ObservingHour[];
  avgCloud: number;
  bestWindow: BestObservingWindow | null;
  currentTempC: number;
  currentTempF: number;
  minTempC: number;
  minTempF: number;
  maxTempC: number;
  maxTempF: number;
  feelsLikeC: number;
  feelsLikeF: number;
  dewPointC: number;
  dewPointF: number;
  dewRisk: 'low' | 'moderate' | 'high';
  dewRiskLabel: string;
  windSpeedMph: number;
  windSpeedKmh: number;
  verdictCode: VerdictCode;
  verdict: string;
  verdictEmoji: string;
  verdictAccent: string;
  observingDateLabel: string;
  lastUpdated: Date;
  rawTimezone: string;
}

export interface GeocodingResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
}

function pad2(num: number): string {
  return num < 10 ? '0' + num : String(num);
}

export function calculateHourStargazingScore(
  cloud: number,
  sunAlt: number,
  moonAlt: number,
  moonIllum: number,
  tempC: number,
  dewPointC: number,
  windSpeedMph: number,
  utcItemMs: number,
  solarMidnightMs: number = 0
): number {
  // 1. Cloud Cover Score (0 - 100)
  let cloudScore = 0;
  if (cloud <= 10) cloudScore = 100 - cloud * 0.5;
  else if (cloud <= 35) cloudScore = 95 - (cloud - 10) * 1.5;
  else if (cloud <= 65) cloudScore = 57.5 - (cloud - 35) * 1.3;
  else cloudScore = Math.max(0, 18.5 - (cloud - 65) * 0.5);

  // 2. Solar Altitude / Darkness Factor
  // True astronomical darkness: sunAlt <= -18° (multiplier 1.0)
  // Astronomical twilight: -18° < sunAlt <= -12° (multiplier 0.55 - 1.0)
  // Nautical twilight: -12° < sunAlt <= -6° (multiplier 0.15 - 0.55)
  // Civil twilight / Daylight: sunAlt > -6° (multiplier 0.02)
  let darknessFactor = 1.0;
  if (sunAlt <= -18) {
    darknessFactor = 1.0;
  } else if (sunAlt <= -12) {
    darknessFactor = 0.55 + 0.45 * (-12 - sunAlt) / 6;
  } else if (sunAlt <= -6) {
    darknessFactor = 0.15 + 0.35 * (-6 - sunAlt) / 6;
  } else {
    darknessFactor = 0.02;
  }

  // 3. Lunar Interference (Moon Altitude & Phase Illumination)
  let lunarFactor = 1.0;
  if (moonAlt > 0) {
    const illumFrac = Math.max(0, Math.min(1, moonIllum / 100));
    const altFrac = Math.sin(Math.max(0, Math.min(90, moonAlt)) * Math.PI / 180);
    lunarFactor = Math.max(0.4, 1.0 - 0.55 * (illumFrac * altFrac));
  }

  // 4. Dew & Wind Stability
  let bonus = 0;
  const dewDepression = tempC - dewPointC;
  if (dewDepression >= 3.5) bonus += 2.5;
  else if (dewDepression <= 1.5) bonus -= 4;

  if (windSpeedMph <= 8) bonus += 2;
  else if (windSpeedMph >= 18) bonus -= 4;

  // 5. Deep Midnight / Nadir Tie-Breaker
  if (solarMidnightMs > 0) {
    const hoursFromMidnight = Math.abs(utcItemMs - solarMidnightMs) / 3600000;
    bonus += Math.max(0, 4 - hoursFromMidnight * 0.8);
  }

  const base = cloudScore * darknessFactor * lunarFactor;
  return Math.max(0, Math.min(100, Math.round((base + bonus) * 10) / 10));
}

export function findBestObservingWindow(
  hours: ObservingHour[],
  solarMidnightMs: number = 0
): BestObservingWindow | null {
  if (!hours || hours.length === 0) return null;

  const getContiguousBlocks = (predicate: (h: ObservingHour) => boolean): ObservingHour[][] => {
    const blocks: ObservingHour[][] = [];
    let current: ObservingHour[] = [];
    for (const h of hours) {
      if (predicate(h)) {
        current.push(h);
      } else {
        if (current.length > 0) {
          blocks.push(current);
          current = [];
        }
      }
    }
    if (current.length > 0) blocks.push(current);
    return blocks;
  };

  // Tier 1: Pristine Dark Sky Window
  // - Astronomical darkness: sunAlt <= -14° (or isDarkSky)
  // - Cloud cover <= 30%
  // - Moon is down or non-interfering: moonAlt <= 5° or moonIllum <= 35%
  let blocks = getContiguousBlocks(h => {
    const sunOk = (h.sunAlt !== undefined ? h.sunAlt <= -14 : h.isDarkSky);
    const cloudOk = h.cloud <= 30;
    const moonOk = h.moonAlt === undefined || h.moonAlt <= 5 || (h.moonIllum !== undefined && h.moonIllum <= 35);
    return sunOk && cloudOk && moonOk;
  });

  // Tier 2: Good Dark Sky Window (allow moon up if clouds are clear)
  if (blocks.length === 0) {
    blocks = getContiguousBlocks(h => {
      const sunOk = (h.sunAlt !== undefined ? h.sunAlt <= -12 : h.isDarkSky);
      const cloudOk = h.cloud <= 40;
      return sunOk && cloudOk;
    });
  }

  // Tier 3: Workable Window (partly cloudy or polar summer twilight)
  if (blocks.length === 0) {
    const minCloud = Math.min(...hours.map(h => h.cloud));
    const relaxedCloud = Math.min(80, minCloud + 25);
    blocks = getContiguousBlocks(h => {
      const sunOk = h.sunAlt !== undefined ? h.sunAlt <= -6 : true;
      const cloudOk = h.cloud <= relaxedCloud;
      return sunOk && cloudOk;
    });
  }

  // Fallback: entire hourly window
  if (blocks.length === 0) {
    blocks = [hours];
  }

  // Rank candidate blocks
  const ranked = blocks.map(block => {
    const duration = block.length;
    const avgScore = Math.round(block.reduce((sum, h) => sum + (h.score ?? 50), 0) / duration);
    const avgCloud = Math.round(block.reduce((sum, h) => sum + h.cloud, 0) / duration);

    // Peak hour within block: highest score, tie-breaker lowest cloud and deepest solar altitude
    const peakHour = block.reduce((best, h) => {
      if (!best) return h;
      const hScore = h.score ?? 0;
      const bestScore = best.score ?? 0;
      if (hScore > bestScore) return h;
      if (hScore < bestScore) return best;
      if (h.cloud < best.cloud) return h;
      if (h.cloud > best.cloud) return best;
      if (solarMidnightMs > 0 && h.sunAlt !== undefined && best.sunAlt !== undefined) {
        if (h.sunAlt < best.sunAlt) return h;
      }
      return best;
    }, block[0]);

    // Rank metric: average score with logarithmic duration bonus (rewards continuous sessions)
    const durationMultiplier = 1 + Math.log2(Math.max(1, duration)) * 0.15;
    const rankMetric = avgScore * durationMultiplier;

    return {
      block,
      startHour: block[0].hr,
      endHour: block[block.length - 1].hr,
      startLabel: block[0].label,
      endLabel: block[block.length - 1].label,
      durationHours: duration,
      avgCloud,
      avgScore,
      peakHour,
      rankMetric
    };
  });

  ranked.sort((a, b) => b.rankMetric - a.rankMetric);
  const best = ranked[0];

  // Mark inBestBlock and isPeakHour on the hours array
  const bestBlockSet = new Set(best.block);
  for (const h of hours) {
    h.inBestBlock = bestBlockSet.has(h);
    h.isPeakHour = h.hr === best.peakHour.hr;
  }

  const label = best.durationHours === 1
    ? best.startLabel
    : `${best.startLabel} – ${best.endLabel}`;

  return {
    startHour: best.startHour,
    endHour: best.endHour,
    startLabel: best.startLabel,
    endLabel: best.endLabel,
    durationHours: best.durationHours,
    avgCloud: best.avgCloud,
    avgScore: best.avgScore,
    peakHour: best.peakHour,
    hr: best.peakHour.hr,
    cloud: best.peakHour.cloud,
    label
  };
}

export async function fetchCloudForecast(
  lat: number,
  lon: number,
  refDate: Date = new Date()
): Promise<ObservingForecast> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=cloud_cover,temperature_2m,apparent_temperature,dew_point_2m,wind_speed_10m&timezone=auto&forecast_days=2&past_days=1`;

  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Weather service returned HTTP ${resp.status}`);
  }

  const data = await resp.json();
  return parseCloudPayload(data, lat, lon, refDate);
}

export interface OpenMeteoForecastPayload {
  utc_offset_seconds?: number;
  timezone?: string;
  hourly?: {
    time?: string[];
    cloud_cover?: number[];
    temperature_2m?: number[];
    apparent_temperature?: number[];
    dew_point_2m?: number[];
    wind_speed_10m?: number[];
  };
}

export function parseCloudPayload(
  data: OpenMeteoForecastPayload | null | undefined,
  lat: number,
  lon: number,
  refDate: Date = new Date()
): ObservingForecast {
  if (!data?.hourly?.time || !data?.hourly?.cloud_cover) {
    throw new Error('Malformed Open-Meteo payload');
  }

  const times: string[] = data.hourly.time;
  const clouds: number[] = data.hourly.cloud_cover;
  const temps: number[] = data.hourly.temperature_2m || [];
  const feels: number[] = data.hourly.apparent_temperature || [];
  const dewPoints: number[] = data.hourly.dew_point_2m || [];
  const winds: number[] = data.hourly.wind_speed_10m || [];
  const utcOffsetSec: number = typeof data.utc_offset_seconds === 'number' ? data.utc_offset_seconds : (lat && lon ? Math.round(lon / 15) * 3600 : 0);
  const tzOffsetMs = utcOffsetSec * 1000;

  // Evening date anchor
  let eveDate = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate(), 12, 0, 0);
  if (refDate.getHours() < 6) {
    eveDate = new Date(eveDate.getTime() - 24 * 3600000);
  }
  const mornDate = new Date(eveDate.getTime() + 24 * 3600000);

  let targetEve = `${eveDate.getFullYear()}-${pad2(eveDate.getMonth() + 1)}-${pad2(eveDate.getDate())}`;
  let targetMorn = `${mornDate.getFullYear()}-${pad2(mornDate.getMonth() + 1)}-${pad2(mornDate.getDate())}`;

  // If payload dates differ from refDate (e.g. cached or mock), anchor to first payload date
  const hasTarget = times.some(t => t.slice(0, 10) === targetEve);
  if (!hasTarget && times.length > 0) {
    const firstDate = times[0].slice(0, 10);
    const parts = firstDate.split('-');
    if (parts.length === 3) {
      eveDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0, 0);
      const mDate = new Date(eveDate.getTime() + 24 * 3600000);
      targetEve = firstDate;
      targetMorn = `${mDate.getFullYear()}-${pad2(mDate.getMonth() + 1)}-${pad2(mDate.getDate())}`;
    }
  }

  // Determine local twilight events
  const sun = calculateSunEvents(eveDate, lat, lon);
  const solarMidnightMs = (sun && sun.sunset && sun.sunrise)
    ? (sun.sunset.getTime() + sun.sunrise.getTime()) / 2
    : 0;

  let startHr = 19;
  let endHr = 6;

  if (sun && sun.sunset && sun.sunrise) {
    const localSunset = new Date(sun.sunset.getTime() + tzOffsetMs);
    const localSunrise = new Date(sun.sunrise.getTime() + tzOffsetMs);
    startHr = localSunset.getUTCHours() + (localSunset.getUTCMinutes() >= 30 ? 1 : 0);
    endHr = localSunrise.getUTCHours() - (localSunrise.getUTCMinutes() <= 30 ? 1 : 0);
    if (startHr < 17) startHr = 17;
    if (startHr > 22) startHr = 21;
    if (endHr < 4) endHr = 4;
    if (endHr > 8) endHr = 7;
  }

  const win: ObservingHour[] = [];
  for (let k = 0; k < times.length; k++) {
    const itemDate = times[k].slice(0, 10);
    const hr = parseInt(times[k].slice(11, 13), 10);

    if ((itemDate === targetEve && hr >= startHr) || (itemDate === targetMorn && hr <= endHr)) {
      const localEpochMs = Date.UTC(
        hr >= 12 ? eveDate.getFullYear() : mornDate.getFullYear(),
        hr >= 12 ? eveDate.getMonth() : mornDate.getMonth(),
        hr >= 12 ? eveDate.getDate() : mornDate.getDate(),
        hr, 0, 0
      );
      const utcItemMs = localEpochMs - tzOffsetMs;
      const isDarkSky = (sun && sun.astroDusk && sun.astroDawn)
        ? (utcItemMs >= sun.astroDusk.getTime() && utcItemMs <= sun.astroDawn.getTime())
        : false;

      const itemDateObj = new Date(utcItemMs);
      const sunAlt = Math.round(solarAltitude(itemDateObj, lat, lon) * 10) / 10;
      const moonAlt = Math.round(lunarAltitude(itemDateObj, lat, lon) * 10) / 10;
      const moonInfo = calculateMoonInfo(itemDateObj, lat, lon);
      const moonIllum = moonInfo.illum;

      const cloud = clouds[k] ?? 0;
      const rawTempC = temps[k] !== undefined ? temps[k] : 15;
      const tempC = Math.round(rawTempC);
      const tempF = Math.round(rawTempC * 9 / 5 + 32);

      const rawFeelsC = feels[k] !== undefined ? feels[k] : rawTempC;
      const feelsLikeC = Math.round(rawFeelsC);
      const feelsLikeF = Math.round(rawFeelsC * 9 / 5 + 32);

      const rawDewC = dewPoints[k] !== undefined ? dewPoints[k] : (rawTempC - 4);
      const dewPointC = Math.round(rawDewC);
      const dewPointF = Math.round(rawDewC * 9 / 5 + 32);

      const rawWindKmh = winds[k] !== undefined ? winds[k] : 5;
      const windSpeedKmh = Math.round(rawWindKmh);
      const windSpeedMph = Math.round(rawWindKmh * 0.621371);

      const score = calculateHourStargazingScore(
        cloud,
        sunAlt,
        moonAlt,
        moonIllum,
        tempC,
        dewPointC,
        windSpeedMph,
        utcItemMs,
        solarMidnightMs
      );

      win.push({
        hr,
        cloud,
        clarity: Math.max(0, 100 - cloud),
        tempC,
        tempF,
        feelsLikeC,
        feelsLikeF,
        dewPointC,
        dewPointF,
        windSpeedMph,
        windSpeedKmh,
        label: formatHour(hr),
        labelCompact: formatHourCompact(hr),
        isDarkSky,
        score,
        sunAlt,
        moonAlt,
        moonIllum,
        moonGlyph: moonInfo.glyph
      });
    }
  }

  if (win.length === 0) {
    // Fallback: take next 8 hours if alignment fails
    for (let k = 0; k < Math.min(8, times.length); k++) {
      const hr = parseInt(times[k].slice(11, 13), 10);
      const fallbackEpochMs = refDate.getTime() + k * 3600000;
      const fallbackDate = new Date(fallbackEpochMs);
      const sunAlt = Math.round(solarAltitude(fallbackDate, lat, lon) * 10) / 10;
      const moonAlt = Math.round(lunarAltitude(fallbackDate, lat, lon) * 10) / 10;
      const moonInfo = calculateMoonInfo(fallbackDate, lat, lon);
      const moonIllum = moonInfo.illum;
      const isDarkSky = sunAlt <= -18;

      const cloud = clouds[k] ?? 0;
      const rawTempC = temps[k] !== undefined ? temps[k] : 15;
      const tempC = Math.round(rawTempC);
      const tempF = Math.round(rawTempC * 9 / 5 + 32);

      const rawFeelsC = feels[k] !== undefined ? feels[k] : rawTempC;
      const feelsLikeC = Math.round(rawFeelsC);
      const feelsLikeF = Math.round(rawFeelsC * 9 / 5 + 32);

      const rawDewC = dewPoints[k] !== undefined ? dewPoints[k] : (rawTempC - 4);
      const dewPointC = Math.round(rawDewC);
      const dewPointF = Math.round(rawDewC * 9 / 5 + 32);

      const rawWindKmh = winds[k] !== undefined ? winds[k] : 5;
      const windSpeedKmh = Math.round(rawWindKmh);
      const windSpeedMph = Math.round(rawWindKmh * 0.621371);

      const score = calculateHourStargazingScore(
        cloud,
        sunAlt,
        moonAlt,
        moonIllum,
        tempC,
        dewPointC,
        windSpeedMph,
        fallbackEpochMs,
        solarMidnightMs
      );

      win.push({
        hr,
        cloud,
        clarity: Math.max(0, 100 - cloud),
        tempC,
        tempF,
        feelsLikeC,
        feelsLikeF,
        dewPointC,
        dewPointF,
        windSpeedMph,
        windSpeedKmh,
        label: formatHour(hr),
        labelCompact: formatHourCompact(hr),
        isDarkSky,
        score,
        sunAlt,
        moonAlt,
        moonIllum,
        moonGlyph: moonInfo.glyph
      });
    }
  }

  // Find best contiguous observing window with astronomical scoring
  const bestWindow = findBestObservingWindow(win, solarMidnightMs);

  // Calculate statistics
  let sum = 0;
  let minTempC = win[0]?.tempC ?? 15;
  let minTempF = win[0]?.tempF ?? 59;
  let maxTempC = win[0]?.tempC ?? 15;
  let maxTempF = win[0]?.tempF ?? 59;
  let minDewDepression = 999;

  for (let m = 0; m < win.length; m++) {
    sum += win[m].cloud;
    if (win[m].tempC < minTempC) {
      minTempC = win[m].tempC;
      minTempF = win[m].tempF;
    }
    if (win[m].tempC > maxTempC) {
      maxTempC = win[m].tempC;
      maxTempF = win[m].tempF;
    }
    const depression = win[m].tempC - win[m].dewPointC;
    if (depression < minDewDepression) {
      minDewDepression = depression;
    }
  }

  let dewRisk: 'low' | 'moderate' | 'high' = 'low';
  let dewRiskLabel = 'Low (Dry air)';
  if (minDewDepression <= 1.5) {
    dewRisk = 'high';
    dewRiskLabel = minTempC <= 0 ? 'High Frost Risk (Heater essential)' : 'High Dew Risk (Dew heater recommended)';
  } else if (minDewDepression <= 3.5) {
    dewRisk = 'moderate';
    dewRiskLabel = 'Moderate (Dew shield advised)';
  }

  const currentHour = win[0] || {
    tempC: 15,
    tempF: 59,
    feelsLikeC: 15,
    feelsLikeF: 59,
    dewPointC: 10,
    dewPointF: 50,
    windSpeedMph: 5,
    windSpeedKmh: 8
  };

  const avgCloud = Math.round(sum / (win.length || 1));
  let verdictCode: VerdictCode = 'clear';
  let verdict = "Clear — great for observing";
  let verdictEmoji = "🌟";
  let verdictAccent = "#3fb950"; // Green / Success

  if (avgCloud <= 25) {
    verdictCode = 'clear';
    verdict = "Clear — great for observing";
    verdictEmoji = "🌟";
    verdictAccent = "#3fb950";
  } else if (avgCloud <= 55) {
    verdictCode = 'partly_cloudy';
    verdict = "Partly cloudy — gaps to peek through";
    verdictEmoji = "⛅";
    verdictAccent = "#58a6ff"; // Blue
  } else if (avgCloud <= 80) {
    verdictCode = 'mostly_cloudy';
    verdict = "Mostly cloudy — limited windows";
    verdictEmoji = "🌥️";
    verdictAccent = "#d29922"; // Yellow/Gold
  } else {
    verdictCode = 'overcast';
    verdict = "Overcast — skywatching unlikely";
    verdictEmoji = "☁️";
    verdictAccent = "#f85149"; // Red
  }

  const todayRef = `${refDate.getFullYear()}-${pad2(refDate.getMonth() + 1)}-${pad2(refDate.getDate())}`;
  const dayFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  let observingDateLabel = dayFmt.format(eveDate);
  if (targetEve === todayRef || refDate.getHours() < 6) {
    observingDateLabel = `Tonight (${dayFmt.format(eveDate)})`;
  }

  return {
    hourlyWindow: win,
    avgCloud,
    bestWindow,
    currentTempC: currentHour.tempC,
    currentTempF: currentHour.tempF,
    minTempC,
    minTempF,
    maxTempC,
    maxTempF,
    feelsLikeC: currentHour.feelsLikeC,
    feelsLikeF: currentHour.feelsLikeF,
    dewPointC: currentHour.dewPointC,
    dewPointF: currentHour.dewPointF,
    dewRisk,
    dewRiskLabel,
    windSpeedMph: currentHour.windSpeedMph,
    windSpeedKmh: currentHour.windSpeedKmh,
    verdictCode,
    verdict,
    verdictEmoji,
    verdictAccent,
    observingDateLabel,
    lastUpdated: new Date(),
    rawTimezone: data.timezone || 'UTC'
  };
}

interface OpenMeteoGeocodingItem {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
}

export async function searchCities(query: string): Promise<GeocodingResult[]> {
  if (!query || query.trim().length < 2) return [];
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=5&language=en&format=json`;

  const resp = await fetch(url);
  if (!resp.ok) return [];
  const data: { results?: OpenMeteoGeocodingItem[] } = await resp.json();
  return (data.results || []).map((r) => ({
    id: r.id,
    name: r.name,
    latitude: r.latitude,
    longitude: r.longitude,
    country: r.country,
    admin1: r.admin1
  }));
}
