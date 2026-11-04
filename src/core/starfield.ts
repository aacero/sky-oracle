import { ZODIAC_STARS } from './zodiacStars.ts';
import { ZODIAC_CONSTELLATION_LINES } from './constellationLines.ts';
import { calculateMoonInfo } from './astronomy.ts';
import { t } from './i18n.ts';

export interface ProjectedStar {
  ra: number;
  dec: number;
  mag: number;
  bv: number;
  name?: string;
  x: number;      // Tangent plane X (normalized)
  y: number;      // Tangent plane Y (normalized)
  px: number;     // Canvas pixel X (East is left in North-Up; East is right in South-Up)
  py: number;     // Canvas pixel Y (North is up in North-Up; South is up in South-Up)
  radius: number; // Pixel radius for rendering
  color: string;  // CSS color based on B-V
  alt?: number;   // True astronomical altitude in degrees
  isBelowHorizon?: boolean; // True if altitude < 0°
  az?: number;    // True horizontal azimuth in degrees (0..360, 0=North, 90=East)
  azCompass?: string; // 16-point compass direction (e.g. 'WSW', 'SE')
}

export interface PlanetFieldData {
  key: string;
  name: string;
  symbol: string;
  ra: number;
  dec: number;
  constellation: string;
  status: string;
}

export interface HorizonParams {
  c0: number;           // Sine of center altitude (sin h0)
  cx: number;           // East gradient coefficient
  cy: number;           // North gradient coefficient
  planetAltDeg: number; // Center planet altitude in degrees
  planetAzDeg: number;  // Center planet horizontal azimuth in degrees (0..360, 0=North, 90=East)
  planetAzCompass: string; // 16-point compass direction (e.g. 'WSW', 'SE')
}

export interface HorizonIntersection {
  px: number;
  py: number;
}

export interface OtherSolarBody {
  type: 'planet' | 'moon' | 'sun';
  key: string;            // 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'moon', 'sun'
  name: string;           // 'Venus', 'Moon', 'Sun', etc.
  symbol: string;         // '♀', '🌙', '☀️', etc.
  ra: number;             // Right Ascension in degrees
  dec: number;            // Declination in degrees
  phaseFraction?: number; // 0..1 illuminated fraction (for Moon)
  phaseName?: string;     // e.g. 'Waxing Crescent'
}

export interface InFieldBody {
  type: 'planet' | 'moon' | 'sun';
  key: string;
  name: string;
  symbol: string;
  ra: number;
  dec: number;
  x: number;              // Tangent plane X (normalized)
  y: number;              // Tangent plane Y (normalized)
  px: number;             // Canvas pixel X
  py: number;             // Canvas pixel Y
  radius: number;         // Canvas pixel radius
  separationDeg: number;  // Angular separation from centered target planet
  alt?: number;           // Astronomical altitude in degrees
  isBelowHorizon?: boolean;
  az?: number;            // Horizontal azimuth in degrees (0..360°)
  azCompass?: string;     // 16-point compass direction (e.g. 'WSW', 'SE')
  phaseFraction?: number;
  phaseName?: string;
}

export interface SelectedStarfieldTarget {
  type: 'star' | 'planet' | 'moon' | 'sun';
  name: string;
  mag?: number;
  bv?: number;
  ra: number;
  dec: number;
  px: number;
  py: number;
  separationDeg: number;  // Angular separation from center target planet
  bearingDeg: number;     // Astronomical position angle from North through East (0..360°)
  bearingCompass: string; // 16-point compass bearing (e.g. 'ENE')
  alt?: number;           // Astronomical altitude in degrees
  isBelowHorizon?: boolean;
  az?: number;            // Horizontal azimuth in degrees (0..360°)
  azCompass?: string;     // 16-point compass direction (e.g. 'WSW', 'SE')
}

export type StarfieldOrientation = 'natural' | 'northUp' | 'southUp';

export interface FieldRotation {
  ux: number;           // East component of Up
  uy: number;           // North component of Up
  angleDeg: number;     // Clockwise rotation angle from North-Up in degrees
  isOverhead: boolean;  // True when target is near zenith (|alt| > 85°), triggering degeneracy protection
}

export interface StarfieldOptions {
  fovDeg?: number;          // Field of view in degrees (default: 10.0)
  maxMag?: number;          // Magnitude cutoff (default: 6.0)
  showLabels?: boolean;     // Show star names/Bayer designations (default: true)
  showConstellationLines?: boolean; // Show stick figure lines (default: false)
  showReticle?: boolean;    // Show 1° Telrad-style reticle (default: true)
  showCompass?: boolean;    // Show N/E/S/W indicators (default: true)
  orientation?: StarfieldOrientation; // 'natural' (default if observer known: Zenith Up / level horizon), 'northUp', 'southUp'
  southUp?: boolean;        // Invert view for Southern hemisphere (fallback if orientation omitted)
  observerLat?: number;     // Observer latitude in degrees (for horizon calculation)
  observerLon?: number;     // Observer longitude in degrees (for horizon calculation)
  currentDate?: Date;       // Observation time (default: current Date if lat/lon provided)
  renderHorizon?: boolean;  // Draw horizon line and ground shading (default: true if lat/lon provided)
  dimBelowHorizon?: boolean;// Dim stars located below the horizon (default: true)
  otherBodies?: OtherSolarBody[]; // Companion planets, Moon, Sun to check for and render in the field
  aperture?: 'circular' | 'square'; // 'circular' (default, 5° radius eyepiece) or 'square' (10°x10° sensor)
  selectedTarget?: SelectedStarfieldTarget | null; // Highlighted object with celestial ruler
}

export const PLANET_COLORS: Record<string, { fill: string; stroke: string; glow: string; name: string }> = {
  moon:    { fill: '#fef3c7', stroke: '#f59e0b', glow: 'rgba(254, 243, 199, 0.65)', name: 'Moon' },
  sun:     { fill: '#fef08a', stroke: '#eab308', glow: 'rgba(251, 191, 36, 0.75)', name: 'Sun' },
  mercury: { fill: '#cbd5e1', stroke: '#94a3b8', glow: 'rgba(203, 213, 225, 0.45)', name: 'Mercury' },
  venus:   { fill: '#ffffff', stroke: '#cbd5e1', glow: 'rgba(255, 255, 255, 0.85)', name: 'Venus' },
  mars:    { fill: '#f87171', stroke: '#ef4444', glow: 'rgba(248, 113, 113, 0.55)', name: 'Mars' },
  jupiter: { fill: '#fed7aa', stroke: '#fb923c', glow: 'rgba(254, 215, 170, 0.55)', name: 'Jupiter' },
  saturn:  { fill: '#fde68a', stroke: '#eab308', glow: 'rgba(253, 230, 138, 0.50)', name: 'Saturn' }
};

/**
 * Computes angular separation in degrees between two celestial coordinates (ra1, dec1) and (ra2, dec2).
 */
export function angularSeparationDeg(
  ra1Deg: number,
  dec1Deg: number,
  ra2Deg: number,
  dec2Deg: number
): number {
  const d2r = Math.PI / 180;
  const a1 = ra1Deg * d2r;
  const d1 = dec1Deg * d2r;
  const a2 = ra2Deg * d2r;
  const d2 = dec2Deg * d2r;

  const cosSep = Math.sin(d1) * Math.sin(d2) + Math.cos(d1) * Math.cos(d2) * Math.cos(a1 - a2);
  const clamped = Math.max(-1, Math.min(1, cosSep));
  return Math.acos(clamped) / d2r;
}

/**
 * Converts Right Ascension in degrees to standard astronomical hours and minutes (e.g. 09h 42m).
 */
export function formatRa(raDeg: number): string {
  const normRa = ((raDeg % 360) + 360) % 360;
  const totalHours = normRa / 15.0;
  const h = Math.floor(totalHours);
  const m = Math.floor((totalHours - h) * 60);
  return `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m`;
}

/**
 * Converts Declination in degrees to standard signed degrees and arcminutes (e.g. +14° 26').
 */
export function formatDec(decDeg: number): string {
  const sign = decDeg >= 0 ? '+' : '-';
  const absDec = Math.abs(decDeg);
  const d = Math.floor(absDec);
  const m = Math.round((absDec - d) * 60);
  return `${sign}${d.toString().padStart(2, '0')}° ${m.toString().padStart(2, '0')}'`;
}

/**
 * Approximates star color based on Johnson B-V color index (Harvard spectral classes).
 */
export function bvToColor(bv: number): string {
  if (bv < -0.15) return '#9bb0ff'; // O/B class: blue-white
  if (bv < 0.05)  return '#c8d7ff'; // A class: white with subtle blue
  if (bv < 0.35)  return '#f4f6ff'; // F class: pure white
  if (bv < 0.65)  return '#fff8ee'; // G class: warm solar yellow-white
  if (bv < 1.15)  return '#ffd7a0'; // K class: golden-orange
  return '#ff9e59';                 // M class: reddish-orange (Betelgeuse / Antares)
}

/**
 * Returns Harvard spectral classification and descriptive label based on Johnson B-V color index.
 */
