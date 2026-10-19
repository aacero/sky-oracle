/**
 * Weather & Stargazing Clarity Engine
 * 
 * Integrates with Open-Meteo for keyless, CORS-enabled cloud cover forecasts.
 * Extracts dynamic dark-sky observing window (post-sunset through pre-sunrise).
 */

import { calculateSunEvents, formatHour, formatHourCompact } from './astronomy.ts';

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
}

export interface ObservingForecast {
  hourlyWindow: ObservingHour[];
  avgCloud: number;
  bestWindow: ObservingHour | null;
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

export function parseCloudPayload(
  data: any,
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
        isDarkSky
      });
    }
  }

  if (win.length === 0) {
    // Fallback: take next 8 hours if alignment fails
    for (let k = 0; k < Math.min(8, times.length); k++) {
      const hr = parseInt(times[k].slice(11, 13), 10);
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
        isDarkSky: false
      });
    }
  }

  // Calculate statistics
  let sum = 0;
  let best = win[0];
  let minTempC = win[0]?.tempC ?? 15;
  let minTempF = win[0]?.tempF ?? 59;
  let maxTempC = win[0]?.tempC ?? 15;
  let maxTempF = win[0]?.tempF ?? 59;
  let minDewDepression = 999;

  for (let m = 0; m < win.length; m++) {
    sum += win[m].cloud;
    if (win[m].cloud < best.cloud) {
      best = win[m];
    }
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
  let verdict = "Clear — great for observing";
  let verdictEmoji = "🌟";
  let verdictAccent = "#3fb950"; // Green / Success

  if (avgCloud <= 25) {
    verdict = "Clear — great for observing";
    verdictEmoji = "🌟";
    verdictAccent = "#3fb950";
  } else if (avgCloud <= 55) {
    verdict = "Partly cloudy — gaps to peek through";
    verdictEmoji = "⛅";
    verdictAccent = "#58a6ff"; // Blue
  } else if (avgCloud <= 80) {
    verdict = "Mostly cloudy — limited windows";
    verdictEmoji = "🌥️";
    verdictAccent = "#d29922"; // Yellow/Gold
  } else {
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
    bestWindow: best,
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
    verdict,
    verdictEmoji,
    verdictAccent,
    observingDateLabel,
    lastUpdated: new Date(),
    rawTimezone: data.timezone || 'UTC'
  };
}

export async function searchCities(query: string): Promise<GeocodingResult[]> {
  if (!query || query.trim().length < 2) return [];
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=5&language=en&format=json`;

  const resp = await fetch(url);
  if (!resp.ok) return [];
  const data = await resp.json();
  return (data.results || []).map((r: any) => ({
    id: r.id,
    name: r.name,
    latitude: r.latitude,
    longitude: r.longitude,
    country: r.country,
    admin1: r.admin1
  }));
}
