import { ZODIAC_STARS } from './zodiacStars.ts';

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
}

export interface HorizonIntersection {
  px: number;
  py: number;
}

export interface StarfieldOptions {
  fovDeg?: number;          // Field of view in degrees (default: 10.0)
  maxMag?: number;          // Magnitude cutoff (default: 6.0)
  showLabels?: boolean;     // Show star names/Bayer designations (default: true)
  showReticle?: boolean;    // Show 1° Telrad-style reticle (default: true)
  showCompass?: boolean;    // Show N/E/S/W indicators (default: true)
  southUp?: boolean;        // Invert view for Southern hemisphere (default: false)
  observerLat?: number;     // Observer latitude in degrees (for horizon calculation)
  observerLon?: number;     // Observer longitude in degrees (for horizon calculation)
  currentDate?: Date;       // Observation time (default: current Date if lat/lon provided)
  renderHorizon?: boolean;  // Draw horizon line and ground shading (default: true if lat/lon provided)
  dimBelowHorizon?: boolean;// Dim stars located below the horizon (default: true)
}

export const PLANET_COLORS: Record<string, { fill: string; stroke: string; glow: string; name: string }> = {
  mercury: { fill: '#cbd5e1', stroke: '#94a3b8', glow: 'rgba(203, 213, 225, 0.45)', name: 'Mercury' },
  venus:   { fill: '#fef08a', stroke: '#facc15', glow: 'rgba(254, 240, 138, 0.65)', name: 'Venus' },
  mars:    { fill: '#f87171', stroke: '#ef4444', glow: 'rgba(248, 113, 113, 0.55)', name: 'Mars' },
  jupiter: { fill: '#fed7aa', stroke: '#fb923c', glow: 'rgba(254, 215, 170, 0.55)', name: 'Jupiter' },
  saturn:  { fill: '#fde68a', stroke: '#eab308', glow: 'rgba(253, 230, 138, 0.50)', name: 'Saturn' }
};

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

  return { c0, cx, cy, planetAltDeg };
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
 */
