import { describe, it, expect } from 'vitest';
import {
  MAJOR_METEOR_SHOWERS,
  getShowerDates,
  calculateRadiantAltitude,
  getMeteorShowerData
} from './meteors.ts';

describe('Meteor Shower Engine', () => {
  it('contains all 11 major annual meteor showers', () => {
    expect(MAJOR_METEOR_SHOWERS.length).toBe(11);
    const codes = MAJOR_METEOR_SHOWERS.map(s => s.iauCode);
    expect(codes).toContain('QUA');
    expect(codes).toContain('LYR');
    expect(codes).toContain('ETA');
    expect(codes).toContain('PER');
    expect(codes).toContain('GEM');
    expect(codes).toContain('LEO');
  });

  it('correctly handles year boundary wraparound for Quadrantids', () => {
    const quad = MAJOR_METEOR_SHOWERS.find(s => s.id === 'quadrantids')!;
    const refLateDec = new Date(Date.UTC(2026, 11, 30, 20, 0, 0)); // Dec 30, 2026
    const dates = getShowerDates(quad, refLateDec);

    expect(dates.startDate.getUTCFullYear()).toBe(2026);
    expect(dates.startDate.getUTCMonth()).toBe(11); // December
    expect(dates.endDate.getUTCFullYear()).toBe(2027);
    expect(dates.endDate.getUTCMonth()).toBe(0); // January
    expect(dates.peakDate.getUTCFullYear()).toBe(2027);
    expect(dates.peakDate.getUTCDate()).toBe(4);
  });

  it('calculates radiant altitude accurately', () => {
    // Perseids radiant (RA=46°, Dec=+58°) from latitude 40°N
    const ref = new Date(Date.UTC(2026, 7, 12, 6, 0, 0));
    const alt = calculateRadiantAltitude(46, 58, ref, 40, -75);
    expect(alt).toBeGreaterThan(0);
    expect(alt).toBeLessThanOrEqual(90);
  });

  it('detects Southern Taurids peak on Nov 4/5', () => {
    const nov4 = new Date('2026-11-04T22:00:00Z');
    const data = getMeteorShowerData(nov4, 29.9, -81.3, 22, false);

    expect(data.primaryShower).not.toBeNull();
    expect(data.primaryShower?.shower.id).toBe('southern_taurids');
    expect(data.primaryShower?.isPeakTonight).toBe(true);
    expect(data.primaryShower?.estimatedZhrTonight).toBeGreaterThanOrEqual(8);
  });

  it('detects Perseids peak in mid-August', () => {
    const aug12 = new Date('2026-08-12T22:00:00Z');
    const data = getMeteorShowerData(aug12, 35.0, -111.0, 10, false);

    expect(data.primaryShower).not.toBeNull();
    expect(data.primaryShower?.shower.id).toBe('perseids');
    expect(data.primaryShower?.isPeakTonight).toBe(true);
    expect(data.primaryShower?.estimatedZhrTonight).toBeGreaterThanOrEqual(90);
  });

  it('handles quiet season gracefully with next upcoming shower', () => {
    const feb15 = new Date('2026-02-15T22:00:00Z');
    const data = getMeteorShowerData(feb15, 30.0, -80.0, 50, false);

    expect(data.primaryShower).toBeNull();
    expect(data.nextUpcomingShower).not.toBeNull();
    expect(data.nextUpcomingShower?.shower.id).toBe('lyrids');
    expect(data.nextUpcomingShower?.daysUntilPeak).toBeGreaterThan(50);
  });

  it('computes lunar interference levels correctly', () => {
    const nov4 = new Date('2026-11-04T22:00:00Z');

    // Case 1: Moon down
    const darkSky = getMeteorShowerData(nov4, 29.9, -81.3, 85, false);
    expect(darkSky.primaryShower?.moonImpact.level).toBe('minimal');

    // Case 2: Bright moon up
    const brightMoon = getMeteorShowerData(nov4, 29.9, -81.3, 85, true);
    expect(brightMoon.primaryShower?.moonImpact.level).toBe('heavy');

    // Case 3: Moderate crescent moon up
    const crescentMoon = getMeteorShowerData(nov4, 29.9, -81.3, 40, true);
    expect(crescentMoon.primaryShower?.moonImpact.level).toBe('moderate');
  });
});
