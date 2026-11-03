import { describe, it, expect, beforeEach } from 'vitest';
import {
  t,
  getLocale,
  setLocale,
  SUPPORTED_LOCALES,
  onLocaleChange,
  formatLocalizedDate,
  formatLocalizedTime
} from './i18n.ts';

describe('Lightweight i18n Engine', () => {
  beforeEach(() => {
    setLocale('en');
  });

  it('supports en, es, pt, de, fr', () => {
    const codes = SUPPORTED_LOCALES.map(l => l.code);
    expect(codes).toEqual(['en', 'es', 'pt', 'de', 'fr']);
  });

  it('translates basic keys with English default', () => {
    expect(t('verdict.clear')).toBe('Clear — great for observing');
    expect(t('planets.mars')).toBe('Mars');
    expect(t('moon.phase.full_moon')).toBe('Full Moon');
  });

  it('interpolates parameters correctly', () => {
    expect(t('moon.illum', { pct: 85 })).toBe('85% illuminated');
    expect(t('starfield.stars_count', { count: 120 })).toBe('120 stars');
    expect(t('planets.evening_sets', { time: '9:30 PM' })).toBe('Evening · sets 9:30 PM');
  });

  it('switches languages dynamically and notifies listeners', () => {
    let notifiedLocale = '';
    const unsubscribe = onLocaleChange((loc) => {
      notifiedLocale = loc;
    });

    setLocale('es');
    expect(getLocale()).toBe('es');
    expect(notifiedLocale).toBe('es');
    expect(t('verdict.clear')).toBe('Despejado — excelente para observar');
    expect(t('planets.mars')).toBe('Marte');
    expect(t('moon.phase.full_moon')).toBe('Luna Llena');

    setLocale('pt');
    expect(getLocale()).toBe('pt');
    expect(t('verdict.clear')).toBe('Céu limpo — excelente para observar');
    expect(t('planets.mars')).toBe('Marte');
    expect(t('moon.phase.full_moon')).toBe('Lua Cheia');

    setLocale('de');
    expect(getLocale()).toBe('de');
    expect(t('verdict.clear')).toBe('Klar — hervorragend zum Beobachten');
    expect(t('planets.mars')).toBe('Mars');
    expect(t('moon.phase.full_moon')).toBe('Vollmond');

    setLocale('fr');
    expect(getLocale()).toBe('fr');
    expect(t('verdict.clear')).toBe('Dégagé — excellent pour observer');
    expect(t('planets.mars')).toBe('Mars');
    expect(t('moon.phase.full_moon')).toBe('Pleine Lune');

    unsubscribe();
  });

  it('falls back to English when a key does not exist in target locale', () => {
    setLocale('fr');
    // nonexistent key
    expect(t('unknown.nonexistent_key')).toBe('unknown.nonexistent_key');
  });

  it('formats dates and times using the locale', () => {
    const testDate = new Date('2026-10-15T21:45:00Z');
    setLocale('en');
    const enDate = formatLocalizedDate(testDate);
    const enTime = formatLocalizedTime(testDate);
    expect(enDate).toBeTruthy();
    expect(enTime).toBeTruthy();

    setLocale('de');
    const deDate = formatLocalizedDate(testDate);
    const deTime = formatLocalizedTime(testDate);
    expect(deDate).toBeTruthy();
    expect(deTime).toBeTruthy();
  });
});
