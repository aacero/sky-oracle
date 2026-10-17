import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const outDir = path.resolve('store-assets');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function capture() {
  console.log('Launching Chromium for Play Store screenshots...');
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // 1. Phone Top (1080 x 1920 - exact 9:16, max:min <= 2:1 for Play Console)
  console.log('Capturing Phone Screenshot 1 (Overview)...');
  await page.setViewport({ width: 360, height: 640, deviceScaleFactor: 3 });
  await page.goto('https://aacero.github.io/sky-tonight/', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#moonCanvas');
  // Wait a moment for canvas and animations to render cleanly
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(outDir, 'screenshot-phone-1.png') });

  // 2. Phone Scrolled (Moon Phase Canvas)
  console.log('Capturing Phone Screenshot 2 (Moon Canvas)...');
  await page.evaluate(() => {
    const el = document.getElementById('moonCanvas');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(outDir, 'screenshot-phone-2.png') });

  // 3. Phone Scrolled (Solar Twilight Timeline)
  console.log('Capturing Phone Screenshot 3 (Solar Twilights)...');
  await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll('h3'));
    const twHeading = headings.find(h => h.textContent.includes('SOLAR TWILIGHT'));
    if (twHeading) twHeading.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(outDir, 'screenshot-phone-3.png') });

  // 4. Phone Scrolled (Naked-Eye Planets Ephemeris)
  console.log('Capturing Phone Screenshot 4 (Naked-Eye Planets)...');
  await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll('h3'));
    const pHeading = headings.find(h => h.textContent.includes('NAKED-EYE PLANETS'));
    if (pHeading) pHeading.scrollIntoView({ behavior: 'instant', block: 'start' });
    else window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });
  });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(outDir, 'screenshot-phone-4.png') });

  // 5. Phone Modal (Location & Dark-Sky Search)
  console.log('Capturing Phone Screenshot 5 (Location Picker Modal)...');
  await page.evaluate(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
  await page.click('#btnOpenSearch');
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(outDir, 'screenshot-phone-5.png') });

  // 3. Tablet 7-inch (1200 x 1920 portrait)
  console.log('Capturing Tablet 7-inch Screenshot...');
  await page.setViewport({ width: 600, height: 960, deviceScaleFactor: 2 });
  await page.goto('https://aacero.github.io/sky-tonight/', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(outDir, 'screenshot-tablet-7in.png') });

  // 4. Tablet 10-inch (1920 x 1200 landscape)
  console.log('Capturing Tablet 10-inch Screenshot (Landscape)...');
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1.5 });
  await page.goto('https://aacero.github.io/sky-tonight/', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(outDir, 'screenshot-tablet-10in.png') });

  await browser.close();
  console.log('All screenshots captured successfully in store-assets/');
}

capture().catch(err => {
  console.error('Error capturing screenshots:', err);
  process.exit(1);
});
