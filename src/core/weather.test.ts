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

  it('correctly calculates temperature range, feels like, dew/frost risk, and wind speed', () => {
    const payload = {
      utc_offset_seconds: -14400,
      hourly: {
        time: ['2026-10-18T19:00', '2026-10-18T22:00', '2026-10-19T02:00'],
        cloud_cover: [10, 5, 0],
        temperature_2m: [4.0, 1.0, -2.0], // Dropping from 4°C (39°F) down to -2°C (28°F)
        apparent_temperature: [1.0, -2.0, -6.0],
        dew_point_2m: [3.0, 0.5, -2.5], // Close to temp -> high frost/dew risk!
        wind_speed_10m: [16.1, 12.0, 8.0] // ~10 mph, ~7 mph, ~5 mph
      }
    };

    const forecast = parseCloudPayload(payload, 40.71, -74.00, new Date('2026-10-18T19:00:00Z'));

    expect(forecast.currentTempC).toBe(4);
    expect(forecast.currentTempF).toBe(39); // 4 * 9/5 + 32 = 39.2 -> 39
    expect(forecast.minTempC).toBe(-2);
    expect(forecast.minTempF).toBe(28); // -2 * 9/5 + 32 = 28.4 -> 28
    expect(forecast.maxTempC).toBe(4);
    expect(forecast.maxTempF).toBe(39);

    // Dew / Frost Risk: min temp <= 0 and depression <= 1.5 -> High Frost Risk!
    expect(forecast.dewRisk).toBe('high');
    expect(forecast.dewRiskLabel).toContain('Frost');

    // Wind speed conversion
    expect(forecast.windSpeedMph).toBe(10); // 16.1 * 0.621371 = 10.00
  });
});
