import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  escapeHtml,
  loadTempUnit,
  saveTempUnit,
  loadLocation,
  saveLocation,
  loadRecents,
  DEFAULT_LOCATION
} from './storage.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = resolve(__dirname, '../..');

describe('Storage, HTML Escaping & Hygiene Invariants', () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k),
      clear: () => store.clear()
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('escapeHtml()', () => {
    it('escapes HTML special characters in city names and attributes', () => {
      const malicious = `St. John's <script>alert("xss")</script> & Co.`;
      const escaped = escapeHtml(malicious);
      expect(escaped).toBe(
        `St. John&#39;s &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; Co.`
      );
      expect(escaped).not.toContain('<');
      expect(escaped).not.toContain('>');
      expect(escaped).not.toContain('"');
      expect(escaped).not.toContain("'");
    });
  });

  describe('loadTempUnit() & saveTempUnit()', () => {
    it('defaults to Fahrenheit (F) for US locales', () => {
      vi.stubGlobal('navigator', { language: 'en-US' });
      expect(loadTempUnit()).toBe('F');

      vi.stubGlobal('navigator', { language: 'es-US' });
      expect(loadTempUnit()).toBe('F');
    });

    it('defaults to Celsius (C) for non-US international locales', () => {
      for (const lang of ['en-GB', 'de-DE', 'fr-FR', 'es-ES', 'pt-BR', 'it-IT', 'ja-JP']) {
        vi.stubGlobal('navigator', { language: lang });
        expect(loadTempUnit(), `Expected Celsius for locale ${lang}`).toBe('C');
      }
    });

    it('persists explicit user preference and migrates legacy key', () => {
      vi.stubGlobal('navigator', { language: 'en-US' });
      saveTempUnit('C');
      expect(loadTempUnit()).toBe('C');

      store.clear();
      store.set('sky_tonight_temp_unit', 'C');
      expect(loadTempUnit()).toBe('C');
    });
  });

  describe('loadLocation(), saveLocation() & loadRecents()', () => {
    it('returns DEFAULT_LOCATION when storage is empty and persists new locations', () => {
      expect(loadLocation()).toEqual(DEFAULT_LOCATION);

      const madrid = { place: 'Madrid, Spain', lat: 40.4168, lon: -3.7038 };
      saveLocation(madrid);
      expect(loadLocation()).toEqual(madrid);

      const recents = loadRecents();
      expect(recents[0]).toEqual(madrid);
    });

    it('transparently reads legacy sky_tonight_location key', () => {
      const tokyo = { place: 'Tokyo, Japan', lat: 35.6762, lon: 139.6503 };
      store.set('sky_tonight_location', JSON.stringify(tokyo));
      expect(loadLocation()).toEqual(tokyo);
    });
  });

  describe('Version & Code Hygiene Invariants', () => {
    it('keeps package.json version, APP_VERSION, and Service Worker CACHE_NAME synchronized', () => {
      const pkg = JSON.parse(readFileSync(resolve(ROOT_DIR, 'package.json'), 'utf8'));
      const mainSrc = readFileSync(resolve(ROOT_DIR, 'src/main.ts'), 'utf8');
      const swSrc = readFileSync(resolve(ROOT_DIR, 'public/sw.js'), 'utf8');

      const appVerMatch = mainSrc.match(/export const APP_VERSION = '([^']+)'/);
      const swCacheMatch = swSrc.match(/const CACHE_NAME = 'sky-oracle-v([^']+)'/);

      expect(appVerMatch?.[1]).toBe(pkg.version);
      expect(swCacheMatch?.[1]).toBe(pkg.version);
    });

    it('contains no blocking alert() calls or untyped any in production source files', () => {
      const mainSrc = readFileSync(resolve(ROOT_DIR, 'src/main.ts'), 'utf8');
      const weatherSrc = readFileSync(resolve(ROOT_DIR, 'src/core/weather.ts'), 'utf8');
      const uiDir = resolve(ROOT_DIR, 'src/ui');
      const uiFiles = readdirSync(uiDir).filter(f => f.endsWith('.ts'));

      expect(mainSrc).not.toMatch(/\balert\s*\(/);
      expect(mainSrc).not.toMatch(/:\s*any\b|\bas\s+any\b/);
      expect(weatherSrc).not.toMatch(/:\s*any\b|\bas\s+any\b/);

      for (const file of uiFiles) {
        const content = readFileSync(resolve(uiDir, file), 'utf8');
        expect(content, `Unexpected alert() in src/ui/${file}`).not.toMatch(/\balert\s*\(/);
        expect(content, `Unexpected any in src/ui/${file}`).not.toMatch(/:\s*any\b|\bas\s+any\b/);
      }
    });
  });
});
