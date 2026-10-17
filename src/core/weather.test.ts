import { describe, it, expect } from 'vitest';
import { parseCloudPayload } from './weather.ts';

describe('Weather & Observing Window Engine', () => {
  const ST_AUGUSTINE = { lat: 29.9012, lon: -81.3124 };
  const REF_DATE = new Date('2026-09-26T20:00:00.000Z');

  it('correctly parses Open-Meteo payload into dark-hours observing window', () => {
    const times = [];
    const clouds = [];
    for (let hr = 12; hr <= 23; hr++) {
      times.push(`2026-09-26T${hr < 10 ? '0' : ''}${hr}:00`);
      clouds.push(hr === 22 ? 0 : 15);
    }
    for (let hr2 = 0; hr2 <= 12; hr2++) {
      times.push(`2026-09-27T${hr2 < 10 ? '0' : ''}${hr2}:00`);
      clouds.push(20);
    }

    const payload = {
      utc_offset_seconds: -14400,
      timezone: 'America/New_York',
      hourly: {
        time: times,
        cloud_cover: clouds
      }
    };

    const forecast = parseCloudPayload(payload, ST_AUGUSTINE.lat, ST_AUGUSTINE.lon, REF_DATE);

    expect(forecast.hourlyWindow.length).toBeGreaterThanOrEqual(10);
    const first = forecast.hourlyWindow[0];
    expect(first.hr).toBe(19); // 7 PM EDT is first hour post-sunset
    expect(first.clarity).toBe(100 - first.cloud);

    const last = forecast.hourlyWindow[forecast.hourlyWindow.length - 1];
    expect(last.hr).toBeGreaterThanOrEqual(5);
    expect(last.hr).toBeLessThanOrEqual(7);

    // Clearest hour should be 22:00 (10 PM) with 0% clouds
    expect(forecast.bestWindow).not.toBeNull();
    expect(forecast.bestWindow!.hr).toBe(22);
    expect(forecast.bestWindow!.cloud).toBe(0);

    // Stargazing verdict
    expect(forecast.verdict).toBe('Clear — great for observing');
    expect(forecast.verdictEmoji).toBe('🌟');

    // Midnight hour should be classified as true astronomical dark sky
    const midnight = forecast.hourlyWindow.find(h => h.hr === 0);
    expect(midnight).toBeDefined();
    expect(midnight!.isDarkSky).toBe(true);
  });

  it('escalates stargazing verdicts according to average cloud thresholds', () => {
    const makePayload = (cloudVal: number) => ({
      utc_offset_seconds: -14400,
      hourly: {
        time: ['2026-09-26T19:00', '2026-09-26T20:00', '2026-09-26T21:00'],
        cloud_cover: [cloudVal, cloudVal, cloudVal]
      }
    });

    const clear = parseCloudPayload(makePayload(10), ST_AUGUSTINE.lat, ST_AUGUSTINE.lon, REF_DATE);
    expect(clear.verdict).toContain('Clear');

    const partly = parseCloudPayload(makePayload(45), ST_AUGUSTINE.lat, ST_AUGUSTINE.lon, REF_DATE);
    expect(partly.verdict).toContain('Partly cloudy');

    const mostly = parseCloudPayload(makePayload(75), ST_AUGUSTINE.lat, ST_AUGUSTINE.lon, REF_DATE);
    expect(mostly.verdict).toContain('Mostly cloudy');

    const overcast = parseCloudPayload(makePayload(95), ST_AUGUSTINE.lat, ST_AUGUSTINE.lon, REF_DATE);
    expect(overcast.verdict).toContain('Overcast');
  });
});