export function bvToSpectralClass(bv: number): { type: string; desc: string; color: string } {
  if (bv < -0.15) return { type: 'Class O/B', desc: 'Blue-White (Very Hot)', color: '#9bb0ff' };
  if (bv < 0.05)  return { type: 'Class A', desc: 'White Main Sequence', color: '#c8d7ff' };
  if (bv < 0.35)  return { type: 'Class F', desc: 'Yellow-White Star', color: '#f4f6ff' };
  if (bv < 0.65)  return { type: 'Class G', desc: 'Solar-type Yellow Star', color: '#fff8ee' };
  if (bv < 1.15)  return { type: 'Class K', desc: 'Golden-Orange Giant', color: '#ffd7a0' };
  return { type: 'Class M', desc: 'Cool Red Giant / Supergiant', color: '#ff9e59' };
}

/**
 * Calculates standard astronomical Position Angle (bearing) in degrees (0° = North, 90° = East, 180° = South, 270° = West)
 * from center celestial coordinate (ra1, dec1) to target (ra2, dec2).
 */
export function calculatePositionAngleDeg(
  ra1Deg: number,
  dec1Deg: number,
  ra2Deg: number,
  dec2Deg: number
): number {
  const d2r = Math.PI / 180;
  const dRa = (ra2Deg - ra1Deg) * d2r;
  const d1 = dec1Deg * d2r;
  const d2 = dec2Deg * d2r;

  const y = Math.sin(dRa) * Math.cos(d2);
  const x = Math.cos(d1) * Math.sin(d2) - Math.sin(d1) * Math.cos(d2) * Math.cos(dRa);

  const paRad = Math.atan2(y, x);
  return ((paRad / d2r) % 360 + 360) % 360;
}

/**
 * Converts degree bearing (0° to 360°) to 16-wind compass abbreviation (e.g. NNE, ESE, SW).
 */
export function formatCompassBearing(deg: number): string {
  const COMPASS_POINTS = [
    'N', 'NNE', 'NE', 'ENE',
    'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW',
    'W', 'WNW', 'NW', 'NNW'
  ];
  const norm = ((deg % 360) + 360) % 360;
  const index = Math.round(norm / 22.5) % 16;
  return COMPASS_POINTS[index];
}

/**
 * Calculates Local Mean Sidereal Time (LMST) in degrees for a given date and geographic longitude.
 */
export function calculateLmst(date: Date, lonDeg: number): number {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const d = jd - 2451545.0; // Days since J2000.0
  const gmst = ((280.46061837 + 360.98564736629 * d) % 360 + 360) % 360;
  return ((gmst + lonDeg) % 360 + 360) % 360;
}

/**
 * Computes exact tangent plane horizon line coefficients and center target altitude.
 * On the gnomonic tangent plane centered at (centerRa, centerDec):
 * Altitude h > 0 <=> c0 + cx * X + cy * Y > 0
 * The horizon line is the straight line c0 + cx * X + cy * Y = 0.
 */
export function computeHorizonParams(
  latDeg: number,
  lonDeg: number,
  date: Date,
  centerRaDeg: number,
  centerDecDeg: number
): HorizonParams {
  const d2r = Math.PI / 180;
  const phi = latDeg * d2r;
  const dec0 = centerDecDeg * d2r;
  const lmst = calculateLmst(date, lonDeg);
  const ha0Deg = ((lmst - centerRaDeg) % 360 + 360) % 360;
  const ha0 = ha0Deg * d2r;

  const sinPhi = Math.sin(phi);
  const cosPhi = Math.cos(phi);
  const sinDec0 = Math.sin(dec0);
  const cosDec0 = Math.cos(dec0);
  const cosHa0 = Math.cos(ha0);
  const sinHa0 = Math.sin(ha0);

  // c0 = sin(h0) (sine of the center's altitude)
  const c0 = sinPhi * sinDec0 + cosPhi * cosDec0 * cosHa0;
  // Gradient components along East (X) and North (Y)
  const cx = cosPhi * sinHa0;
  const cy = sinPhi * cosDec0 - cosPhi * sinDec0 * cosHa0;

  const planetAltDeg = Math.asin(Math.max(-1, Math.min(1, c0))) / d2r;

  // Horizontal azimuth calculation:
  // azY = -cos(dec) * sin(ha) (East component)
  // azX = cos(lat) * sin(dec) - sin(lat) * cos(dec) * cos(ha) (North component)
  const azY = -cosDec0 * sinHa0;
  const azX = cosPhi * sinDec0 - sinPhi * cosDec0 * cosHa0;
  let planetAzDeg = Math.atan2(azY, azX) / d2r;
  if (planetAzDeg < 0) {
    planetAzDeg += 360;
  }
  const planetAzCompass = formatCompassBearing(planetAzDeg);

  return { c0, cx, cy, planetAltDeg, planetAzDeg, planetAzCompass };
}

/**
 * Computes 2D tangent plane rotation to align the field of view with the requested orientation.
 *
 * - 'natural': Orients the Zenith directly UP and renders the horizon strictly horizontal (level),
 *   matching what a human observer sees looking up at the sky.
 *   Gracefully resolves overhead degeneracy (Zenith gimbal lock) by smoothly transitioning
 *   to North-Up as altitude approaches 90° (|alt| > 85°).
 * - 'northUp': Standard celestial equatorial orientation (North is UP, East is LEFT).
 * - 'southUp': Southern hemisphere inverted equatorial orientation (South is UP, West is LEFT).
 */
export function computeFieldRotation(
  orientation: StarfieldOrientation | boolean = 'natural',
  horizonParams?: HorizonParams | null
): FieldRotation {
  const normOrientation: StarfieldOrientation =
    typeof orientation === 'boolean'
      ? (orientation ? 'southUp' : 'northUp')
      : orientation;

  if (normOrientation === 'northUp') {
    return { ux: 0, uy: 1, angleDeg: 0, isOverhead: false };
  }
  if (normOrientation === 'southUp') {
    return { ux: 0, uy: -1, angleDeg: 180, isOverhead: false };
  }

  // Natural perspective (Zenith Up / Horizontal Horizon)
  if (!horizonParams) {
    return { ux: 0, uy: 1, angleDeg: 0, isOverhead: false };
  }

  const { cx, cy, planetAltDeg } = horizonParams;
  const gradLen = Math.sqrt(cx * cx + cy * cy);
  const absAlt = Math.abs(planetAltDeg);

  // Handle zenith/nadir degeneracy: when target is nearly overhead (|alt| > 85°),
  // the gradient length cos(alt) -> 0 and azimuth spins rapidly.
  // Smoothly blend toward North-Up when altitude is between 85° and 88°,
  // and lock to North-Up when altitude >= 88°.
  if (absAlt >= 88.0 || gradLen < 0.035) {
    return { ux: 0, uy: 1, angleDeg: 0, isOverhead: true };
  }

  const rawAngle = Math.atan2(cx, cy); // Angle in radians from North through East toward Zenith

  if (absAlt > 85.0) {
    // Smooth cubic hermite blend between 85° and 88°
    const t = (88.0 - absAlt) / 3.0; // 1 at 85°, 0 at 88°
    const smoothT = t * t * (3 - 2 * t);
    const blendedAngle = rawAngle * smoothT;
    return {
      ux: Math.sin(blendedAngle),
      uy: Math.cos(blendedAngle),
      angleDeg: blendedAngle * (180 / Math.PI),
      isOverhead: true
    };
  }

  return {
    ux: cx / gradLen,
    uy: cy / gradLen,
    angleDeg: rawAngle * (180 / Math.PI),
    isOverhead: false
  };
}

/**
 * Standard Gnomonic (tangent plane) projection.
 * Projects (ra, dec) onto a tangent plane centered at (centerRaDeg, centerDecDeg).
 */
export function projectCoordinates(
  raDeg: number,
  decDeg: number,
  centerRaDeg: number,
  centerDecDeg: number
): { x: number; y: number } | null {
  const d2r = Math.PI / 180;
  const ra = raDeg * d2r;
  const dec = decDeg * d2r;
  const ra0 = centerRaDeg * d2r;
  const dec0 = centerDecDeg * d2r;

  const deltaRa = ra - ra0;
  const cosC = Math.sin(dec0) * Math.sin(dec) + Math.cos(dec0) * Math.cos(dec) * Math.cos(deltaRa);
  if (cosC <= 0.001) return null; // Behind tangent plane / opposite hemisphere

  const x = (Math.cos(dec) * Math.sin(deltaRa)) / cosC;
  const y = (Math.cos(dec0) * Math.sin(dec) - Math.sin(dec0) * Math.cos(dec) * Math.cos(deltaRa)) / cosC;

  return { x, y };
}

/**
 * Computes polygon covering the ground (below horizon) and the straight horizon line segment
 * across the canvas viewport [0, width] x [0, height].
 * Supports field rotation for Natural (Zenith-Up / horizontal horizon), North-Up, and South-Up orientations.
 */
