import { MoonInfo } from '../core/astronomy.ts';

const moonImage = new Image();
let moonImageLoaded = false;
let currentMoonState: MoonInfo | null = null;

moonImage.src = './moon_photo.png';
moonImage.onload = () => {
  moonImageLoaded = true;
  drawMoonCanvas(currentMoonState);
};
if (moonImage.complete && moonImage.naturalWidth !== 0) {
  moonImageLoaded = true;
}

/**
 * Renders the realistic illuminated Moon disc and terminator on `#moonCanvas`.
 */
export function drawMoonCanvas(moon: MoonInfo | null): void {
  currentMoonState = moon;
  const canvas = document.getElementById('moonCanvas') as HTMLCanvasElement | null;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.max(0, Math.min(width, height) / 2 - 6);

  ctx.save();
  ctx.clearRect(0, 0, width, height);
  if (radius <= 0) {
    ctx.restore();
    return;
  }

  // Base circular clip for the whole moon disc
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();

  // Dark background disc
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

  // Unilluminated Earthshine layer: faint realistic moon photo
  if (moonImageLoaded && moonImage.complete && moonImage.naturalWidth !== 0) {
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.drawImage(moonImage, cx - radius, cy - radius, radius * 2, radius * 2);
    ctx.restore();
  } else {
    ctx.fillStyle = '#161b22';
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
  }

  // Illuminated portion with Bezier terminator clipping
  const cyclePos = moon ? moon.cyclePos : 0.25;
  const phase = Math.max(0, Math.min(1, cyclePos));
  const k = 1.333333; // 4/3 cubic Bezier constant for circle arc approximation

  if (phase > 0.001 && phase < 0.999) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy - radius);

    if (phase <= 0.5) {
      // Waxing (illuminated on right)
      ctx.bezierCurveTo(
        cx + k * radius, cy - radius,
        cx + k * radius, cy + radius,
        cx, cy + radius
      );
      const waxingTerminator = cx + k * radius * Math.cos(2 * Math.PI * phase);
      ctx.bezierCurveTo(
        waxingTerminator, cy + radius,
        waxingTerminator, cy - radius,
        cx, cy - radius
      );
    } else {
      // Waning (illuminated on left)
      ctx.bezierCurveTo(
        cx - k * radius, cy - radius,
        cx - k * radius, cy + radius,
        cx, cy + radius
      );
      const waningTerminator = cx - k * radius * Math.cos(2 * Math.PI * phase);
      ctx.bezierCurveTo(
        waningTerminator, cy + radius,
        waningTerminator, cy - radius,
        cx, cy - radius
      );
    }

    ctx.closePath();
    ctx.clip();

    // Draw full-brightness realistic photo in illuminated region
    if (moonImageLoaded && moonImage.complete && moonImage.naturalWidth !== 0) {
      ctx.drawImage(moonImage, cx - radius, cy - radius, radius * 2, radius * 2);
    } else {
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    }
    ctx.restore();
  }

  ctx.restore(); // Restore base circular clip

  // Subtle luminous rim / accent ring
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
  ctx.lineWidth = Math.max(2, radius * 0.035);
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore(); // Restore initial canvas state
}
