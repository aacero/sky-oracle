import { describe, it, expect } from 'vitest';
import {
  projectCoordinates,
  getStarsInField,
  bvToColor,
  formatRa,
  formatDec
} from './starfield.ts';

describe('Starfield & Ephemeris Projection Engine', () => {
  describe('Formatters', () => {
    it('formats right ascension in hours and minutes', () => {
      expect(formatRa(0)).toBe('00h 00m');
      expect(formatRa(15)).toBe('01h 00m');
      expect(formatRa(145.65)).toMatch(/09h 42m|09h 43m/);
      expect(formatRa(360)).toBe('00h 00m');
    });

    it('formats declination in signed degrees and arcminutes', () => {
      expect(formatDec(0)).toBe('+00° 00\'');
      expect(formatDec(14.43)).toMatch(/\+14° 25\'|\+14° 26\'/);
      expect(formatDec(-20.63)).toMatch(/-20° 37\'|-20° 38\'/);
    });
  });

  describe('Spectral Color Mapping (B-V Index)', () => {
    it('maps hot blue stars to blue-white', () => {
      expect(bvToColor(-0.25)).toBe('#9bb0ff');
    });

    it('maps solar-type stars to warm yellow-white', () => {
      expect(bvToColor(0.65)).toBe('#ffd7a0');
    });

    it('maps cool red giants to reddish-orange', () => {
      expect(bvToColor(1.5)).toBe('#ff9e59');
    });
  });

  describe('Gnomonic Projection', () => {
    it('projects center coordinates to exactly (0, 0)', () => {
      const proj = projectCoordinates(100, 20, 100, 20);
      expect(proj).not.toBeNull();
      expect(Math.abs(proj!.x)).toBeLessThan(1e-6);
      expect(Math.abs(proj!.y)).toBeLessThan(1e-6);
    });

    it('projects an eastern star with positive X and northern star with positive Y', () => {
      const east = projectCoordinates(102, 20, 100, 20);
      expect(east).not.toBeNull();
      expect(east!.x).toBeGreaterThan(0);

      const north = projectCoordinates(100, 22, 100, 20);
      expect(north).not.toBeNull();
      expect(north!.y).toBeGreaterThan(0);
    });

    it('returns null for stars on the opposite hemisphere', () => {
      const opp = projectCoordinates(280, -20, 100, 20);
      expect(opp).toBeNull();
    });
  });

  describe('Field of View Star Filtering', () => {
    it('returns stars within 10x10 deg field around Jupiter (Leo/Cancer region)', () => {
      // RA ~145.65, Dec ~14.43
      const stars = getStarsInField(145.65, 14.43, 10.0, 6.0, 360, 360);
      expect(stars.length).toBeGreaterThanOrEqual(4);
      expect(stars.length).toBeLessThanOrEqual(50);

      // Verify all stars fall inside canvas boundaries
      for (const s of stars) {
        expect(s.px).toBeGreaterThanOrEqual(0);
        expect(s.px).toBeLessThanOrEqual(360);
        expect(s.py).toBeGreaterThanOrEqual(0);
        expect(s.py).toBeLessThanOrEqual(360);
        expect(s.mag).toBeLessThanOrEqual(6.0);
        expect(s.radius).toBeGreaterThan(0);
      }
    });

    it('respects magnitude cutoff', () => {
      const allStars = getStarsInField(145.65, 14.43, 10.0, 6.0, 360, 360);
      const brightStars = getStarsInField(145.65, 14.43, 10.0, 4.0, 360, 360);

      expect(brightStars.length).toBeLessThan(allStars.length);
      for (const s of brightStars) {
        expect(s.mag).toBeLessThanOrEqual(4.0);
      }
    });
  });
});