export function computeGroundPolygonAndHorizon(
  c0: number,
  cx: number,
  cy: number,
  width: number,
  height: number,
  scaleX: number,
  scaleY: number,
  rotOrSouthUp: FieldRotation | boolean = false
): {
  groundVertices: { px: number; py: number }[];
  horizonLine: [HorizonIntersection, HorizonIntersection] | null;
  allGround: boolean;
  allSky: boolean;
} {
  const rot: FieldRotation = typeof rotOrSouthUp === 'boolean'
    ? (rotOrSouthUp ? { ux: 0, uy: -1, angleDeg: 180, isOverhead: false } : { ux: 0, uy: 1, angleDeg: 0, isOverhead: false })
    : rotOrSouthUp;

  // Evaluates altitude function V at pixel (px, py).
  // V > 0 => Sky (above horizon), V <= 0 => Ground (below horizon)
  const evalAlt = (px: number, py: number): number => {
    const X_rot = (width / 2 - px) / scaleX;
    const Y_rot = (height / 2 - py) / scaleY;
    const x = rot.uy * X_rot + rot.ux * Y_rot;
    const y = -rot.ux * X_rot + rot.uy * Y_rot;
    return c0 + cx * x + cy * y;
  };

  const corners = [
    { px: 0, py: 0, v: evalAlt(0, 0) },
    { px: width, py: 0, v: evalAlt(width, 0) },
    { px: width, py: height, v: evalAlt(width, height) },
    { px: 0, py: height, v: evalAlt(0, height) }
  ];

  const allSky = corners.every(c => c.v > 0);
  const allGround = corners.every(c => c.v <= 0);

  if (allSky) {
    return { groundVertices: [], horizonLine: null, allGround: false, allSky: true };
  }

  if (allGround) {
    return {
      groundVertices: corners.map(c => ({ px: c.px, py: c.py })),
      horizonLine: null,
      allGround: true,
      allSky: false
    };
  }

  const groundVertices: { px: number; py: number }[] = [];
  const intersections: HorizonIntersection[] = [];

  for (let i = 0; i < 4; i++) {
    const curr = corners[i];
    const next = corners[(i + 1) % 4];

    if (curr.v <= 0) {
      groundVertices.push({ px: curr.px, py: curr.py });
    }

    if ((curr.v > 0 && next.v < 0) || (curr.v < 0 && next.v > 0)) {
      const t = curr.v / (curr.v - next.v);
      const intPx = curr.px + t * (next.px - curr.px);
      const intPy = curr.py + t * (next.py - curr.py);
      const pt = { px: intPx, py: intPy };
      intersections.push(pt);
      groundVertices.push(pt);
    }
  }

  let horizonLine: [HorizonIntersection, HorizonIntersection] | null = null;
  if (intersections.length === 2) {
    horizonLine = [intersections[0], intersections[1]];
  }

  return { groundVertices, horizonLine, allGround: false, allSky: false };
}

/**
 * Checks for other solar system bodies (companion planets, Moon, Sun) located inside the Field of View.
 * Supports circular aperture (separation <= fovDeg / 2, default) or square frame (x, y <= limit).
 * Supports Natural (Zenith-Up / horizontal horizon), North-Up, and South-Up orientations.
 */
export function getBodiesInField(
  centerRaDeg: number,
  centerDecDeg: number,
  fovDeg: number = 10.0,
  width: number = 360,
  height: number = 360,
  orientationOrSouthUp: StarfieldOrientation | boolean = 'natural',
  bodies: OtherSolarBody[] = [],
  horizon?: { lat: number; lon: number; date: Date },
  aperture: 'circular' | 'square' = 'circular'
): InFieldBody[] {
  // Clamp FOV between 3° (maximum zoom-in) and 45° (maximum zoom-out)
  const clampedFov = Math.max(3.0, Math.min(45.0, fovDeg));
  const d2r = Math.PI / 180;
  const limitX = Math.tan((clampedFov / 2) * d2r);
  const limitY = Math.tan((clampedFov / 2) * d2r);
  const scaleX = width / (2 * limitX);
  const scaleY = height / (2 * limitY);

  let latR = 0;
  let sinLat = 0;
  let cosLat = 0;
  let lmst = 0;
  let hp: HorizonParams | null = null;

  if (horizon) {
    latR = horizon.lat * d2r;
    sinLat = Math.sin(latR);
    cosLat = Math.cos(latR);
    lmst = calculateLmst(horizon.date, horizon.lon);
    hp = computeHorizonParams(horizon.lat, horizon.lon, horizon.date, centerRaDeg, centerDecDeg);
  }

  const fieldRot = computeFieldRotation(orientationOrSouthUp, hp);
  const results: InFieldBody[] = [];

  for (const b of bodies) {
    const proj = projectCoordinates(b.ra, b.dec, centerRaDeg, centerDecDeg);
    if (!proj) continue;

    const sep = angularSeparationDeg(centerRaDeg, centerDecDeg, b.ra, b.dec);

    const xRot = fieldRot.uy * proj.x - fieldRot.ux * proj.y;
    const yRot = fieldRot.ux * proj.x + fieldRot.uy * proj.y;

    // In circular aperture, radius is strictly fovDeg / 2 (e.g. 5°). In square, corners extend to ~7.07°
    const inBounds = aperture === 'circular'
      ? (sep <= clampedFov / 2)
      : (Math.abs(xRot) <= limitX && Math.abs(yRot) <= limitY);

    if (inBounds) {
      const px = width / 2 - xRot * scaleX;
      const py = height / 2 - yRot * scaleY;

      // Apparent visual radius on canvas
      let radius = 5.0; // Standard planet disc
      if (b.type === 'moon') {
        // Apparent Moon diameter is ~0.5° (30 arcminutes)
        radius = Math.max(7.0, Math.tan((0.5 / 2) * d2r) * scaleX);
      } else if (b.type === 'sun') {
        // Apparent Sun diameter is ~0.53° (32 arcminutes)
        radius = Math.max(7.5, Math.tan((0.53 / 2) * d2r) * scaleX);
      }

      let alt: number | undefined;
      let isBelowHorizon: boolean | undefined;
      let az: number | undefined;
      let azCompass: string | undefined;

      if (horizon) {
        const decR = b.dec * d2r;
        const haDeg = ((lmst - b.ra) % 360 + 360) % 360;
        const haR = haDeg * d2r;
        const sinAlt = sinLat * Math.sin(decR) + cosLat * Math.cos(decR) * Math.cos(haR);
        alt = Math.asin(Math.max(-1, Math.min(1, sinAlt))) / d2r;
        isBelowHorizon = alt < 0;

        const azY = -Math.cos(decR) * Math.sin(haR);
        const azX = cosLat * Math.sin(decR) - sinLat * Math.cos(decR) * Math.cos(haR);
        let azDeg = Math.atan2(azY, azX) / d2r;
        if (azDeg < 0) azDeg += 360;
        az = azDeg;
        azCompass = formatCompassBearing(azDeg);
      }

      results.push({
        type: b.type,
        key: b.key,
        name: b.name,
        symbol: b.symbol,
        ra: b.ra,
        dec: b.dec,
        x: proj.x,
        y: proj.y,
        px,
        py,
        radius,
        separationDeg: sep,
        alt,
        isBelowHorizon,
        az,
        azCompass,
        phaseFraction: b.phaseFraction,
        phaseName: b.phaseName
      });
    }
  }

  // Sort by angular separation (closest to center first)
  results.sort((a, b) => a.separationDeg - b.separationDeg);

  return results;
}

/**
 * Filters and projects stars inside Field of View (FOV) centered on (centerRa, centerDec).
 * Supports circular eyepiece aperture (radius <= fovDeg / 2) or square sensor frame.
 * Supports Natural (Zenith-Up / horizontal horizon), North-Up, and South-Up orientations.
 */
export function getStarsInField(
  centerRaDeg: number,
  centerDecDeg: number,
  fovDeg: number = 10.0,
  maxMag: number = 6.0,
  width: number = 360,
  height: number = 360,
  orientationOrSouthUp: StarfieldOrientation | boolean = 'natural',
  horizon?: { lat: number; lon: number; date: Date },
  aperture: 'circular' | 'square' = 'circular'
): ProjectedStar[] {
  // Clamp FOV between 3° (maximum zoom-in) and 45° (maximum zoom-out)
  const clampedFov = Math.max(3.0, Math.min(45.0, fovDeg));
  const d2r = Math.PI / 180;
  const limitR = Math.tan((clampedFov / 2) * d2r);
  const limitX = limitR;
  const limitY = limitR;

  const scaleX = width / (2 * limitX);
  const scaleY = height / (2 * limitY);

  let latR = 0;
  let sinLat = 0;
  let cosLat = 0;
  let lmst = 0;
  let hp: HorizonParams | null = null;

  if (horizon) {
    latR = horizon.lat * d2r;
    sinLat = Math.sin(latR);
    cosLat = Math.cos(latR);
    lmst = calculateLmst(horizon.date, horizon.lon);
    hp = computeHorizonParams(horizon.lat, horizon.lon, horizon.date, centerRaDeg, centerDecDeg);
  }

  const fieldRot = computeFieldRotation(orientationOrSouthUp, hp);
  const results: ProjectedStar[] = [];

  for (let i = 0; i < ZODIAC_STARS.length; i++) {
    const [ra, dec, mag, bv, name] = ZODIAC_STARS[i];
    if (mag > maxMag) continue;

    const proj = projectCoordinates(ra, dec, centerRaDeg, centerDecDeg);
    if (!proj) continue;

    const xRot = fieldRot.uy * proj.x - fieldRot.ux * proj.y;
    const yRot = fieldRot.ux * proj.x + fieldRot.uy * proj.y;

    const inBounds = aperture === 'circular'
      ? (proj.x * proj.x + proj.y * proj.y <= limitR * limitR)
      : (Math.abs(xRot) <= limitX && Math.abs(yRot) <= limitY);

    if (inBounds) {
      const px = width / 2 - xRot * scaleX;
      const py = height / 2 - yRot * scaleY;

      const radius = Math.max(1.0, (6.3 - mag) * 0.85);
      const color = bvToColor(bv);

      let alt: number | undefined;
      let isBelowHorizon: boolean | undefined;
      let az: number | undefined;
      let azCompass: string | undefined;

      if (horizon) {
        const starDecR = dec * d2r;
        const starHaDeg = ((lmst - ra) % 360 + 360) % 360;
        const starHaR = starHaDeg * d2r;
        const sinAlt = sinLat * Math.sin(starDecR) + cosLat * Math.cos(starDecR) * Math.cos(starHaR);
        alt = Math.asin(Math.max(-1, Math.min(1, sinAlt))) / d2r;
        isBelowHorizon = alt < 0;

        const starAzY = -Math.cos(starDecR) * Math.sin(starHaR);
        const starAzX = cosLat * Math.sin(starDecR) - sinLat * Math.cos(starDecR) * Math.cos(starHaR);
        let starAz = Math.atan2(starAzY, starAzX) / d2r;
        if (starAz < 0) starAz += 360;
        az = starAz;
        azCompass = formatCompassBearing(starAz);
      }

      results.push({
        ra,
        dec,
        mag,
        bv,
        name,
        x: proj.x,
        y: proj.y,
        px,
        py,
        radius,
        color,
        alt,
        isBelowHorizon,
        az,
        azCompass
      });
    }
  }

  return results;
}

