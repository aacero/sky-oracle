import { ZODIAC_STARS } from './zodiacStars.ts';

export interface ProjectedStar {
  ra: number;
  dec: number;
  mag: number;
  bv: number;
  name?: string;
  x: number;      // Tangent plane X (normalized)
  y: number;      // Tangent plane Y (normalized)
  px: number;     // Canvas pixel X (East is left)
  py: number;     // Canvas pixel Y (North is up)
  radius: number; // Pixel radius for rendering
  color: string;  // CSS color based on B-V
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

export interface StarfieldOptions {
  fovDeg?: number;      // Field of view in degrees (default: 10.0)
  maxMag?: number;      // Magnitude cutoff (default: 6.0)
  showLabels?: boolean; // Show star names/Bayer designations (default: true)
  showReticle?: boolean;// Show 1° Telrad-style reticle (default: true)
  showCompass?: boolean;// Show N/E/S/W indicators (default: true)
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
 * Standard Gnomonic (tangent plane) projection.
 * Projects (ra, dec) onto a tangent plane centered at (ra0, dec0).
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
 * Filters and projects stars inside a square Field of View (FOV) centered on (centerRa, centerDec).
 */
export function getStarsInField(
  centerRaDeg: number,
  centerDecDeg: number,
  fovDeg: number = 10.0,
  maxMag: number = 6.0,
  width: number = 360,
  height: number = 360
): ProjectedStar[] {
  const d2r = Math.PI / 180;
  const limitX = Math.tan((fovDeg / 2) * d2r);
  const limitY = Math.tan((fovDeg / 2) * d2r);

  const scaleX = width / (2 * limitX);
  const scaleY = height / (2 * limitY);

  const results: ProjectedStar[] = [];

  for (let i = 0; i < ZODIAC_STARS.length; i++) {
    const [ra, dec, mag, bv, name] = ZODIAC_STARS[i];
    if (mag > maxMag) continue;

    const proj = projectCoordinates(ra, dec, centerRaDeg, centerDecDeg);
    if (!proj) continue;

    if (Math.abs(proj.x) <= limitX && Math.abs(proj.y) <= limitY) {
      // Astronomical sky view convention:
      // East is LEFT (px decreases as X increases)
      // North is UP (py decreases as Y increases)
      const px = width / 2 - proj.x * scaleX;
      const py = height / 2 - proj.y * scaleY;

      // Realistic magnitude-to-radius curve:
      // Mag 0: ~5.0px, Mag 1: ~4.2px, Mag 3: ~3.0px, Mag 5: ~1.7px, Mag 6: ~1.1px
      const radius = Math.max(1.0, (6.3 - mag) * 0.85);
      const color = bvToColor(bv);

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
        color
      });
    }
  }

  return results;
}

/**
 * High-DPI canvas renderer for a 10°x10° centered planet starfield.
 */
export function renderStarfield(
  canvas: HTMLCanvasElement,
  planet: PlanetFieldData,
  options: StarfieldOptions = {}
): { starCount: number; stars: ProjectedStar[] } {
  const fovDeg = options.fovDeg ?? 10.0;
  const maxMag = options.maxMag ?? 6.0;
  const showLabels = options.showLabels ?? true;
  const showReticle = options.showReticle ?? true;
  const showCompass = options.showCompass ?? true;

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const cssWidth = Math.round(rect.width || 360);
  const cssHeight = Math.round(rect.height || 360);

  // Set internal buffer sized for retina/high-DPI sharpness
  canvas.width = cssWidth * dpr;
  canvas.height = cssHeight * dpr;

  const ctx = canvas.getContext('2d');
  if (!ctx) return { starCount: 0, stars: [] };

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
  const stars = getStarsInField(planet.ra, planet.dec, fovDeg, maxMag, cssWidth, cssHeight);

  // 3. Draw Stars
  for (const s of stars) {
    // Soft outer glow for prominent stars (mag <= 3.5)
    if (s.mag <= 3.5) {
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
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(s.px, s.py, s.radius, 0, Math.PI * 2);
    ctx.fill();

    // Subtle 4-point diffraction spike for brilliant stars (mag <= 1.5)
    if (s.mag <= 1.5) {
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
      ctx.fillStyle = s.mag <= 3.0 ? '#e6edf3' : '#8b949e';
      ctx.fillText(s.name, s.px + s.radius + 4, s.py + 3);
    }
  }

  // 4. Center Telrad / Reticle (1° diameter circle = 0.5° radius)
  const d2r = Math.PI / 180;
  const limitX = Math.tan((fovDeg / 2) * d2r);
  const scale = cssWidth / (2 * limitX);
  const oneDegreePx = Math.tan(0.5 * d2r) * scale; // radius of 1-deg circle

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
    // North tick
    ctx.moveTo(cx, cy - oneDegreePx);
    ctx.lineTo(cx, cy - oneDegreePx - tickLen);
    // South tick
    ctx.moveTo(cx, cy + oneDegreePx);
    ctx.lineTo(cx, cy + oneDegreePx + tickLen);
    // East tick (left)
    ctx.moveTo(cx - oneDegreePx, cy);
    ctx.lineTo(cx - oneDegreePx - tickLen, cy);
    // West tick (right)
    ctx.moveTo(cx + oneDegreePx, cy);
    ctx.lineTo(cx + oneDegreePx + tickLen, cy);
    ctx.stroke();
  }

  // 5. Draw Planet at Exact Center
  const pStyle = PLANET_COLORS[planet.key] || {
    fill: '#fde68a',
    stroke: '#eab308',
    glow: 'rgba(253, 230, 138, 0.4)',
    name: planet.name
  };

  // Planet outer atmospheric glow
  const pGlow = ctx.createRadialGradient(cx, cy, 2, cx, cy, 18);
  pGlow.addColorStop(0, pStyle.glow);
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
  ctx.stroke();

  // Planet label beside center disc
  ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${planet.symbol} ${planet.name}`, cx + 9, cy - 8);

  // 6. Cardinal Directions (Astronomical Convention: N up, E left, S down, W right)
  if (showCompass) {
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = 'rgba(139, 148, 158, 0.65)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('N', cx, 6);

    ctx.textBaseline = 'bottom';
    ctx.fillText('S', cx, cssHeight - 5);

    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText('E', 8, cy);

    ctx.textAlign = 'right';
    ctx.fillText('W', cssWidth - 8, cy);
  }

  // 7. Corner Scale & HUD Overlays
  // FOV badge in top-left
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#8b949e';
  ctx.fillText(`${fovDeg.toFixed(0)}° × ${fovDeg.toFixed(0)}° FOV`, 10, 10);

  // 1° scale bar in bottom-left
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

  // Star count in bottom-right
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.font = '9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText(`${stars.length} stars (mag ≤ ${maxMag.toFixed(1)})`, cssWidth - 10, cssHeight - 8);

  ctx.restore();

  return { starCount: stars.length, stars };
}
