import { describe, it, expect } from 'vitest';
import {
  projectCoordinates,
  getStarsInField,
  bvToColor,
  formatRa,
  formatDec,
  calculateLmst,
  computeHorizonParams,
  computeGroundPolygonAndHorizon
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

  describe('Local Sidereal Time & Horizon Coordinates', () => {
    it('calculates LMST within [0, 360) and shifts correctly with longitude', () => {
      const date = new Date('2026-10-25T12:00:00Z');
      const lmst0 = calculateLmst(date, 0);
      const lmst60 = calculateLmst(date, 60);

      expect(lmst0).toBeGreaterThanOrEqual(0);
      expect(lmst0).toBeLessThan(360);
      expect(lmst60).toBeGreaterThanOrEqual(0);
      expect(lmst60).toBeLessThan(360);

      // 60 degrees longitude east increases LMST by exactly 60 degrees (modulo 360)
      const diff = (lmst60 - lmst0 + 360) % 360;
      expect(Math.abs(diff - 60)).toBeLessThan(1e-4);
    });

    it('computes horizon parameters with zenith planet altitude ~90° and nadir ~-90°', () => {
      const date = new Date('2026-10-25T12:00:00Z');
      const lat = 35.0; // Observer at +35°
      const lon = 0.0;
      const lmst = calculateLmst(date, lon);

      // Planet at Zenith: RA = LMST, Dec = lat
      const zenithParams = computeHorizonParams(lat, lon, date, lmst, lat);
      expect(zenithParams.c0).toBeCloseTo(1.0, 4);
      expect(zenithParams.planetAltDeg).toBeCloseTo(90.0, 2);

      // Planet at Nadir: RA = (LMST + 180) % 360, Dec = -lat
      const nadirParams = computeHorizonParams(lat, lon, date, (lmst + 180) % 360, -lat);
      expect(nadirParams.c0).toBeCloseTo(-1.0, 4);
      expect(nadirParams.planetAltDeg).toBeCloseTo(-90.0, 2);
    });
  });

  describe('Ground Polygon & Horizon Line Geometry', () => {
    const W = 360;
    const H = 360;
    const scaleX = 180 / Math.tan((5 * Math.PI) / 180);
    const scaleY = scaleX;

    it('identifies all-sky view when altitude is high above horizon', () => {
      // Planet at +30° altitude (c0 = sin(30°) = 0.5)
      const geom = computeGroundPolygonAndHorizon(0.5, 0, 0.8, W, H, scaleX, scaleY, false);
      expect(geom.allSky).toBe(true);
      expect(geom.allGround).toBe(false);
      expect(geom.horizonLine).toBeNull();
      expect(geom.groundVertices.length).toBe(0);
    });

    it('identifies all-ground view when planet is far below horizon', () => {
      // Planet at -30° altitude (c0 = sin(-30°) = -0.5)
      const geom = computeGroundPolygonAndHorizon(-0.5, 0, 0.8, W, H, scaleX, scaleY, false);
      expect(geom.allGround).toBe(true);
      expect(geom.allSky).toBe(false);
      expect(geom.horizonLine).toBeNull();
      expect(geom.groundVertices.length).toBe(4);
    });

    it('computes exact horizon line and ground polygon when horizon cuts through center', () => {
      // Center on horizon: c0 = 0, north gradient cy = 1.0 (sky is North/Up)
      const geom = computeGroundPolygonAndHorizon(0, 0, 1.0, W, H, scaleX, scaleY, false);
      expect(geom.allSky).toBe(false);
      expect(geom.allGround).toBe(false);
      expect(geom.horizonLine).not.toBeNull();

      // Horizon line cuts horizontally through center py = H/2 = 180
      const [I1, I2] = geom.horizonLine!;
      expect(Math.abs(I1.py - 180)).toBeLessThan(1e-4);
      expect(Math.abs(I2.py - 180)).toBeLessThan(1e-4);
      expect([0, W]).toContain(Math.round(I1.px));
      expect([0, W]).toContain(Math.round(I2.px));

      // Ground polygon should cover lower half (py from 180 to 360)
      expect(geom.groundVertices.length).toBe(4);
      for (const v of geom.groundVertices) {
        expect(v.py).toBeGreaterThanOrEqual(179.9);
      }
    });

    it('correctly inverts ground polygon in South-Up mode', () => {
      // When South is Up and sky is North, the ground is now towards the top (py <= 180)
      const geomSouthUp = computeGroundPolygonAndHorizon(0, 0, 1.0, W, H, scaleX, scaleY, true);
      expect(geomSouthUp.horizonLine).not.toBeNull();
      expect(geomSouthUp.groundVertices.length).toBe(4);

      // In South-Up, ground vertices are towards py <= 180
      for (const v of geomSouthUp.groundVertices) {
        expect(v.py).toBeLessThanOrEqual(180.1);
      }
    });
  });

  describe('Southern Hemisphere South-Up & Star Altitude Tagging', () => {
    it('inverts star positions 180° when southUp is true', () => {
      const centerRa = 145.65;
      const centerDec = 14.43;

      const starsNorthUp = getStarsInField(centerRa, centerDec, 10.0, 6.0, 360, 360, false);
      const starsSouthUp = getStarsInField(centerRa, centerDec, 10.0, 6.0, 360, 360, true);

      expect(starsNorthUp.length).toBe(starsSouthUp.length);
      expect(starsNorthUp.length).toBeGreaterThan(0);

      for (let i = 0; i < starsNorthUp.length; i++) {
        const sN = starsNorthUp[i];
        const sS = starsSouthUp[i];

        // 180° rotation around canvas center (180, 180):
        // px_south = 360 - px_north
        // py_south = 360 - py_north
        expect(sS.px + sN.px).toBeCloseTo(360, 4);
        expect(sS.py + sN.py).toBeCloseTo(360, 4);
      }
    });

    it('computes astronomical altitude and marks stars below the horizon', () => {
      const centerRa = 145.65;
      const centerDec = 14.43;
      const date = new Date('2026-10-25T12:00:00Z');
      const lat = 35.1983;
      const lon = -111.6513;

      const stars = getStarsInField(centerRa, centerDec, 10.0, 6.0, 360, 360, false, { lat, lon, date });
      expect(stars.length).toBeGreaterThan(0);

      for (const s of stars) {
        expect(s.alt).toBeDefined();
        expect(typeof s.alt).toBe('number');
        expect(s.isBelowHorizon).toBe(s.alt! < 0);
      }
    });
  });
});