/**
 * Hit-tests user tap/click coordinates against in-field bodies and stars.
 * Returns the closest celestial target within the hit threshold, or null if empty space.
 */
export function hitTestStarfield(
  clickPx: number,
  clickPy: number,
  stars: ProjectedStar[],
  bodies: InFieldBody[],
  centerPlanet: PlanetFieldData,
  thresholdPx: number = 20
): SelectedStarfieldTarget | null {
  // Check solar system bodies first (higher visual priority)
  let bestBody: InFieldBody | null = null;
  let bestBodyDist = Infinity;

  for (const b of bodies) {
    const dx = clickPx - b.px;
    const dy = clickPy - b.py;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const hitRadius = Math.max(thresholdPx, b.radius + 10);
    if (dist <= hitRadius && dist < bestBodyDist) {
      bestBodyDist = dist;
      bestBody = b;
    }
  }

  if (bestBody) {
    const sep = angularSeparationDeg(centerPlanet.ra, centerPlanet.dec, bestBody.ra, bestBody.dec);
    const bearing = calculatePositionAngleDeg(centerPlanet.ra, centerPlanet.dec, bestBody.ra, bestBody.dec);
    return {
      type: bestBody.type,
      name: bestBody.name,
      ra: bestBody.ra,
      dec: bestBody.dec,
      px: bestBody.px,
      py: bestBody.py,
      separationDeg: sep,
      bearingDeg: bearing,
      bearingCompass: formatCompassBearing(bearing),
      alt: bestBody.alt,
      isBelowHorizon: bestBody.isBelowHorizon,
      az: bestBody.az,
      azCompass: bestBody.azCompass
    };
  }

  // Check stars in the field
  let bestStar: ProjectedStar | null = null;
  let bestStarDist = Infinity;

  for (const s of stars) {
    const dx = clickPx - s.px;
    const dy = clickPy - s.py;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const hitRadius = Math.max(thresholdPx, s.radius + 8);
    if (dist <= hitRadius && dist < bestStarDist) {
      bestStarDist = dist;
      bestStar = s;
    }
  }

  if (bestStar) {
    const sep = angularSeparationDeg(centerPlanet.ra, centerPlanet.dec, bestStar.ra, bestStar.dec);
    const bearing = calculatePositionAngleDeg(centerPlanet.ra, centerPlanet.dec, bestStar.ra, bestStar.dec);
    return {
      type: 'star',
      name: bestStar.name || 'Unnamed Field Star',
      mag: bestStar.mag,
      bv: bestStar.bv,
      ra: bestStar.ra,
      dec: bestStar.dec,
      px: bestStar.px,
      py: bestStar.py,
      separationDeg: sep,
      bearingDeg: bearing,
      bearingCompass: formatCompassBearing(bearing),
      alt: bestStar.alt,
      isBelowHorizon: bestStar.isBelowHorizon,
      az: bestStar.az,
      azCompass: bestStar.azCompass
    };
  }

  return null;
}

/**
 * High-DPI canvas renderer for a 10° centered planet starfield.
 * Fully supports circular telescope/binocular eyepiece aperture, companion planets, Moon, Sun,
 * Southern hemisphere South-Up mode, and horizon rendering / below-horizon dimming.
 */
