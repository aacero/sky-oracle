import { formatTime, MoonInfo, PlanetInfo } from '../core/astronomy.ts';
import { ObservingForecast } from '../core/weather.ts';
import { t, formatLocalizedDate, TranslationKey } from '../core/i18n.ts';

const MOON_PHASE_KEYS: Record<string, TranslationKey> = {
  'New Moon': 'moon.phase.new_moon',
  'Waxing Crescent': 'moon.phase.waxing_crescent',
  'First Quarter': 'moon.phase.first_quarter',
  'Waxing Gibbous': 'moon.phase.waxing_gibbous',
  'Full Moon': 'moon.phase.full_moon',
  'Waning Gibbous': 'moon.phase.waning_gibbous',
  'Last Quarter': 'moon.phase.last_quarter',
  'Waning Crescent': 'moon.phase.waning_crescent'
};

const PLANET_NAME_KEYS: Record<string, TranslationKey> = {
  sun: 'planets.sun',
  moon: 'planets.moon',
  mercury: 'planets.mercury',
  venus: 'planets.venus',
  mars: 'planets.mars',
  jupiter: 'planets.jupiter',
  saturn: 'planets.saturn',
  uranus: 'planets.uranus',
  neptune: 'planets.neptune'
};

export function getLocalizedPlanetName(key: string, fallbackName: string): string {
  const k = PLANET_NAME_KEYS[key];
  return k ? t(k) : fallbackName;
}

export function getLocalizedVerdict(f?: ObservingForecast | null): string {
  if (!f) return t('verdict.clear');
  switch (f.verdictCode) {
    case 'clear':
      return t('verdict.clear');
    case 'partly_cloudy':
      return t('verdict.partly_cloudy');
    case 'mostly_cloudy':
      return t('verdict.mostly_cloudy');
    case 'overcast':
      return t('verdict.overcast');
  }
  return f.verdict || t('verdict.clear');
}

export function getLocalizedDewRisk(f?: ObservingForecast | null): string {
  if (!f) return t('weather.dew_low');
  if (f.dewRisk === 'high') {
    return f.minTempC <= 0 ? t('weather.dew_frost') : t('weather.dew_high');
  }
  if (f.dewRisk === 'moderate') {
    return t('weather.dew_moderate');
  }
  return t('weather.dew_low');
}

export function getLocalizedMoonPhase(name?: string): string {
  if (!name) return t('moon.phase.waxing_crescent');
  const key = MOON_PHASE_KEYS[name] || 'moon.phase.waxing_crescent';
  return t(key);
}

export function getLocalizedMoonDirection(dir?: string): string {
  return dir === 'Waning' ? t('moon.waning') : t('moon.waxing');
}

export function isPrimePlanetTarget(p: PlanetInfo, moon?: MoonInfo | null): boolean {
  if (p.key === 'moon') return moon?.isUp ?? false;
  if (p.visibilityCode) {
    return p.visibilityCode === 'up_all_night' || p.visibilityCode === 'evening';
  }
  return p.status.includes('Up all night') || p.status.includes('Evening');
}

export function formatLocalizedPlanetStatus(p: PlanetInfo, moon?: MoonInfo | null): string {
  if (p.visibilityCode === 'solar' || p.key === 'sun') {
    return t('planets.daylight_solar');
  }
  if (p.visibilityCode === 'moon' || p.key === 'moon') {
    if (moon) {
      return `${getLocalizedMoonPhase(moon.name)} · ${t('moon.lit', { pct: moon.illum })}`;
    }
  }
  switch (p.visibilityCode) {
    case 'up_all_night':
      return t('planets.up_all_night');
    case 'below_horizon':
      return t('planets.below_horizon');
    case 'circumpolar':
      return t('planets.circumpolar');
    case 'evening':
      return t('planets.evening_sets', { time: p.set ? formatTime(p.set) : '' });
    case 'morning':
      return t('planets.morning_rises', { time: p.rise ? formatTime(p.rise) : '' });
    case 'sets_only':
      return t('planets.sets_at', { time: p.set ? formatTime(p.set) : '' });
  }
  return p.status;
}

export function getLocalizedObservingDate(f: ObservingForecast | null | undefined, currentDate: Date): string {
  if (!f) return '';
  const dayFmt = formatLocalizedDate(currentDate);
  if (f.observingDateLabel.startsWith('Tonight')) {
    return t('verdict.tonight', { date: dayFmt });
  }
  return dayFmt;
}

/**
 * Map Moon altitude in degrees to Y coordinate (0-100 scale, with Horizon at 65)
 */
export function getMoonAltitudeY(alt: number): number {
  if (alt >= 0) {
    // 0° is at Y=65, +90° is at Y=14
    return 65 - (Math.min(90, alt) / 90) * 51;
  } else {
    // 0° is at Y=65, -60° is at Y=90
    return 65 + (Math.min(60, Math.abs(alt)) / 60) * 25;
  }
}

/**
 * Generate a smooth Catmull-Rom cubic Bezier SVG path through the given coordinates
 */
export function generateSmoothCurvePath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

    // Catmull-Rom to Cubic Bezier conversion
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}
