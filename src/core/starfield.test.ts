import { describe, it, expect } from 'vitest';
import {
  projectCoordinates,
  getStarsInField,
  bvToColor,
  formatRa,
  formatDec,
  calculateLmst,
  computeHorizonParams,
  computeGroundPolygonAndHorizon,
  angularSeparationDeg,
  getBodiesInField,
  OtherSolarBody,
  calculatePositionAngleDeg,
  formatCompassBearing,
  bvToSpectralClass,
  hitTestStarfield,
  renderStarfield,
  SelectedStarfieldTarget
} from './starfield.ts';
import { ZODIAC_CONSTELLATION_LINES } from './constellationLines.ts';

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

  describe('Angular Separation & In-Field Multi-Body Detection', () => {
    it('computes spherical angular separation correctly', () => {
      // Coincident points
      expect(angularSeparationDeg(100, 20, 100, 20)).toBeCloseTo(0.0, 4);

      // Points separated along declination
      expect(angularSeparationDeg(0, 0, 0, 10)).toBeCloseTo(10.0, 4);

      // Points on opposite sides of celestial sphere
      expect(angularSeparationDeg(0, 0, 180, 0)).toBeCloseTo(180.0, 4);
    });

    it('detects companion planets, Moon, and Sun located within the 10° field of view', () => {
      const centerPlanet = { ra: 100.0, dec: 20.0 }; // e.g. Jupiter

      const testBodies: OtherSolarBody[] = [
        {
          type: 'planet',
          key: 'venus',
          name: 'Venus',
          symbol: '♀',
          ra: 102.5, // ~2.4° away, inside 10° FOV
          dec: 21.0
        },
        {
          type: 'moon',
          key: 'moon',
          name: 'Moon',
          symbol: '🌙',
          ra: 101.0, // ~1.5° away, inside 10° FOV
          dec: 19.0,
          phaseFraction: 0.45
        },
        {
          type: 'sun',
          key: 'sun',
          name: 'Sun',
          symbol: '☀️',
          ra: 103.0, // ~3.5° away, inside 10° FOV
          dec: 22.5
        },
        {
          type: 'planet',
          key: 'saturn',
          name: 'Saturn',
          symbol: '♄',
          ra: 140.0, // ~38° away, far outside FOV
          dec: 5.0
        }
      ];

      const inField = getBodiesInField(
        centerPlanet.ra,
        centerPlanet.dec,
        10.0,
        360,
        360,
        false,
        testBodies
      );

      // Exactly 3 bodies should be detected inside the FOV (Moon, Venus, Sun)
      expect(inField.length).toBe(3);

      const keys = inField.map(b => b.key);
      expect(keys).toContain('venus');
      expect(keys).toContain('moon');
      expect(keys).toContain('sun');
      expect(keys).not.toContain('saturn');

      // Verify sorted closest first
      expect(inField[0].separationDeg).toBeLessThanOrEqual(inField[1].separationDeg);
      expect(inField[1].separationDeg).toBeLessThanOrEqual(inField[2].separationDeg);

      // Verify Moon gets special apparent lunar radius
      const moonBody = inField.find(b => b.key === 'moon')!;
      expect(moonBody.radius).toBeGreaterThan(6.0);
      expect(moonBody.phaseFraction).toBe(0.45);

      // Verify Sun gets solar corona radius
      const sunBody = inField.find(b => b.key === 'sun')!;
      expect(sunBody.radius).toBeGreaterThan(6.5);
    });

    it('differentiates circular eyepiece aperture (5° radius) vs square frame (7.07° corner reach)', () => {
      // Replicate the real-world geometry of Venus & Sun on 2026-10-25:
      // Venus at RA 205.074, Dec -17.104
      // Sun at RA 210.073, Dec -12.255 (~6.84° away)
      const centerVenus = { ra: 205.074, dec: -17.104 };
      const bodies: OtherSolarBody[] = [
        {
          type: 'sun',
          key: 'sun',
          name: 'Sun',
          symbol: '☀️',
          ra: 210.073,
          dec: -12.255
        }
      ];

      // True spherical separation should be ~6.84°
      const sep = angularSeparationDeg(centerVenus.ra, centerVenus.dec, bodies[0].ra, bodies[0].dec);
      expect(sep).toBeGreaterThan(6.7);
      expect(sep).toBeLessThan(7.0);

      // In circular aperture (default, 5° radius eyepiece), separation 6.84° > 5.0° so Sun is OUTSIDE the eyepiece
      const inCircular = getBodiesInField(
        centerVenus.ra,
        centerVenus.dec,
        10.0,
        360,
        360,
        false,
        bodies,
        undefined,
        'circular'
      );
      expect(inCircular.length).toBe(0);

      // In square sensor frame (10°x10°, corners reach ~7.07°), dx ~ 4.9° and dy ~ 4.8° so Sun is INSIDE corner
      const inSquare = getBodiesInField(
        centerVenus.ra,
        centerVenus.dec,
        10.0,
        360,
        360,
        false,
        bodies,
        undefined,
        'square'
      );
      expect(inSquare.length).toBe(1);
      expect(inSquare[0].key).toBe('sun');
      expect(inSquare[0].separationDeg).toBeCloseTo(6.84, 1);
    });
  });

  describe('Star Field Names & Anti-Clutter Density Control', () => {
    it('populates authentic Bayer and Flamsteed designations for zodiac stars', () => {
      // Test stars in Venus field (RA ~205°, Dec ~-17°)
      const stars = getStarsInField(205.074, -17.104, 10.0, 6.0, 360, 360, false, undefined, 'circular');
      expect(stars.length).toBeGreaterThan(0);

      const namedStars = stars.filter(s => Boolean(s.name));
      expect(namedStars.length).toBeGreaterThanOrEqual(5);

      const names = namedStars.map(s => s.name);
      expect(names).toContain('69 Vir');
      expect(names).toContain('89 Vir');
      expect(names).toContain('83 Vir'); // The star 1.36° from Venus
    });

    it('strictly clamps FOV between 3° and 45° to safeguard against distortion and runaway rendering', () => {
      // Calling with 120° FOV should clamp to 45°
      const clampedStars = getStarsInField(205.074, -17.104, 120.0, 6.0, 360, 360);
      const exact45Stars = getStarsInField(205.074, -17.104, 45.0, 6.0, 360, 360);
      expect(clampedStars.length).toBe(exact45Stars.length);

      // Calling with 1° FOV should clamp to 3°
      const clampedMin = getStarsInField(205.074, -17.104, 1.0, 6.0, 360, 360);
      const exact3Min = getStarsInField(205.074, -17.104, 3.0, 6.0, 360, 360);
      expect(clampedMin.length).toBe(exact3Min.length);
    });
  });

  describe('Astronomical Bearing & Position Angle', () => {
    it('calculates cardinal position angles correctly', () => {
      // Due North
      expect(calculatePositionAngleDeg(100, 0, 100, 10)).toBeCloseTo(0, 1);
      expect(formatCompassBearing(0)).toBe('N');

      // Due East
      expect(calculatePositionAngleDeg(100, 0, 110, 0)).toBeCloseTo(90, 1);
      expect(formatCompassBearing(90)).toBe('E');

      // Due South
      expect(calculatePositionAngleDeg(100, 0, 100, -10)).toBeCloseTo(180, 1);
      expect(formatCompassBearing(180)).toBe('S');

      // Due West
      expect(calculatePositionAngleDeg(100, 0, 90, 0)).toBeCloseTo(270, 1);
      expect(formatCompassBearing(270)).toBe('W');

      // North-East quadrant
      const paNE = calculatePositionAngleDeg(100, 0, 105, 5);
      expect(paNE).toBeGreaterThan(40);
      expect(paNE).toBeLessThan(50);
      expect(formatCompassBearing(paNE)).toBe('NE');
    });

    it('classifies stellar spectral types and colors from B-V index', () => {
      expect(bvToSpectralClass(-0.20).type).toBe('Class O/B');
      expect(bvToSpectralClass(0.0).type).toBe('Class A');
      expect(bvToSpectralClass(0.20).type).toBe('Class F');
      expect(bvToSpectralClass(0.50).type).toBe('Class G');
      expect(bvToSpectralClass(0.85).type).toBe('Class K');
      expect(bvToSpectralClass(1.40).type).toBe('Class M');
    });
  });

  describe('Interactive Hit-Testing & Celestial Ruler Engine', () => {
    const centerPlanet = {
      key: 'saturn',
      name: 'Saturn',
      symbol: '♄',
      ra: 9.70,
      dec: 1.25,
      constellation: 'Pisces',
      status: 'Up all night'
    };

    it('detects a tapped solar system body with high priority', () => {
      const bodies: any[] = [
        {
          type: 'planet',
          key: 'venus',
          name: 'Venus',
          symbol: '♀',
          ra: 12.5,
          dec: 2.1,
          px: 180,
          py: 120,
          radius: 6,
          separationDeg: 2.9
        }
      ];

      // Tap directly on or near Venus
      const hit = hitTestStarfield(184, 122, [], bodies, centerPlanet);
      expect(hit).not.toBeNull();
      expect(hit!.type).toBe('planet');
      expect(hit!.name).toBe('Venus');
      expect(hit!.separationDeg).toBeCloseTo(2.9, 1);
      expect(hit!.bearingCompass).toMatch(/ENE|E|NE/);
    });

    it('detects a tapped star and measures exact separation and bearing from center', () => {
      const stars: any[] = [
        {
          ra: 10.5,
          dec: 1.8,
          mag: 3.2,
          bv: 1.1,
          name: 'Delta Psc',
          px: 210,
          py: 160,
          radius: 3.5,
          color: '#ffd7a0'
        }
      ];

      // Tap near Delta Psc
      const hit = hitTestStarfield(214, 162, stars, [], centerPlanet);
      expect(hit).not.toBeNull();
      expect(hit!.type).toBe('star');
      expect(hit!.name).toBe('Delta Psc');
      expect(hit!.mag).toBe(3.2);
      expect(hit!.separationDeg).toBeGreaterThan(0.5);
      expect(hit!.bearingDeg).toBeGreaterThan(0);
    });

    it('returns null when tapping empty background space', () => {
      const stars: any[] = [
        {
          ra: 10.5,
          dec: 1.8,
          mag: 3.2,
          bv: 1.1,
          name: 'Delta Psc',
          px: 50,
          py: 50,
          radius: 3.5,
          color: '#ffd7a0'
        }
      ];

      const hit = hitTestStarfield(300, 300, stars, [], centerPlanet);
      expect(hit).toBeNull();
    });
  });

  describe('Constellation Lines & Canvas Rendering', () => {
    it('has valid zodiac constellation stick lines defined', () => {
      expect(ZODIAC_CONSTELLATION_LINES.length).toBeGreaterThanOrEqual(30);

      // Verify each segment has valid coordinates and constellation name
      for (const seg of ZODIAC_CONSTELLATION_LINES) {
        expect(seg.ra1).toBeGreaterThanOrEqual(0);
        expect(seg.ra1).toBeLessThanOrEqual(360);
        expect(seg.ra2).toBeGreaterThanOrEqual(0);
        expect(seg.ra2).toBeLessThanOrEqual(360);
        expect(seg.dec1).toBeGreaterThanOrEqual(-90);
        expect(seg.dec1).toBeLessThanOrEqual(90);
        expect(seg.dec2).toBeGreaterThanOrEqual(-90);
        expect(seg.dec2).toBeLessThanOrEqual(90);
        expect(seg.constellation.length).toBeGreaterThan(0);
      }
    });

    it('renders starfield with constellation lines and selected target ruler without error', () => {
      // Mock canvas for headless test environment
      const canvas = {
        width: 360,
        height: 360,
        getBoundingClientRect: () => ({ width: 360, height: 360 }),
        getContext: () => ({
          save: () => {},
          restore: () => {},
          scale: () => {},
          createRadialGradient: () => ({ addColorStop: () => {} }),
          fillRect: () => {},
          beginPath: () => {},
          arc: () => {},
          clip: () => {},
          moveTo: () => {},
          lineTo: () => {},
          closePath: () => {},
          fill: () => {},
          stroke: () => {},
          strokeRect: () => {},
          setLineDash: () => {},
          translate: () => {},
          rotate: () => {},
          fillText: () => {},
          strokeText: () => {},
          measureText: (text: string) => ({ width: text.length * 6 }),
          rect: () => {},
          roundRect: () => {}
        })
      } as unknown as HTMLCanvasElement;

      const planet = {
        key: 'jupiter',
        name: 'Jupiter',
        symbol: '♃',
        ra: 145.65,
        dec: 14.43,
        constellation: 'Leo',
        status: 'Up all night'
      };

      const selectedTarget: SelectedStarfieldTarget = {
        type: 'star',
        name: 'Regulus',
        mag: 1.36,
        bv: -0.09,
        ra: 152.09,
        dec: 11.97,
        px: 250,
        py: 180,
        separationDeg: 6.8,
        bearingDeg: 112,
        bearingCompass: 'ESE'
      };

      const result = renderStarfield(canvas, planet, {
        fovDeg: 20.0,
        showConstellationLines: true,
        selectedTarget
      });

      expect(result.starCount).toBeGreaterThan(0);
      expect(result.stars.length).toBeGreaterThan(0);
    });
  });
});
