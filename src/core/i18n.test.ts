import { describe, it, expect, beforeEach } from 'vitest';
import {
  t,
  getLocale,
  setLocale,
  SUPPORTED_LOCALES,
  onLocaleChange,
  formatLocalizedDate,
  formatLocalizedTime,
  TranslationKey
} from './i18n.ts';

describe('Lightweight i18n Engine', () => {
  beforeEach(() => {
    setLocale('en');
  });

  it('supports en, es, pt, de, fr, it, ja', () => {
    const codes = SUPPORTED_LOCALES.map(l => l.code);
    expect(codes).toEqual(['en', 'es', 'pt', 'de', 'fr', 'it', 'ja']);
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

    setLocale('it');
    expect(getLocale()).toBe('it');
    expect(t('verdict.clear')).toBe("Sereno — ideale per l'osservazione");
    expect(t('planets.mars')).toBe('Marte');
    expect(t('moon.phase.full_moon')).toBe('Luna Piena');

    setLocale('ja');
    expect(getLocale()).toBe('ja');
    expect(t('verdict.clear')).toBe('快晴 — 絶好の天体観測日和');
    expect(t('planets.mars')).toBe('火星');
    expect(t('moon.phase.full_moon')).toBe('満月（望）');
    expect(t('app.privacy_badge')).toBe('プライバシー重視の天体観測');

    unsubscribe();
  });

  it('translates privacy badge across all locales', () => {
    const expected: Record<string, string> = {
      en: 'Privacy-Preserving Astronomy',
      es: 'Astronomía con Privacidad Garantizada',
      pt: 'Astronomia com Privacidade',
      de: 'Datenschutzfreundliche Astronomie',
      fr: 'Astronomie Respectueuse de la Vie Privée',
      it: 'Astronomia a Tutela della Privacy',
      ja: 'プライバシー重視の天体観測'
    };
    for (const [loc, text] of Object.entries(expected)) {
      setLocale(loc as any);
      expect(t('app.privacy_badge')).toBe(text);
    }
  });

  it('translates tour guide CTA across all locales', () => {
    const expected: Record<string, string> = {
      en: 'Tour: Interactive Guide',
      es: 'Guía: Tour interactivo',
      pt: 'Guia: Tour interativo',
      de: 'Tour: Interaktive Anleitung',
      fr: 'Visite: Guide interactif',
      it: 'Tour: Guida interattiva',
      ja: 'ツアー：操作ガイド'
    };
    for (const [loc, text] of Object.entries(expected)) {
      setLocale(loc as any);
      expect(t('app.tour_guide')).toBe(text);
    }
  });

  it('falls back to English when a key does not exist in target locale', () => {
    setLocale('fr');
    // nonexistent key (cast to test runtime fallback behavior)
    expect(t('unknown.nonexistent_key' as unknown as TranslationKey)).toBe('unknown.nonexistent_key');
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
