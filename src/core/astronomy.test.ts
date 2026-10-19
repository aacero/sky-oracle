import { describe, it, expect } from 'vitest';
import {
  solarAltitude,
  calculateSunEvents,
  calculateMoonInfo,
  calculateMoonRiseSet,
  lunarAltitude,
  calculateAllPlanets,
  getConstellation,
  formatHour,
  formatHourCompact,
  formatShortDate
} from './astronomy.ts';

describe('Astronomy Engine', () => {
  const ST_AUGUSTINE = { lat: 29.9012, lon: -81.3124 };
  const EQUINOX_DATE = new Date('2026-09-26T16:00:00.000Z');

  describe('Solar Altitude & Twilight Calculations', () => {
    it('computes realistic solar altitudes', () => {
      // Solar altitude near local noon
      const altNoon = solarAltitude(EQUINOX_DATE, ST_AUGUSTINE.lat, ST_AUGUSTINE.lon);
      expect(altNoon).toBeGreaterThan(50);
      expect(altNoon).toBeLessThan(70);

      // Solar altitude near local midnight
      const midnight = new Date('2026-09-27T04:00:00.000Z');
      const altMidnight = solarAltitude(midnight, ST_AUGUSTINE.lat, ST_AUGUSTINE.lon);
      expect(altMidnight).toBeLessThan(-40);
    });

    it('returns chronological sequence of twilights', () => {
      const events = calculateSunEvents(EQUINOX_DATE, ST_AUGUSTINE.lat, ST_AUGUSTINE.lon);
      expect(events).not.toBeNull();
      if (!events) return;

      expect(events.sunset).not.toBeNull();
      expect(events.civilDusk).not.toBeNull();
      expect(events.nauticalDusk).not.toBeNull();
      expect(events.astroDusk).not.toBeNull();
      expect(events.astroDawn).not.toBeNull();
      expect(events.sunrise).not.toBeNull();

      expect(events.sunset!.getTime()).toBeLessThan(events.civilDusk!.getTime());
      expect(events.civilDusk!.getTime()).toBeLessThan(events.nauticalDusk!.getTime());
      expect(events.nauticalDusk!.getTime()).toBeLessThan(events.astroDusk!.getTime());
      expect(events.astroDusk!.getTime()).toBeLessThan(events.astroDawn!.getTime());
      expect(events.astroDawn!.getTime()).toBeLessThan(events.sunrise!.getTime());

      // Dark sky duration should be between 6 and 12 hours
      const darkSkyDurationHrs = (events.astroDawn!.getTime() - events.astroDusk!.getTime()) / 3600000;
      expect(darkSkyDurationHrs).toBeGreaterThan(6);
      expect(darkSkyDurationHrs).toBeLessThan(12);
    });
  });

  describe('Moon Phase & Illumination', () => {
    it('computes valid moon metrics without coordinates', () => {
      const moon = calculateMoonInfo(EQUINOX_DATE);
      expect(moon.illum).toBeGreaterThanOrEqual(0);
      expect(moon.illum).toBeLessThanOrEqual(100);
      expect(moon.age).toBeGreaterThanOrEqual(0);
      expect(moon.age).toBeLessThanOrEqual(29.6);
      expect(moon.name.length).toBeGreaterThan(0);
      expect(moon.glyph.length).toBeGreaterThan(0);
      expect(moon.cyclePos).toBeGreaterThanOrEqual(0);
      expect(moon.cyclePos).toBeLessThanOrEqual(1);
      expect(['Waxing', 'Waning']).toContain(moon.phaseDirection);
      expect(moon.nextNew).toBeInstanceOf(Date);
      expect(moon.nextFull).toBeInstanceOf(Date);
      expect(moon.nextNew!.getTime()).toBeGreaterThan(EQUINOX_DATE.getTime());
      expect(moon.nextFull!.getTime()).toBeGreaterThan(EQUINOX_DATE.getTime());
      expect(moon.rise).toBeNull();
      expect(moon.set).toBeNull();
    });

    it('computes local moonrise, moonset, and altitude with coordinates', () => {
      const moon = calculateMoonInfo(EQUINOX_DATE, ST_AUGUSTINE.lat, ST_AUGUSTINE.lon);
      expect(moon.altitude).toBeDefined();
      expect(typeof moon.altitude).toBe('number');
      expect(moon.altitude!).toBeGreaterThanOrEqual(-90);
      expect(moon.altitude!).toBeLessThanOrEqual(90);
      expect(typeof moon.isUp).toBe('boolean');

      expect(moon.rise).toBeInstanceOf(Date);
      expect(moon.set).toBeInstanceOf(Date);
      expect(moon.rise!.getTime()).toBeGreaterThanOrEqual(EQUINOX_DATE.getTime());
      expect(moon.set!.getTime()).toBeGreaterThanOrEqual(EQUINOX_DATE.getTime());

      // Next events should be within 36 hours
      const horizonMs = 36 * 3600000;
      expect(moon.rise!.getTime() - EQUINOX_DATE.getTime()).toBeLessThanOrEqual(horizonMs);
      expect(moon.set!.getTime() - EQUINOX_DATE.getTime()).toBeLessThanOrEqual(horizonMs);
    });

    it('computes lunar altitude accurately', () => {
      const alt = lunarAltitude(EQUINOX_DATE, ST_AUGUSTINE.lat, ST_AUGUSTINE.lon);
      expect(alt).toBeGreaterThanOrEqual(-90);
      expect(alt).toBeLessThanOrEqual(90);
    });

    it('directly calculates moon rise and set events', () => {
      const events = calculateMoonRiseSet(EQUINOX_DATE, ST_AUGUSTINE.lat, ST_AUGUSTINE.lon);
      expect(events.rise).toBeInstanceOf(Date);
      expect(events.set).toBeInstanceOf(Date);
    });

    it('formats short dates correctly', () => {
      const testDate = new Date('2026-10-26T12:00:00.000Z');
      const formatted = formatShortDate(testDate, 'UTC');
      expect(formatted).toMatch(/Mon.*Oct.*26/);
      expect(formatShortDate(null)).toBe('—');
    });
  });

  describe('Naked-Eye Planets & Constellations', () => {
    it('computes all 5 classical planets', () => {
      const planets = calculateAllPlanets(EQUINOX_DATE, ST_AUGUSTINE.lat, ST_AUGUSTINE.lon);
      expect(planets.length).toBe(5);

      const keys = planets.map(p => p.key);
      expect(keys).toEqual(['mercury', 'venus', 'mars', 'jupiter', 'saturn']);

      for (const p of planets) {
        expect(p.name).toBeTruthy();
        expect(p.symbol).toBeTruthy();
        expect(p.status).toBeTruthy();
        expect(p.constellation).toBeTruthy();
        expect(p.ecLon).toBeGreaterThanOrEqual(0);
        expect(p.ecLon).toBeLessThan(360);
      }

      // Late September 2026: Saturn is located in Pisces
      const saturn = planets.find(p => p.key === 'saturn')!;
      expect(saturn.constellation).toBe('Pisces');
    });

    it('correctly maps ecliptic longitudes to constellations', () => {
      expect(getConstellation(0).name).toBe('Pisces');
      expect(getConstellation(35).name).toBe('Aries');
      expect(getConstellation(70).name).toBe('Taurus');
      expect(getConstellation(100).name).toBe('Gemini');
      expect(getConstellation(125).name).toBe('Cancer');
      expect(getConstellation(150).name).toBe('Leo');
      expect(getConstellation(190).name).toBe('Virgo');
      expect(getConstellation(230).name).toBe('Libra');
      expect(getConstellation(245).name).toBe('Scorpius');
      expect(getConstellation(255).name).toBe('Ophiuchus');
      expect(getConstellation(280).name).toBe('Sagittarius');
      expect(getConstellation(310).name).toBe('Capricornus');
      expect(getConstellation(340).name).toBe('Aquarius');
    });
  });

  describe('Formatting Helpers', () => {
    it('formats standard and compact hours', () => {
      expect(formatHour(0)).toBe('12 AM');
      expect(formatHour(7)).toBe('7 AM');
      expect(formatHour(12)).toBe('12 PM');
      expect(formatHour(21)).toBe('9 PM');

      expect(formatHourCompact(0)).toBe('12a');
      expect(formatHourCompact(7)).toBe('7a');
      expect(formatHourCompact(12)).toBe('12p');
      expect(formatHourCompact(21)).toBe('9p');
    });
  });
});