export function computeGroundPolygonAndHorizon(
  c0: number,
  cx: number,
  cy: number,
  width: number,
  height: number,
  scaleX: number,
  scaleY: number,
  southUp: boolean
): {
  groundVertices: { px: number; py: number }[];
  horizonLine: [HorizonIntersection, HorizonIntersection] | null;
  allGround: boolean;
  allSky: boolean;
} {
  // Evaluates altitude function V at pixel (px, py).
  // V > 0 => Sky (above horizon), V <= 0 => Ground (below horizon)
  const evalAlt = (px: number, py: number): number => {
    const x = southUp ? (px - width / 2) / scaleX : (width / 2 - px) / scaleX;
    const y = southUp ? (py - height / 2) / scaleY : (height / 2 - py) / scaleY;
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
 * Filters and projects stars inside a square Field of View (FOV) centered on (centerRa, centerDec).
 * Supports South-Up inversion and observer horizon altitude computation.
 */
export function getStarsInField(
  centerRaDeg: number,
  centerDecDeg: number,
  fovDeg: number = 10.0,
  maxMag: number = 6.0,
  width: number = 360,
  height: number = 360,
  southUp: boolean = false,
  horizon?: { lat: number; lon: number; date: Date }
): ProjectedStar[] {
  const d2r = Math.PI / 180;
  const limitX = Math.tan((fovDeg / 2) * d2r);
  const limitY = Math.tan((fovDeg / 2) * d2r);

  const scaleX = width / (2 * limitX);
  const scaleY = height / (2 * limitY);

  let latR = 0;
  let sinLat = 0;
  let cosLat = 0;
  let lmst = 0;

  if (horizon) {
    latR = horizon.lat * d2r;
    sinLat = Math.sin(latR);
    cosLat = Math.cos(latR);
    lmst = calculateLmst(horizon.date, horizon.lon);
  }

  const results: ProjectedStar[] = [];

  for (let i = 0; i < ZODIAC_STARS.length; i++) {
    const [ra, dec, mag, bv, name] = ZODIAC_STARS[i];
    if (mag > maxMag) continue;

    const proj = projectCoordinates(ra, dec, centerRaDeg, centerDecDeg);
    if (!proj) continue;

    if (Math.abs(proj.x) <= limitX && Math.abs(proj.y) <= limitY) {
      // Coordinate mapping:
      // North-Up: East is LEFT (px decreases as x increases), North is UP (py decreases as y increases)
      // South-Up: Inverted 180° - East is RIGHT (px increases as x increases), South is UP (py increases as y increases)
      const px = southUp
        ? width / 2 + proj.x * scaleX
        : width / 2 - proj.x * scaleX;
      const py = southUp
        ? height / 2 + proj.y * scaleY
        : height / 2 - proj.y * scaleY;

      // Realistic magnitude-to-radius curve:
      // Mag 0: ~5.0px, Mag 1: ~4.2px, Mag 3: ~3.0px, Mag 5: ~1.7px, Mag 6: ~1.1px
      const radius = Math.max(1.0, (6.3 - mag) * 0.85);
      const color = bvToColor(bv);

      let alt: number | undefined;
      let isBelowHorizon: boolean | undefined;

      if (horizon) {
        const starDecR = dec * d2r;
        const starHaDeg = ((lmst - ra) % 360 + 360) % 360;
        const starHaR = starHaDeg * d2r;
        const sinAlt = sinLat * Math.sin(starDecR) + cosLat * Math.cos(starDecR) * Math.cos(starHaR);
        alt = Math.asin(Math.max(-1, Math.min(1, sinAlt))) / d2r;
        isBelowHorizon = alt < 0;
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
        isBelowHorizon
      });
    }
  }

  return results;
}

/**
 * High-DPI canvas renderer for a 10°x10° centered planet starfield.
 * Fully supports Southern hemisphere South-Up mode and horizon rendering / below-horizon dimming.
 */
export function renderStarfield(
  canvas: HTMLCanvasElement,
  planet: PlanetFieldData,
  options: StarfieldOptions = {}
): { starCount: number; stars: ProjectedStar[]; horizonParams: HorizonParams | null } {
  const fovDeg = options.fovDeg ?? 10.0;
  const maxMag = options.maxMag ?? 6.0;
  const showLabels = options.showLabels ?? true;
  const showReticle = options.showReticle ?? true;
  const showCompass = options.showCompass ?? true;
  const southUp = options.southUp ?? false;
  const dimBelow = options.dimBelowHorizon ?? true;

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

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const cssWidth = Math.round(rect.width || 360);
  const cssHeight = Math.round(rect.height || 360);

  // Set internal buffer sized for retina/high-DPI sharpness
  canvas.width = cssWidth * dpr;
  canvas.height = cssHeight * dpr;

  const ctx = canvas.getContext('2d');
  if (!ctx) return { starCount: 0, stars: [], horizonParams: null };

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

  // Subtle circular border / vignette clip
  ctx.strokeStyle = '#30363d';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, cssWidth, cssHeight);

  // 2. Compute Stars
  const horizonOpt = hasObserver
    ? { lat: options.observerLat!, lon: options.observerLon!, date: currentDate }
    : undefined;
  const stars = getStarsInField(planet.ra, planet.dec, fovDeg, maxMag, cssWidth, cssHeight, southUp, horizonOpt);

  // 3. Draw Stars
  for (const s of stars) {
    const isDimmed = Boolean(s.isBelowHorizon && dimBelow);

    ctx.save();
    if (isDimmed) {
      ctx.globalAlpha = 0.28;
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
    const drawRadius = isDimmed ? Math.max(0.85, s.radius * 0.75) : s.radius;
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
      ctx.lineTo(s.px, s.py + spikeLen);
      ctx.stroke();
    }

    // Star Name / Bayer designation label
    if (showLabels && s.name && s.mag <= 5.2) {
      ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = isDimmed ? 'rgba(100, 116, 139, 0.4)' : (s.mag <= 3.0 ? '#e6edf3' : '#8b949e');
      ctx.fillText(s.name, s.px + drawRadius + 4, s.py + 3);
    }

    ctx.restore();
  }

  // 4. Ground Shading & Horizon Boundary
  const d2r = Math.PI / 180;
  const limitX = Math.tan((fovDeg / 2) * d2r);
  const limitY = Math.tan((fovDeg / 2) * d2r);
  const scaleX = cssWidth / (2 * limitX);
  const scaleY = cssHeight / (2 * limitY);

  if (horizonParams && options.renderHorizon !== false) {
    const horizonGeom = computeGroundPolygonAndHorizon(
      horizonParams.c0,
      horizonParams.cx,
      horizonParams.cy,
      cssWidth,
      cssHeight,
      scaleX,
      scaleY,
      southUp
    );

    // Fill ground overlay
    if (horizonGeom.groundVertices.length >= 3) {
      ctx.save();
      ctx.fillStyle = 'rgba(8, 14, 20, 0.72)';
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
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = '#34d399';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('━━━ HORIZON ━━━', 0, -3);
      ctx.restore();
    }
  }

  // 5. Center Telrad / Reticle (1° diameter circle = 0.5° radius)
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

  // 6. Draw Planet at Exact Center
  const pStyle = PLANET_COLORS[planet.key] || {
    fill: '#fde68a',
    stroke: '#eab308',
    glow: 'rgba(253, 230, 138, 0.4)',
    name: planet.name
  };

  const isPlanetBelow = horizonParams ? horizonParams.planetAltDeg < 0 : false;

  ctx.save();
  if (isPlanetBelow) {
    ctx.globalAlpha = 0.70;
  }

  // Planet outer atmospheric glow
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
  ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = isPlanetBelow ? '#cbd5e1' : '#ffffff';
  ctx.fillText(`${planet.symbol} ${planet.name}${isPlanetBelow ? ' (Below)' : ''}`, cx + 9, cy - 8);

  ctx.restore();

  // 7. Cardinal Directions
  // North-Up: N top, S bottom, E left, W right
  // South-Up: S top, N bottom, W left, E right
  if (showCompass) {
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = 'rgba(139, 148, 158, 0.65)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(southUp ? 'S' : 'N', cx, 6);

    ctx.textBaseline = 'bottom';
    ctx.fillText(southUp ? 'N' : 'S', cx, cssHeight - 5);

    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(southUp ? 'W' : 'E', 8, cy);

    ctx.textAlign = 'right';
    ctx.fillText(southUp ? 'E' : 'W', cssWidth - 8, cy);
  }

  // 8. Corner Scale & HUD Overlays
  // Top-left: FOV & Orientation badge
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#8b949e';
  ctx.fillText(`${fovDeg.toFixed(0)}° × ${fovDeg.toFixed(0)}° FOV`, 10, 10);

  ctx.font = '9px monospace';
  ctx.fillStyle = southUp ? '#38bdf8' : '#64748b';
  ctx.fillText(southUp ? 'SOUTH UP (INVERTED)' : 'NORTH UP', 10, 24);

  // Top-right: Planet altitude
  if (horizonParams) {
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const altDeg = horizonParams.planetAltDeg;
    ctx.fillStyle = altDeg >= 0 ? '#34d399' : '#f87171';
    const sign = altDeg >= 0 ? '+' : '';
    ctx.fillText(`Alt: ${sign}${altDeg.toFixed(1)}°${altDeg < 0 ? ' (Below)' : ''}`, cssWidth - 10, 10);
  }

  // Bottom-left: 1° scale bar
  const barLen = oneDegreePx * 2; // diameter of 1-deg circle = 1 full degree
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

  ctx.font = '9px monospace';
  ctx.fillStyle = '#8b949e';
  ctx.fillText('1°', barX + barLen / 2 - 5, barY - 11);

  // Bottom-right: Star count
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.font = '9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText(`${stars.length} stars (mag ≤ ${maxMag.toFixed(1)})`, cssWidth - 10, cssHeight - 8);

  ctx.restore();

  return { starCount: stars.length, stars, horizonParams };
}