export function renderStarfield(
  canvas: HTMLCanvasElement,
  planet: PlanetFieldData,
  options: StarfieldOptions = {}
): {
  starCount: number;
  stars: ProjectedStar[];
  horizonParams: HorizonParams | null;
  inFieldBodies: InFieldBody[];
  sunSeparationDeg?: number;
} {
  // Clamp FOV between 3° (max zoom-in) and 45° (max zoom-out)
  const fovDeg = Math.max(3.0, Math.min(45.0, options.fovDeg ?? 10.0));
  const maxMag = options.maxMag ?? 6.0;
  const showLabels = options.showLabels ?? true;
  const showReticle = options.showReticle ?? true;
  const showCompass = options.showCompass ?? true;
  const dimBelow = options.dimBelowHorizon ?? true;
  const aperture = options.aperture ?? 'circular';

  const hasObserver = typeof options.observerLat === 'number' && typeof options.observerLon === 'number';
  const currentDate = options.currentDate ?? new Date();

  let horizonParams: HorizonParams | null = null;
  if (hasObserver) {
    horizonParams = computeHorizonParams(
      options.observerLat!,
      options.observerLon!,
      currentDate,
      planet.ra,
      planet.dec
    );
  }

  const orientation: StarfieldOrientation = options.orientation ?? (
    typeof options.southUp === 'boolean'
      ? (options.southUp ? 'southUp' : 'northUp')
      : (hasObserver ? 'natural' : 'northUp')
  );
  const southUp = orientation === 'southUp';
  const fieldRot = computeFieldRotation(orientation, horizonParams);

  const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
  const rect = canvas.getBoundingClientRect();
  const cssWidth = Math.round(rect.width || 360);
  const cssHeight = Math.round(rect.height || 360);

  // Set internal buffer sized for retina/high-DPI sharpness
  canvas.width = cssWidth * dpr;
  canvas.height = cssHeight * dpr;

  const ctx = canvas.getContext('2d');
  if (!ctx) return { starCount: 0, stars: [], horizonParams: null, inFieldBodies: [] };

  ctx.save();
  ctx.scale(dpr, dpr);

  const cx = cssWidth / 2;
  const cy = cssHeight / 2;

  // 1. Deep Space Backdrop
  const bgGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, cssWidth * 0.7);
  bgGrad.addColorStop(0, '#0a101f'); // subtle cosmic blue-black center
  bgGrad.addColorStop(0.7, '#050811');
  bgGrad.addColorStop(1, '#020408'); // pitch void at edges
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, cssWidth, cssHeight);

  // If circular eyepiece aperture, clip celestial graphics to the round circle
  if (aperture === 'circular') {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, cx - 1, 0, Math.PI * 2);
    ctx.clip();
  }

  // 2. Ground Shading & Horizon Boundary (rendered under stars so below-horizon stars remain visible)
  const d2r = Math.PI / 180;
  const limitX = Math.tan((fovDeg / 2) * d2r);
  const limitY = Math.tan((fovDeg / 2) * d2r);
  const scaleX = cssWidth / (2 * limitX);
  const scaleY = cssHeight / (2 * limitY);

  let horizonGeom: ReturnType<typeof computeGroundPolygonAndHorizon> | null = null;

  if (horizonParams && options.renderHorizon !== false) {
    horizonGeom = computeGroundPolygonAndHorizon(
      horizonParams.c0,
      horizonParams.cx,
      horizonParams.cy,
      cssWidth,
      cssHeight,
      scaleX,
      scaleY,
      fieldRot
    );

    // Fill ground overlay (soft dusk slate that tints below-horizon region without burying stars)
    if (horizonGeom.groundVertices.length >= 3) {
      ctx.save();
      ctx.fillStyle = horizonGeom.allGround ? 'rgba(8, 14, 26, 0.65)' : 'rgba(8, 14, 26, 0.50)';
      ctx.beginPath();
      ctx.moveTo(horizonGeom.groundVertices[0].px, horizonGeom.groundVertices[0].py);
      for (let i = 1; i < horizonGeom.groundVertices.length; i++) {
        ctx.lineTo(horizonGeom.groundVertices[i].px, horizonGeom.groundVertices[i].py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Draw straight horizon line & text label if it crosses the viewport
    if (horizonGeom.horizonLine) {
      const [I1, I2] = horizonGeom.horizonLine;

      ctx.save();
      ctx.strokeStyle = '#34d399'; // Emerald green
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(I1.px, I1.py);
      ctx.lineTo(I2.px, I2.py);
      ctx.stroke();
      ctx.setLineDash([]);

      // Horizon line label at midpoint
      const midPx = (I1.px + I2.px) / 2;
      const midPy = (I1.py + I2.py) / 2;
      let angle = Math.atan2(I2.py - I1.py, I2.px - I1.px);
      if (angle > Math.PI / 2 || angle < -Math.PI / 2) {
        angle += Math.PI;
      }

      ctx.translate(midPx, midPy);
      ctx.rotate(angle);
      ctx.font = 'bold 11px monospace';
      const horizText = `━━━ ${t('starfield.horizon')} · ${horizonParams.planetAzCompass} (${horizonParams.planetAzDeg.toFixed(0)}°) ━━━`;
      ctx.strokeStyle = 'rgba(2, 6, 17, 0.95)';
      ctx.lineWidth = 3;
      ctx.strokeText(horizText, 0, -3);
      ctx.fillStyle = '#34d399';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(horizText, 0, -3);
      ctx.restore();
    }
  }

  // 2b. Zodiac Constellation Stick Lines (if enabled)
  if (options.showConstellationLines) {
    ctx.save();
    ctx.strokeStyle = 'rgba(96, 165, 250, 0.28)';
    ctx.lineWidth = 1.0;
    ctx.setLineDash([4, 4]);

    for (const seg of ZODIAC_CONSTELLATION_LINES) {
      const p1 = projectCoordinates(seg.ra1, seg.dec1, planet.ra, planet.dec);
      const p2 = projectCoordinates(seg.ra2, seg.dec2, planet.ra, planet.dec);
      if (!p1 || !p2) continue;

      const px1 = cssWidth / 2 - (fieldRot.uy * p1.x - fieldRot.ux * p1.y) * scaleX;
      const py1 = cssHeight / 2 - (fieldRot.ux * p1.x + fieldRot.uy * p1.y) * scaleY;
      const px2 = cssWidth / 2 - (fieldRot.uy * p2.x - fieldRot.ux * p2.y) * scaleX;
      const py2 = cssHeight / 2 - (fieldRot.ux * p2.x + fieldRot.uy * p2.y) * scaleY;

      ctx.beginPath();
      ctx.moveTo(px1, py1);
      ctx.lineTo(px2, py2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 3. Compute & Draw Stars
  const horizonOpt = hasObserver
    ? { lat: options.observerLat!, lon: options.observerLon!, date: currentDate }
    : undefined;
  const stars = getStarsInField(planet.ra, planet.dec, fovDeg, maxMag, cssWidth, cssHeight, orientation, horizonOpt, aperture);

  for (const s of stars) {
    const isDimmed = Boolean(s.isBelowHorizon && dimBelow);

    ctx.save();
    if (isDimmed) {
      ctx.globalAlpha = 0.50; // Visible ghost star below horizon
    }

    // Soft outer glow for prominent stars (mag <= 3.5), only if above horizon
    if (s.mag <= 3.5 && !isDimmed) {
      const glowR = s.radius * 3.0;
      const starGlow = ctx.createRadialGradient(s.px, s.py, 0, s.px, s.py, glowR);
      starGlow.addColorStop(0, s.color);
      starGlow.addColorStop(0.5, 'rgba(255, 255, 255, 0.25)');
      starGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = starGlow;
      ctx.beginPath();
      ctx.arc(s.px, s.py, glowR, 0, Math.PI * 2);
      ctx.fill();
    }

    // Star core disc
    const drawRadius = isDimmed ? Math.max(1.0, s.radius * 0.90) : s.radius;
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(s.px, s.py, drawRadius, 0, Math.PI * 2);
    ctx.fill();

    // Subtle 4-point diffraction spike for brilliant stars (mag <= 1.5), only if above horizon
    if (s.mag <= 1.5 && !isDimmed) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 0.75;
      const spikeLen = s.radius * 2.8;
      ctx.beginPath();
      ctx.moveTo(s.px - spikeLen, s.py);
      ctx.lineTo(s.px + spikeLen, s.py);
      ctx.moveTo(s.px, s.py - spikeLen);
      ctx.lineTo(s.px + spikeLen, s.py);
      ctx.stroke();
    }

    ctx.restore();
  }

  // 3b. Smart, De-Cluttered Star Labels (with density budgeting & collision avoidance)
  if (showLabels) {
    ctx.save();
    ctx.font = 'bold 11.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textBaseline = 'middle';

    // Bounding boxes for collision avoidance (initialize with center planet exclusion zone)
    const labelBoxes: { x1: number; y1: number; x2: number; y2: number }[] = [
      { x1: cx - 48, y1: cy - 26, x2: cx + 64, y2: cy + 22 }
    ];

    // Sort candidate stars by magnitude (brightest first)
    const candidateStars = [...stars]
      .filter(s => Boolean(s.name))
      .sort((a, b) => a.mag - b.mag);

    let labelsDrawn = 0;
    const maxLabels = 8; // De-clutter density limit

    for (const s of candidateStars) {
      if (labelsDrawn >= maxLabels && s.mag > 4.5) break;

      const name = s.name!;
      const textWidth = ctx.measureText(name).width;
      const drawRadius = s.isBelowHorizon && dimBelow ? Math.max(1.0, s.radius * 0.90) : s.radius;

      // Try Right position first
      let lx = s.px + drawRadius + 5;
      let ly = s.py - 1;
      let box = { x1: lx - 2, y1: ly - 8, x2: lx + textWidth + 2, y2: ly + 8 };

      const overlaps = (b: { x1: number; y1: number; x2: number; y2: number }) => {
        return !(box.x2 < b.x1 || box.x1 > b.x2 || box.y2 < b.y1 || box.y1 > b.y2);
      };

      let collides = labelBoxes.some(overlaps);

      // If collides, try Left position
      if (collides) {
        lx = s.px - drawRadius - textWidth - 5;
        box = { x1: lx - 2, y1: ly - 8, x2: lx + textWidth + 2, y2: ly + 8 };
        collides = labelBoxes.some(overlaps);
      }

      // If collides, try Below position
      if (collides) {
        lx = s.px - textWidth / 2;
        ly = s.py + drawRadius + 8;
        box = { x1: lx - 2, y1: ly - 8, x2: lx + textWidth + 2, y2: ly + 8 };
        collides = labelBoxes.some(overlaps);
      }

      // If collides or outside frame, skip label to prevent clutter
      if (collides) continue;
      if (box.x1 < 6 || box.x2 > cssWidth - 6 || box.y1 < 6 || box.y2 > cssHeight - 6) continue;

      // Draw label with crisp contrast halo
      ctx.save();
      const isDimmed = Boolean(s.isBelowHorizon && dimBelow);
      if (isDimmed) {
        ctx.globalAlpha = 0.50;
      }

      ctx.strokeStyle = 'rgba(2, 6, 17, 0.95)';
      ctx.lineWidth = 3.5;
      ctx.strokeText(name, lx, ly);

      if (s.mag <= 3.0) {
        ctx.fillStyle = '#ffffff';
      } else if (s.mag <= 4.5) {
        ctx.fillStyle = '#e2e8f0';
      } else {
        ctx.fillStyle = '#cbd5e1';
      }
      ctx.fillText(name, lx, ly);
      ctx.restore();

      labelBoxes.push(box);
      labelsDrawn++;
    }

    ctx.restore();
  }

  // 3c. If entire field is below horizon, show subtle earth watermark
  if (horizonGeom && horizonGeom.allGround && horizonParams) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.font = 'bold 11px monospace';
    ctx.strokeStyle = 'rgba(2, 6, 17, 0.95)';
    ctx.lineWidth = 3;
    const earthSurfaceText = t('starfield.earth_surface', { alt: horizonParams.planetAltDeg.toFixed(0) });
    ctx.strokeText(earthSurfaceText, cx, cssHeight - 28);
    ctx.fillStyle = 'rgba(226, 232, 240, 0.85)';
    ctx.fillText(earthSurfaceText, cx, cssHeight - 28);
    ctx.restore();
  }

  // 5. In-Field Solar System Bodies (Companion Planets, Moon, Sun)
  const inFieldBodies = getBodiesInField(
    planet.ra,
    planet.dec,
    fovDeg,
    cssWidth,
    cssHeight,
    orientation,
    options.otherBodies ?? [],
    horizonOpt,
    aperture
  );

  for (const b of inFieldBodies) {
    const isBelow = Boolean(b.isBelowHorizon && dimBelow);

    if (b.type === 'planet') {
      const pColors = PLANET_COLORS[b.key] || {
        fill: '#cbd5e1',
        stroke: '#94a3b8',
        glow: 'rgba(203, 213, 225, 0.4)',
        name: b.name
      };

      ctx.save();
      if (isBelow) ctx.globalAlpha = 0.45;

      // Planet atmospheric glow
      const pGlow = ctx.createRadialGradient(b.px, b.py, 2, b.px, b.py, 16);
      pGlow.addColorStop(0, isBelow ? 'rgba(148, 163, 184, 0.25)' : pColors.glow);
      pGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = pGlow;
      ctx.beginPath();
      ctx.arc(b.px, b.py, 16, 0, Math.PI * 2);
      ctx.fill();

      // Planet disc
      ctx.fillStyle = pColors.fill;
      ctx.beginPath();
      ctx.arc(b.px, b.py, 5.0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = pColors.stroke;
      ctx.lineWidth = 1.5;
      if (isBelow) ctx.setLineDash([3, 2]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label
      ctx.font = 'bold 11.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.strokeStyle = 'rgba(2, 6, 17, 0.95)';
      ctx.lineWidth = 3.5;
      ctx.strokeText(`${b.symbol} ${b.name}`, b.px + 9, b.py - 4);
      ctx.fillStyle = isBelow ? '#cbd5e1' : '#ffffff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${b.symbol} ${b.name}`, b.px + 9, b.py - 4);

      const sepText = t('starfield.sep', { deg: b.separationDeg.toFixed(1) });
      ctx.font = 'bold 10px monospace';
      ctx.strokeText(sepText, b.px + 9, b.py + 8);
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(sepText, b.px + 9, b.py + 8);
      ctx.restore();

    } else if (b.type === 'moon') {
      ctx.save();
      if (isBelow) ctx.globalAlpha = 0.45;

      // Outer lunar soft glow
      const mGlow = ctx.createRadialGradient(b.px, b.py, b.radius * 0.5, b.px, b.py, b.radius * 2.4);
      mGlow.addColorStop(0, 'rgba(226, 232, 240, 0.50)');
      mGlow.addColorStop(0.5, 'rgba(203, 213, 225, 0.18)');
      mGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = mGlow;
      ctx.beginPath();
      ctx.arc(b.px, b.py, b.radius * 2.4, 0, Math.PI * 2);
      ctx.fill();

      // Dark earthshine base disc
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(b.px, b.py, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(203, 213, 225, 0.5)';
      ctx.lineWidth = 1.0;
      ctx.stroke();

      // Real-time illuminated phase disc
      const ill = Math.max(0, Math.min(1, b.phaseFraction ?? 0.5));
      if (ill > 0.03) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(b.px, b.py, b.radius, 0, Math.PI * 2);
        ctx.clip();

        // Rotate Moon phase to match sky orientation
        ctx.translate(b.px, b.py);
        if (orientation === 'natural') {
          ctx.rotate(fieldRot.angleDeg * (Math.PI / 180));
        } else if (orientation === 'southUp') {
          ctx.rotate(Math.PI);
        }

        ctx.fillStyle = '#f8fafc';
        if (ill >= 0.96) {
          ctx.beginPath();
          ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, b.radius, -Math.PI / 2, Math.PI / 2, false);
          const k = 2 * ill - 1;
          ctx.ellipse(0, 0, Math.abs(k) * b.radius, b.radius, 0, Math.PI / 2, -Math.PI / 2, k < 0);
          ctx.fill();
        }
        ctx.restore();
      }

      // Moon Label
      ctx.font = 'bold 11.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.strokeStyle = 'rgba(2, 6, 17, 0.95)';
      ctx.lineWidth = 3.5;
      const pct = Math.round(ill * 100);
      const moonLabel = `🌙 ${t('planets.moon')} (${pct}%)`;
      ctx.strokeText(moonLabel, b.px + b.radius + 6, b.py - 4);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(moonLabel, b.px + b.radius + 6, b.py - 4);

      ctx.font = 'bold 10px monospace';
      const sepMoonText = t('starfield.sep', { deg: b.separationDeg.toFixed(1) });
      ctx.strokeText(sepMoonText, b.px + b.radius + 6, b.py + 8);
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(sepMoonText, b.px + b.radius + 6, b.py + 8);
      ctx.restore();

    } else if (b.type === 'sun') {
      ctx.save();
      if (isBelow) ctx.globalAlpha = 0.50;

      // Intense solar corona glow
      const sGlow = ctx.createRadialGradient(b.px, b.py, b.radius * 0.8, b.px, b.py, b.radius * 3.8);
      sGlow.addColorStop(0, 'rgba(254, 240, 138, 0.90)');
      sGlow.addColorStop(0.35, 'rgba(245, 158, 11, 0.55)');
      sGlow.addColorStop(0.7, 'rgba(239, 68, 68, 0.20)');
      sGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = sGlow;
      ctx.beginPath();
      ctx.arc(b.px, b.py, b.radius * 3.8, 0, Math.PI * 2);
      ctx.fill();

      // Solar core disc
      ctx.fillStyle = '#fffbeb';
      ctx.beginPath();
      ctx.arc(b.px, b.py, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.0;
      ctx.stroke();

      // 8 radiating sun rays
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.75)';
      ctx.lineWidth = 1.25;
      for (let a = 0; a < 8; a++) {
        const rayAngle = (a * Math.PI) / 4;
        const r1 = b.radius + 2;
        const r2 = b.radius + 7;
        ctx.beginPath();
        ctx.moveTo(b.px + Math.cos(rayAngle) * r1, b.py + Math.sin(rayAngle) * r1);
        ctx.lineTo(b.px + Math.cos(rayAngle) * r2, b.py + Math.sin(rayAngle) * r2);
        ctx.stroke();
      }

      // Sun Label
      ctx.font = 'bold 11.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.strokeStyle = 'rgba(2, 6, 17, 0.95)';
      ctx.lineWidth = 3.5;
      const sunLabel = `☀️ ${t('planets.sun')} (${b.separationDeg.toFixed(1)}°)`;
      ctx.strokeText(sunLabel, b.px + b.radius + 8, b.py - 4);
      ctx.fillStyle = '#fbbf24';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(sunLabel, b.px + b.radius + 8, b.py - 4);

      ctx.font = 'bold 10px monospace';
      const solarHazText = t('starfield.solar_hazard');
      ctx.strokeText(solarHazText, b.px + b.radius + 8, b.py + 8);
      ctx.fillStyle = '#ef4444';
      ctx.fillText(solarHazText, b.px + b.radius + 8, b.py + 8);
      ctx.restore();
    }
  }

  // 6. Center Telrad / Reticle (1° diameter circle = 0.5° radius)
  const oneDegreePx = Math.tan(0.5 * d2r) * scaleX;

  if (showReticle) {
    ctx.strokeStyle = 'rgba(88, 166, 255, 0.22)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(cx, cy, oneDegreePx, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 4 crosshair ticks outside the 1° circle
    const tickLen = 6;
    ctx.strokeStyle = 'rgba(88, 166, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    // Top tick
    ctx.moveTo(cx, cy - oneDegreePx);
    ctx.lineTo(cx, cy - oneDegreePx - tickLen);
    // Bottom tick
    ctx.moveTo(cx, cy + oneDegreePx);
    ctx.lineTo(cx, cy + oneDegreePx + tickLen);
    // Left tick
    ctx.moveTo(cx - oneDegreePx, cy);
    ctx.lineTo(cx - oneDegreePx - tickLen, cy);
    // Right tick
    ctx.moveTo(cx + oneDegreePx, cy);
    ctx.lineTo(cx + oneDegreePx + tickLen, cy);
    ctx.stroke();
  }

  // 7. Draw Target Planet at Exact Center
  const pStyle = PLANET_COLORS[planet.key] || {
    fill: planet.key.startsWith('radiant_') ? '#38bdf8' : '#fde68a',
    stroke: planet.key.startsWith('radiant_') ? '#0284c7' : '#eab308',
    glow: planet.key.startsWith('radiant_') ? 'rgba(56, 189, 248, 0.45)' : 'rgba(253, 230, 138, 0.4)',
    name: planet.name
  };

  const isPlanetBelow = horizonParams ? horizonParams.planetAltDeg < 0 : false;

  ctx.save();
  if (isPlanetBelow) {
    ctx.globalAlpha = 0.85;
  }

  if (planet.key === 'moon') {
    const moonRadius = Math.max(8.0, Math.tan((0.5 / 2) * d2r) * scaleX);

    // 1. Soft outer lunar glow
    const mGlow = ctx.createRadialGradient(cx, cy, moonRadius * 0.5, cx, cy, moonRadius * 2.5);
    mGlow.addColorStop(0, isPlanetBelow ? 'rgba(148, 163, 184, 0.25)' : 'rgba(226, 232, 240, 0.50)');
    mGlow.addColorStop(0.5, isPlanetBelow ? 'rgba(148, 163, 184, 0.10)' : 'rgba(203, 213, 225, 0.18)');
    mGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = mGlow;
    ctx.beginPath();
    ctx.arc(cx, cy, moonRadius * 2.5, 0, Math.PI * 2);
    ctx.fill();

    // 2. Opaque Earthshine base disc (solidly occults background stars)
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(cx, cy, moonRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(203, 213, 225, 0.55)';
    ctx.lineWidth = 1.0;
    if (isPlanetBelow) ctx.setLineDash([3, 2]);
    ctx.stroke();
    ctx.setLineDash([]);

    // 3. Real-time illuminated phase disc with Bezier terminator
    const mInfo = calculateMoonInfo(currentDate);
    const cyclePos = mInfo.cyclePos;
    const phase = Math.max(0, Math.min(1, cyclePos));
    const k = 1.333333;

    if (phase > 0.001 && phase < 0.999) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, moonRadius, 0, Math.PI * 2);
      ctx.clip();

      ctx.beginPath();
      ctx.moveTo(cx, cy - moonRadius);
      if (phase <= 0.5) {
        // Waxing
        ctx.bezierCurveTo(cx + k * moonRadius, cy - moonRadius, cx + k * moonRadius, cy + moonRadius, cx, cy + moonRadius);
        const p = cx + k * moonRadius * Math.cos(2 * Math.PI * phase);
        ctx.bezierCurveTo(p, cy + moonRadius, p, cy - moonRadius, cx, cy - moonRadius);
      } else {
        // Waning
        ctx.bezierCurveTo(cx - k * moonRadius, cy - moonRadius, cx - k * moonRadius, cy + moonRadius, cx, cy + moonRadius);
        const p = cx - k * moonRadius * Math.cos(2 * Math.PI * phase);
        ctx.bezierCurveTo(p, cy + moonRadius, p, cy - moonRadius, cx, cy - moonRadius);
      }
      ctx.closePath();
      ctx.fillStyle = isPlanetBelow ? '#cbd5e1' : '#fef3c7';
      ctx.fill();
      ctx.restore();
    } else if (phase >= 0.999) {
      ctx.fillStyle = isPlanetBelow ? '#cbd5e1' : '#fef3c7';
      ctx.beginPath();
      ctx.arc(cx, cy, moonRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Label beside Moon
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.strokeStyle = 'rgba(2, 6, 17, 0.95)';
    ctx.lineWidth = 3.5;
    const moonLabelText = `${planet.symbol} ${planet.name} (${mInfo.name})${isPlanetBelow ? ' (Below)' : ''}`;
    ctx.strokeText(moonLabelText, cx + moonRadius + 8, cy - 4);
    ctx.fillStyle = isPlanetBelow ? '#cbd5e1' : '#ffffff';
    ctx.fillText(moonLabelText, cx + moonRadius + 8, cy - 4);
    ctx.restore();

  } else if (planet.key === 'sun') {
    const sunRadius = Math.max(9.0, Math.tan((0.53 / 2) * d2r) * scaleX);

    // Coronal outer glow
    const sGlow = ctx.createRadialGradient(cx, cy, sunRadius * 0.5, cx, cy, sunRadius * 3.5);
    sGlow.addColorStop(0, isPlanetBelow ? 'rgba(148, 163, 184, 0.35)' : 'rgba(254, 240, 138, 0.85)');
    sGlow.addColorStop(0.35, isPlanetBelow ? 'rgba(148, 163, 184, 0.15)' : 'rgba(245, 158, 11, 0.35)');
    sGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = sGlow;
    ctx.beginPath();
    ctx.arc(cx, cy, sunRadius * 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Solar core disc (occults background stars)
    ctx.fillStyle = isPlanetBelow ? '#94a3b8' : '#fef08a';
    ctx.beginPath();
    ctx.arc(cx, cy, sunRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    if (isPlanetBelow) ctx.setLineDash([3, 2]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Label beside Sun
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.strokeStyle = 'rgba(2, 6, 17, 0.95)';
    ctx.lineWidth = 3.5;
    const sunLabelText = `${planet.symbol} ${planet.name}${isPlanetBelow ? ' (Below)' : ''}`;
    ctx.strokeText(sunLabelText, cx + sunRadius + 8, cy - 4);
    ctx.fillStyle = isPlanetBelow ? '#cbd5e1' : '#ffffff';
    ctx.fillText(sunLabelText, cx + sunRadius + 8, cy - 4);
    ctx.restore();

  } else if (planet.key.startsWith('radiant_')) {
    // Meteor Shower Radiant Reticle & Focal Center
    // 1. Soft outer cyan glow
    const rGlow = ctx.createRadialGradient(cx, cy, 2, cx, cy, 28);
    rGlow.addColorStop(0, isPlanetBelow ? 'rgba(148, 163, 184, 0.35)' : 'rgba(56, 189, 248, 0.55)');
    rGlow.addColorStop(0.5, isPlanetBelow ? 'rgba(148, 163, 184, 0.12)' : 'rgba(56, 189, 248, 0.18)');
    rGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = rGlow;
    ctx.beginPath();
    ctx.arc(cx, cy, 28, 0, Math.PI * 2);
    ctx.fill();

    // 2. Dashed radiant focal circle
    ctx.strokeStyle = isPlanetBelow ? '#94a3b8' : '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 3. 4 Crosshair ticks pointing outward
    ctx.strokeStyle = isPlanetBelow ? '#94a3b8' : '#38bdf8';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 14); ctx.lineTo(cx, cy - 21);
    ctx.moveTo(cx, cy + 14); ctx.lineTo(cx, cy + 21);
    ctx.moveTo(cx - 14, cy); ctx.lineTo(cx - 21, cy);
    ctx.moveTo(cx + 14, cy); ctx.lineTo(cx + 21, cy);
    ctx.stroke();

    // 4. Diverging meteor streak accents radiating away
    const streakGrad = ctx.createLinearGradient(cx + 7, cy - 7, cx + 24, cy - 24);
    streakGrad.addColorStop(0, isPlanetBelow ? 'rgba(148, 163, 184, 0.6)' : 'rgba(56, 189, 248, 0.85)');
    streakGrad.addColorStop(1, 'transparent');
    ctx.strokeStyle = streakGrad;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx + 8, cy - 8); ctx.lineTo(cx + 24, cy - 24);
    ctx.stroke();

    const streakGrad2 = ctx.createLinearGradient(cx - 7, cy - 7, cx - 22, cy - 22);
    streakGrad2.addColorStop(0, isPlanetBelow ? 'rgba(148, 163, 184, 0.6)' : 'rgba(56, 189, 248, 0.85)');
    streakGrad2.addColorStop(1, 'transparent');
    ctx.strokeStyle = streakGrad2;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy - 8); ctx.lineTo(cx - 22, cy - 22);
    ctx.stroke();

    // 5. Solid center dot with bright white core
    ctx.fillStyle = isPlanetBelow ? '#94a3b8' : '#38bdf8';
    ctx.beginPath();
    ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // 6. Label beside Radiant
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.strokeStyle = 'rgba(2, 6, 17, 0.95)';
    ctx.lineWidth = 3.5;
    const rLabelText = `${planet.symbol} ${planet.name.replace(/ Radiant$/, '')}${isPlanetBelow ? ' (Below)' : ''}`;
    ctx.strokeText(rLabelText, cx + 18, cy - 8);
    ctx.fillStyle = isPlanetBelow ? '#cbd5e1' : '#38bdf8';
    ctx.fillText(rLabelText, cx + 18, cy - 8);

    ctx.restore();

  } else {
    // Standard Planet atmospheric glow
    const pGlow = ctx.createRadialGradient(cx, cy, 2, cx, cy, 18);
    pGlow.addColorStop(0, isPlanetBelow ? 'rgba(148, 163, 184, 0.25)' : pStyle.glow);
    pGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = pGlow;
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, Math.PI * 2);
    ctx.fill();

    // Planet disc
    ctx.fillStyle = pStyle.fill;
    ctx.beginPath();
    ctx.arc(cx, cy, 5.0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = pStyle.stroke;
    ctx.lineWidth = 1.5;
    if (isPlanetBelow) {
      ctx.setLineDash([3, 2]);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Planet label beside center disc
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.strokeStyle = 'rgba(2, 6, 17, 0.95)';
    ctx.lineWidth = 3.5;
    const pLabelText = `${planet.symbol} ${planet.name}${isPlanetBelow ? ' (Below)' : ''}`;
    ctx.strokeText(pLabelText, cx + 9, cy - 8);
    ctx.fillStyle = isPlanetBelow ? '#cbd5e1' : '#ffffff';
    ctx.fillText(pLabelText, cx + 9, cy - 8);

    ctx.restore();
  }

  // 7b. Selected Target Reticle & Celestial Ruler
  if (options.selectedTarget) {
    const sel = options.selectedTarget;
    const proj = projectCoordinates(sel.ra, sel.dec, planet.ra, planet.dec);
    if (proj) {
      const xRot = fieldRot.uy * proj.x - fieldRot.ux * proj.y;
      const yRot = fieldRot.ux * proj.x + fieldRot.uy * proj.y;
      const selPx = cx - xRot * scaleX;
      const selPy = cy - yRot * scaleY;

      ctx.save();

      // 1. Dashed celestial ruler line from center planet to target
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.75;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(selPx, selPy);
      ctx.stroke();
      ctx.setLineDash([]);

      // 2. Selection Reticle around target
      const reticleGlow = ctx.createRadialGradient(selPx, selPy, 4, selPx, selPy, 18);
      reticleGlow.addColorStop(0, 'rgba(56, 189, 248, 0.40)');
      reticleGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = reticleGlow;
      ctx.beginPath();
      ctx.arc(selPx, selPy, 18, 0, Math.PI * 2);
      ctx.fill();

      // Dual concentric reticle rings
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(selPx, selPy, 10, 0, Math.PI * 2);
      ctx.stroke();

      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.arc(selPx, selPy, 5, 0, Math.PI * 2);
      ctx.stroke();

      // 4 crosshair ticks
      const rInner = 10;
      const rOuter = 16;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(selPx, selPy - rOuter); ctx.lineTo(selPx, selPy - rInner);
      ctx.moveTo(selPx, selPy + rOuter); ctx.lineTo(selPx, selPy + rInner);
      ctx.moveTo(selPx - rOuter, selPy); ctx.lineTo(selPx - rInner, selPy);
      ctx.moveTo(selPx + rOuter, selPy); ctx.lineTo(selPx + rInner, selPy);
      ctx.stroke();

      // 3. Distance & Bearing Badge at ruler midpoint
      const midX = (cx + selPx) / 2;
      const midY = (cy + selPy) / 2;
      const sep = sel.separationDeg;
      const sepText = sep < 1.0 ? `${(sep * 60).toFixed(1)}'` : `${sep.toFixed(2)}°`;
      const badgeText = `${sepText} · ${sel.bearingDeg.toFixed(0)}° ${sel.bearingCompass}`;

      ctx.font = 'bold 9.5px monospace';
      const textW = ctx.measureText(badgeText).width;
      const padX = 6;
      const padY = 3;
      const badgeW = textW + padX * 2;
      const badgeH = 14 + padY;

      ctx.fillStyle = 'rgba(2, 6, 23, 0.92)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(midX - badgeW / 2, midY - badgeH / 2, badgeW, badgeH, 4);
      } else {
        ctx.rect(midX - badgeW / 2, midY - badgeH / 2, badgeW, badgeH);
      }
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText, midX, midY + 0.5);

      ctx.restore();
    }
  }

  // End circular aperture clipping if active
  if (aperture === 'circular') {
    ctx.restore(); // Restore clip

    // Draw circular eyepiece barrel ring
    ctx.strokeStyle = '#30363d';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.arc(cx, cy, cx - 1, 0, Math.PI * 2);
    ctx.stroke();

    // Darken 4 corner regions outside circular eyepiece
    ctx.save();
    ctx.fillStyle = 'rgba(2, 4, 8, 0.75)';
    ctx.beginPath();
    ctx.rect(0, 0, cssWidth, cssHeight);
    ctx.arc(cx, cy, cx - 1, 0, Math.PI * 2, true);
    ctx.fill();
    ctx.restore();
  } else {
    // Square border
    ctx.strokeStyle = '#30363d';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, cssWidth, cssHeight);
  }

  // 8. Cardinal Directions & Orientation Indicators
  // Natural perspective:
  //   Top: ZENITH (UP)
  //   Bottom: NADIR (DOWN) or HORIZON (DOWN)
  //   Rim pip: celestial North indicator 'N'
  // North-Up: N top, S bottom, E left, W right
  // South-Up: S top, N bottom, W left, E right
  if (showCompass) {
    if (orientation === 'natural') {
      ctx.font = 'bold 10.5px monospace';
      ctx.strokeStyle = 'rgba(2, 6, 17, 0.95)';
      ctx.lineWidth = 3;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const zenithText = t('starfield.zenith_up');
      ctx.strokeText(zenithText, cx, 6);
      ctx.fillStyle = '#38bdf8'; // Sky blue
      ctx.fillText(zenithText, cx, 6);

      ctx.textBaseline = 'bottom';
      const groundLabel = isPlanetBelow ? 'NADIR (DOWN)' : `${t('starfield.horizon')} (DOWN)`;
      const facingText = horizonParams
        ? `${groundLabel} · ${horizonParams.planetAzCompass} (${horizonParams.planetAzDeg.toFixed(0)}°)`
        : groundLabel;
      ctx.strokeText(facingText, cx, cssHeight - 5);
      ctx.fillStyle = 'rgba(226, 232, 240, 0.90)';
      ctx.fillText(facingText, cx, cssHeight - 5);

      // Celestial North pip along the perimeter rim
      const pipR = (cssWidth / 2) - 13;
      const nx = cx + pipR * fieldRot.ux;
      const ny = cy - pipR * fieldRot.uy;

      ctx.save();
      ctx.font = 'bold 10.5px monospace';
      ctx.strokeStyle = 'rgba(2, 6, 17, 0.95)';
      ctx.lineWidth = 2.5;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeText('N', nx, ny);
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('N', nx, ny);
      ctx.restore();
    } else {
      ctx.font = 'bold 11px monospace';
      ctx.strokeStyle = 'rgba(2, 6, 17, 0.95)';
      ctx.lineWidth = 3;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#cbd5e1';

      ctx.textBaseline = 'top';
      ctx.strokeText(southUp ? 'S' : 'N', cx, 6);
      ctx.fillText(southUp ? 'S' : 'N', cx, 6);

      ctx.textBaseline = 'bottom';
      ctx.strokeText(southUp ? 'N' : 'S', cx, cssHeight - 5);
      ctx.fillText(southUp ? 'N' : 'S', cx, cssHeight - 5);

      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.strokeText(southUp ? 'W' : 'E', 8, cy);
      ctx.fillText(southUp ? 'W' : 'E', 8, cy);

      ctx.textAlign = 'right';
      ctx.strokeText(southUp ? 'E' : 'W', cssWidth - 8, cy);
      ctx.fillText(southUp ? 'E' : 'W', cssWidth - 8, cy);
    }
  }

  // 9. Corner Scale & HUD Overlays
  // Top-left: FOV & Orientation badge
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.strokeStyle = 'rgba(2, 6, 17, 0.95)';
  ctx.lineWidth = 3;
  const radiusDeg = fovDeg / 2;
  const radiusText = radiusDeg.toFixed(1).replace(/\.0$/, '');
  const fovText = `${fovDeg.toFixed(0)}° ${aperture === 'circular' ? `FOV (${radiusText}° r)` : `× ${fovDeg.toFixed(0)}° Frame`}`;
  ctx.strokeText(fovText, 10, 10);
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText(fovText, 10, 10);

  ctx.font = 'bold 10px monospace';
  const orientText = orientation === 'natural'
    ? (fieldRot.isOverhead ? 'ZENITH UP · OVERHEAD LOCK' : t('starfield.orient_natural'))
    : (orientation === 'southUp' ? t('starfield.orient_south_up') : t('starfield.orient_north_up'));
  const orientColor = orientation === 'natural'
    ? (fieldRot.isOverhead ? '#f59e0b' : '#34d399')
    : (orientation === 'southUp' ? '#38bdf8' : '#cbd5e1');
  ctx.strokeText(orientText, 10, 25);
  ctx.fillStyle = orientColor;
  ctx.fillText(orientText, 10, 25);

  // Top-right: Planet altitude & Sun separation
  const sunBody = options.otherBodies?.find(b => b.type === 'sun');
  const sunSeparationDeg = sunBody
    ? angularSeparationDeg(planet.ra, planet.dec, sunBody.ra, sunBody.dec)
    : undefined;

  if (horizonParams) {
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.strokeStyle = 'rgba(2, 6, 17, 0.95)';
    ctx.lineWidth = 3;
    const altDeg = horizonParams.planetAltDeg;
    const sign = altDeg >= 0 ? '+' : '';
    const altText = `Alt: ${sign}${altDeg.toFixed(1)}°${altDeg < 0 ? ' (Below)' : ''}`;
    ctx.strokeText(altText, cssWidth - 10, 10);
    ctx.fillStyle = altDeg >= 0 ? '#34d399' : '#f87171';
    ctx.fillText(altText, cssWidth - 10, 10);

    ctx.font = 'bold 10px monospace';
    const facingHudText = `Facing: ${horizonParams.planetAzDeg.toFixed(0)}° ${horizonParams.planetAzCompass}`;
    ctx.strokeText(facingHudText, cssWidth - 10, 25);
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(facingHudText, cssWidth - 10, 25);

    if (sunSeparationDeg !== undefined && sunSeparationDeg < 30.0 && !inFieldBodies.some(b => b.type === 'sun')) {
      const sunSepText = `☀️ Sun: ${sunSeparationDeg.toFixed(1)}° away`;
      ctx.strokeText(sunSepText, cssWidth - 10, 40);
      ctx.fillStyle = '#f59e0b';
      ctx.fillText(sunSepText, cssWidth - 10, 40);
    }
  }

  // Bottom-left: scale bar (1° or 5° adaptive based on zoom)
  const scaleBarDeg = fovDeg >= 25 ? 5 : 1;
  const barLen = Math.tan(scaleBarDeg * d2r) * scaleX;
  const barY = cssHeight - 16;
  const barX = 14;
  ctx.strokeStyle = '#8b949e';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(barX, barY);
  ctx.lineTo(barX + barLen, barY);
  // End caps
  ctx.moveTo(barX, barY - 3);
  ctx.lineTo(barX, barY + 3);
  ctx.moveTo(barX + barLen, barY - 3);
  ctx.lineTo(barX + barLen, barY + 3);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.font = 'bold 10px monospace';
  ctx.strokeStyle = 'rgba(2, 6, 17, 0.95)';
  ctx.lineWidth = 3;
  ctx.strokeText(`${scaleBarDeg}°`, barX + barLen / 2, barY - 5);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText(`${scaleBarDeg}°`, barX + barLen / 2, barY - 5);

  // Bottom-right: Star count
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.strokeStyle = 'rgba(2, 6, 17, 0.95)';
  ctx.lineWidth = 3;
  const countText = `${t('starfield.stars_count', { count: stars.length })} (mag ≤ ${maxMag.toFixed(1)})`;
  ctx.strokeText(countText, cssWidth - 10, cssHeight - 8);
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(countText, cssWidth - 10, cssHeight - 8);

  // High-visibility Solar Proximity warning ribbon if the Sun is in the field
  if (inFieldBodies.some(b => b.type === 'sun')) {
    const bannerH = 18;
    const bannerW = Math.min(260, cssWidth - 40);
    const bannerY = cssHeight - 38;
    ctx.fillStyle = 'rgba(220, 38, 38, 0.88)';
    ctx.fillRect(cx - bannerW / 2, bannerY, bannerW, bannerH);
    ctx.strokeStyle = '#fca5a5';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - bannerW / 2, bannerY, bannerW, bannerH);

    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t('starfield.solar_proximity'), cx, bannerY + bannerH / 2);
  }

  ctx.restore();

  return { starCount: stars.length, stars, horizonParams, inFieldBodies, sunSeparationDeg };
}
