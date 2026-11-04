import { describe, it, expect } from 'vitest';
import {
  parseCloudPayload,
  calculateHourStargazingScore,
  findBestObservingWindow,
  ObservingHour
} from './weather.ts';

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

  it('selects a contiguous dark-sky window prioritizing astronomical darkness over dusk twilight', () => {
    // 6:00 PM (twilight, sunAlt -10°), 7:00 PM - 2:00 AM (dark sky, 0% cloud, moon down), 3:00 AM+ (moon up)
    const hours: ObservingHour[] = [
      { hr: 18, label: '6:00 PM', labelCompact: '6p', cloud: 0, clarity: 100, isDarkSky: false, sunAlt: -10, moonAlt: -30, moonIllum: 50, tempC: 16, tempF: 61, feelsLikeC: 16, feelsLikeF: 61, dewPointC: 11, dewPointF: 52, windSpeedMph: 6, windSpeedKmh: 10, score: 49 },
      { hr: 19, label: '7:00 PM', labelCompact: '7p', cloud: 0, clarity: 100, isDarkSky: true,  sunAlt: -19, moonAlt: -25, moonIllum: 50, tempC: 15, tempF: 59, feelsLikeC: 15, feelsLikeF: 59, dewPointC: 11, dewPointF: 52, windSpeedMph: 5, windSpeedKmh: 8,  score: 95 },
      { hr: 20, label: '8:00 PM', labelCompact: '8p', cloud: 0, clarity: 100, isDarkSky: true,  sunAlt: -30, moonAlt: -20, moonIllum: 50, tempC: 14, tempF: 57, feelsLikeC: 14, feelsLikeF: 57, dewPointC: 11, dewPointF: 52, windSpeedMph: 5, windSpeedKmh: 8,  score: 97 },
      { hr: 21, label: '9:00 PM', labelCompact: '9p', cloud: 0, clarity: 100, isDarkSky: true,  sunAlt: -42, moonAlt: -15, moonIllum: 50, tempC: 13, tempF: 55, feelsLikeC: 13, feelsLikeF: 55, dewPointC: 11, dewPointF: 52, windSpeedMph: 4, windSpeedKmh: 6,  score: 98 },
      { hr: 22, label: '10:00 PM', labelCompact: '10p', cloud: 0, clarity: 100, isDarkSky: true, sunAlt: -52, moonAlt: -10, moonIllum: 50, tempC: 13, tempF: 55, feelsLikeC: 13, feelsLikeF: 55, dewPointC: 11, dewPointF: 52, windSpeedMph: 4, windSpeedKmh: 6, score: 99 },
      { hr: 23, label: '11:00 PM', labelCompact: '11p', cloud: 0, clarity: 100, isDarkSky: true, sunAlt: -58, moonAlt: -5,  moonIllum: 50, tempC: 12, tempF: 54, feelsLikeC: 12, feelsLikeF: 54, dewPointC: 11, dewPointF: 52, windSpeedMph: 4, windSpeedKmh: 6, score: 100 },
      { hr: 0,  label: '12:00 AM', labelCompact: '12a', cloud: 0, clarity: 100, isDarkSky: true, sunAlt: -56, moonAlt: -2,  moonIllum: 50, tempC: 12, tempF: 54, feelsLikeC: 12, feelsLikeF: 54, dewPointC: 11, dewPointF: 52, windSpeedMph: 3, windSpeedKmh: 5, score: 100 },
      { hr: 1,  label: '1:00 AM', labelCompact: '1a', cloud: 0, clarity: 100, isDarkSky: true,  sunAlt: -48, moonAlt: -0.5, moonIllum: 50, tempC: 11, tempF: 52, feelsLikeC: 11, feelsLikeF: 52, dewPointC: 11, dewPointF: 52, windSpeedMph: 3, windSpeedKmh: 5, score: 98 },
      { hr: 2,  label: '2:00 AM', labelCompact: '2a', cloud: 0, clarity: 100, isDarkSky: true,  sunAlt: -38, moonAlt: 0,   moonIllum: 50, tempC: 11, tempF: 52, feelsLikeC: 11, feelsLikeF: 52, dewPointC: 10, dewPointF: 50, windSpeedMph: 3, windSpeedKmh: 5, score: 96 },
      { hr: 3,  label: '3:00 AM', labelCompact: '3a', cloud: 10, clarity: 90, isDarkSky: true,  sunAlt: -28, moonAlt: 15,  moonIllum: 50, tempC: 10, tempF: 50, feelsLikeC: 10, feelsLikeF: 50, dewPointC: 10, dewPointF: 50, windSpeedMph: 4, windSpeedKmh: 6, score: 75 }
    ];

    const best = findBestObservingWindow(hours);
    expect(best).not.toBeNull();
    // 6:00 PM must NOT be the start of the best window since Astro Dusk is 7:00 PM
    expect(best!.startHour).toBe(19);
    expect(best!.startLabel).toBe('7:00 PM');
    // Window ends at 2:00 AM before moon rises high
    expect(best!.endHour).toBe(2);
    expect(best!.endLabel).toBe('2:00 AM');
    expect(best!.durationHours).toBe(8);
    expect(best!.label).toBe('7:00 PM – 2:00 AM');
    expect(best!.avgCloud).toBe(0);

    // Peak hour should be solar midnight / deepest darkness hour
    expect(best!.peakHour.hr).toBe(23);
    expect(best!.peakHour.isPeakHour).toBe(true);

    // Verify hour flags
    expect(hours[0].inBestBlock).toBe(false); // 6:00 PM
    expect(hours[1].inBestBlock).toBe(true);  // 7:00 PM
    expect(hours[8].inBestBlock).toBe(true);  // 2:00 AM
    expect(hours[9].inBestBlock).toBe(false); // 3:00 AM
  });

  it('calculates stargazing quality scores penalizing twilight and lunar glare', () => {
    const epochMs = new Date('2026-11-03T03:00:00Z').getTime();

    // 1. Pristine dark sky: Sun -30°, Moon down, 0% cloud
    const pristine = calculateHourStargazingScore(0, -30, -20, 50, 15, 10, 5, epochMs, epochMs);
    expect(pristine).toBeGreaterThanOrEqual(95);

    // 2. Dusk twilight: Sun -8° (nautical twilight), Moon down, 0% cloud
    const twilight = calculateHourStargazingScore(0, -8, -20, 50, 15, 10, 5, epochMs, epochMs);
    expect(twilight).toBeLessThan(50);
    expect(pristine).toBeGreaterThan(twilight + 40);

    // 3. Bright moon high in sky (Moon 50° alt, 100% illum) vs Moon down
    const moonlit = calculateHourStargazingScore(0, -30, 50, 100, 15, 10, 5, epochMs, epochMs);
    expect(pristine).toBeGreaterThan(moonlit);
  });
});
