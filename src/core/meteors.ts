/**
 * SkyOracle - Offline Meteor Shower Engine
 *
 * Provides astronomical data, radiant ephemeris, activity modeling,
 * and lunar interference tracking for major annual meteor showers.
 * 100% offline, zero external dependencies.
 */

export interface MeteorShower {
  id: string;
  name: string;
  iauCode: string;
  constellation: string;
  radiant: {
    ra: number; // degrees 0-360
    dec: number; // degrees -90 to +90
  };
  startMonth: number; // 1-12
  startDay: number; // 1-31
  endMonth: number; // 1-12
  endDay: number; // 1-31
  peakMonth: number; // 1-12
  peakDay: number; // 1-31
  peakZhr: number; // Zenithal Hourly Rate at peak
  velocityKmS: number; // atmospheric entry speed in km/s
  parentBody: string; // parent comet or asteroid
  description: string;
}

export interface MeteorShowerSummary {
  shower: MeteorShower;
  isActive: boolean;
  isPeakTonight: boolean;
  daysToPeak: number; // positive = days until peak, negative = days past peak
  peakDate: Date;
  estimatedZhrTonight: number;
  radiantAltitudeNow: number;
  peakRadiantAltitudeTonight: number;
  bestViewingNote: string;
  moonImpact: {
    level: 'minimal' | 'moderate' | 'heavy';
    summary: string;
  };
}

export interface MeteorCardData {
  primaryShower: MeteorShowerSummary | null;
  otherActiveShowers: MeteorShowerSummary[];
  nextUpcomingShower: {
    shower: MeteorShower;
    daysUntilPeak: number;
    peakDate: Date;
  } | null;
}

/**
 * Major annual meteor showers verified against the International Meteor Organization (IMO) catalog
 */
export const MAJOR_METEOR_SHOWERS: MeteorShower[] = [
  {
    id: 'quadrantids',
    name: 'Quadrantids',
    iauCode: 'QUA',
    constellation: 'Boötes',
    radiant: { ra: 230, dec: 49 },
    startMonth: 12, startDay: 28,
    endMonth: 1, endDay: 12,
    peakMonth: 1, peakDay: 4,
    peakZhr: 110,
    velocityKmS: 41,
    parentBody: 'Asteroid 2003 EH1',
    description: 'Sharp, intense peak with bright, medium-speed meteors originating from extinct comet 2003 EH1.'
  },
  {
    id: 'lyrids',
    name: 'Lyrids',
    iauCode: 'LYR',
    constellation: 'Lyra',
    radiant: { ra: 271, dec: 34 },
    startMonth: 4, startDay: 14,
    endMonth: 4, endDay: 30,
    peakMonth: 4, peakDay: 22,
    peakZhr: 18,
    velocityKmS: 49,
    parentBody: 'Comet C/1861 G1 (Thatcher)',
    description: 'Ancient shower producing fast meteors, occasional surges, and persistent dust trains.'
  },
  {
    id: 'eta_aquariids',
    name: 'Eta Aquariids',
    iauCode: 'ETA',
    constellation: 'Aquarius',
    radiant: { ra: 338, dec: -1 },
    startMonth: 4, startDay: 19,
    endMonth: 5, endDay: 28,
    peakMonth: 5, peakDay: 6,
    peakZhr: 50,
    velocityKmS: 66,
    parentBody: '1P/Halley',
    description: 'Swift meteors with long glowing trains formed from the inbound debris stream of Comet Halley.'
  },
  {
    id: 'southern_delta_aquariids',
    name: 'Southern Delta Aquariids',
    iauCode: 'SDA',
    constellation: 'Aquarius',
    radiant: { ra: 340, dec: -16 },
    startMonth: 7, startDay: 12,
    endMonth: 8, endDay: 23,
    peakMonth: 7, peakDay: 30,
    peakZhr: 25,
    velocityKmS: 41,
    parentBody: 'Comet 96P/Machholz',
    description: 'Steady mid-summer activity favoring southern latitudes and late-night observing sessions.'
  },
  {
    id: 'perseids',
    name: 'Perseids',
    iauCode: 'PER',
    constellation: 'Perseus',
    radiant: { ra: 46, dec: 58 },
    startMonth: 7, startDay: 17,
    endMonth: 8, endDay: 24,
    peakMonth: 8, peakDay: 13,
    peakZhr: 100,
    velocityKmS: 59,
    parentBody: 'Comet 109P/Swift-Tuttle',
    description: 'The premier summer display: fast, abundant meteors rich in bright fireballs and glowing ionization trails.'
  },
  {
    id: 'orionids',
    name: 'Orionids',
    iauCode: 'ORI',
    constellation: 'Orion',
    radiant: { ra: 95, dec: 16 },
    startMonth: 10, startDay: 2,
    endMonth: 11, endDay: 7,
    peakMonth: 10, peakDay: 21,
    peakZhr: 20,
    velocityKmS: 66,
    parentBody: '1P/Halley',
    description: 'Very fast meteors with prolonged incandescent trails from the outbound orbit of Comet Halley.'
  },
  {
    id: 'southern_taurids',
    name: 'Southern Taurids',
    iauCode: 'STA',
    constellation: 'Taurus',
    radiant: { ra: 52, dec: 15 },
    startMonth: 9, startDay: 20,
    endMonth: 11, endDay: 20,
    peakMonth: 11, peakDay: 5,
    peakZhr: 10,
    velocityKmS: 27,
    parentBody: 'Comet 2P/Encke',
    description: 'Slow-moving meteors famous for striking, brilliant fireballs that illuminate the ground.'
  },
  {
    id: 'northern_taurids',
    name: 'Northern Taurids',
    iauCode: 'NTA',
    constellation: 'Taurus',
    radiant: { ra: 58, dec: 22 },
    startMonth: 10, startDay: 20,
    endMonth: 12, endDay: 10,
    peakMonth: 11, peakDay: 12,
    peakZhr: 5,
    velocityKmS: 29,
    parentBody: 'Asteroid 2004 TG10',
    description: 'Companion branch to Southern Taurids, offering slow, dramatic fireballs across autumn skies.'
  },
  {
    id: 'leonids',
    name: 'Leonids',
    iauCode: 'LEO',
    constellation: 'Leo',
    radiant: { ra: 152, dec: 22 },
    startMonth: 11, startDay: 6,
    endMonth: 11, endDay: 30,
    peakMonth: 11, peakDay: 17,
    peakZhr: 15,
    velocityKmS: 71,
    parentBody: 'Comet 55P/Tempel-Tuttle',
    description: 'Fastest major meteors striking Earth at 71 km/s with glowing green and blue ionization streaks.'
  },
  {
    id: 'geminids',
    name: 'Geminids',
    iauCode: 'GEM',
    constellation: 'Gemini',
    radiant: { ra: 112, dec: 33 },
    startMonth: 12, startDay: 4,
    endMonth: 12, endDay: 20,
    peakMonth: 12, peakDay: 14,
    peakZhr: 120,
    velocityKmS: 35,
    parentBody: 'Asteroid 3200 Phaethon',
    description: 'King of annual showers: bright, multi-colored, reliable meteors viewable well before midnight.'
  },
  {
    id: 'ursids',
    name: 'Ursids',
    iauCode: 'URS',
    constellation: 'Ursa Minor',
    radiant: { ra: 217, dec: 76 },
    startMonth: 12, startDay: 17,
    endMonth: 12, endDay: 26,
    peakMonth: 12, peakDay: 22,
    peakZhr: 10,
    velocityKmS: 33,
    parentBody: 'Comet 8P/Tuttle',
    description: 'Compact winter shower circumpolar in northern skies, peaking around the winter solstice.'
  }
];

/**
 * Calculate celestial altitude for a given RA/Dec at a specific date and location
 */
export function calculateRadiantAltitude(
  ra: number,
  dec: number,
  date: Date,
  latitude: number,
  longitude: number
): number {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const n = jd - 2451545.0;
  const gmst = (280.46061837 + 360.98564736629 * n) % 360;
  const lmst = (gmst + longitude + 360) % 360;
  const ha = (lmst - ra) * (Math.PI / 180);
  const latR = latitude * (Math.PI / 180);
  const decR = dec * (Math.PI / 180);
  const sinAlt = Math.sin(latR) * Math.sin(decR) + Math.cos(latR) * Math.cos(decR) * Math.cos(ha);
  return Math.asin(Math.max(-1, Math.min(1, sinAlt))) * (180 / Math.PI);
}

/**
 * Determine active date boundaries and peak date for a shower relative to reference date
 */
export function getShowerDates(shower: MeteorShower, refDate: Date): {
  startDate: Date;
  endDate: Date;
  peakDate: Date;
} {
  const y = refDate.getFullYear();
  let startYear = y;
  let endYear = y;
  let peakYear = y;

  if (shower.startMonth > shower.endMonth) {
    // Year boundary wraparound (e.g. Dec to Jan)
    const m = refDate.getMonth() + 1;
    if (m >= shower.startMonth) {
      startYear = y;
      endYear = y + 1;
      peakYear = shower.peakMonth <= shower.endMonth ? y + 1 : y;
    } else {
      startYear = y - 1;
      endYear = y;
      peakYear = shower.peakMonth <= shower.endMonth ? y : y - 1;
    }
  }

  const startDate = new Date(Date.UTC(startYear, shower.startMonth - 1, shower.startDay, 0, 0, 0));
  const endDate = new Date(Date.UTC(endYear, shower.endMonth - 1, shower.endDay, 23, 59, 59));
  const peakDate = new Date(Date.UTC(peakYear, shower.peakMonth - 1, shower.peakDay, 2, 0, 0));

  return { startDate, endDate, peakDate };
}

/**
 * Compute meteor shower conditions and summaries for the active observing night
 */
export function getMeteorShowerData(
  obsDate: Date,
  latitude: number,
  longitude: number,
  moonIllum = 0,
  moonIsUp = false
): MeteorCardData {
  const activeSummaries: MeteorShowerSummary[] = [];
  let nextUpcoming: { shower: MeteorShower; daysUntilPeak: number; peakDate: Date } | null = null;
  let minDaysToUpcoming = Infinity;

  for (const shower of MAJOR_METEOR_SHOWERS) {
    const { startDate, endDate, peakDate } = getShowerDates(shower, obsDate);
    const msToPeak = peakDate.getTime() - obsDate.getTime();
    const daysUntilPeak = msToPeak / (86400 * 1000);
    const isActive = obsDate >= startDate && obsDate <= endDate;

    // Radiant altitude right now
    const altNow = calculateRadiantAltitude(shower.radiant.ra, shower.radiant.dec, obsDate, latitude, longitude);

    // Radiant altitude sweep across tonight's dark observing hours (8 PM – 5 AM)
    const baseEvening = new Date(obsDate);
    if (baseEvening.getHours() < 12) {
      baseEvening.setDate(baseEvening.getDate() - 1);
    }
    baseEvening.setHours(20, 0, 0, 0);

    let maxAltTonight = -90;
    for (let offset = 0; offset <= 9; offset++) {
      const sampleTime = new Date(baseEvening.getTime() + offset * 3600000);
      const alt = calculateRadiantAltitude(shower.radiant.ra, shower.radiant.dec, sampleTime, latitude, longitude);
      if (alt > maxAltTonight) {
        maxAltTonight = alt;
      }
    }

    // Estimated visual rate (ZHR) based on exponential activity curve around peak
    let estimatedZhr = 0;
    if (isActive) {
      const daysFromPeakAbs = Math.abs(daysUntilPeak);
      estimatedZhr = Math.max(2, Math.round(shower.peakZhr * Math.exp(-daysFromPeakAbs / 3.0)));
    }

    // Lunar interference assessment
    let moonLevel: 'minimal' | 'moderate' | 'heavy' = 'minimal';
    let moonSummary = 'Moon below horizon · Ideal darkness';

    if (moonIsUp) {
      if (moonIllum > 60) {
        moonLevel = 'heavy';
        moonSummary = `Bright moon (${moonIllum}%) washes out faint meteors`;
      } else if (moonIllum > 25) {
        moonLevel = 'moderate';
        moonSummary = `Crescent moon (${moonIllum}%) causes mild background glow`;
      } else {
        moonLevel = 'minimal';
        moonSummary = `Thin crescent (${moonIllum}%) has minimal interference`;
      }
    }

    // Best viewing note
    const roundedMaxAlt = Math.round(maxAltTonight);
    let viewingNote = `Radiant low (${roundedMaxAlt}° max)`;
    if (roundedMaxAlt > 60) {
      viewingNote = `Radiant reaches ${roundedMaxAlt}° near zenith`;
    } else if (roundedMaxAlt > 25) {
      viewingNote = `Radiant climbs to ${roundedMaxAlt}° in ${shower.constellation}`;
    }

    const summary: MeteorShowerSummary = {
      shower,
      isActive,
      isPeakTonight: Math.abs(daysUntilPeak) <= 1.25,
      daysToPeak: daysUntilPeak,
      peakDate,
      estimatedZhrTonight: estimatedZhr,
      radiantAltitudeNow: Math.round(altNow),
      peakRadiantAltitudeTonight: roundedMaxAlt,
      bestViewingNote: viewingNote,
      moonImpact: {
        level: moonLevel,
        summary: moonSummary
      }
    };

    if (isActive) {
      activeSummaries.push(summary);
    } else if (daysUntilPeak > 0 && daysUntilPeak < minDaysToUpcoming) {
      minDaysToUpcoming = daysUntilPeak;
      nextUpcoming = {
        shower,
        daysUntilPeak: Math.ceil(daysUntilPeak),
        peakDate
      };
    }
  }

  // Sort active showers: peak tonight first, then highest estimated rate
  activeSummaries.sort((a, b) => {
    if (a.isPeakTonight && !b.isPeakTonight) return -1;
    if (!a.isPeakTonight && b.isPeakTonight) return 1;
    return b.estimatedZhrTonight - a.estimatedZhrTonight;
  });

  return {
    primaryShower: activeSummaries[0] || null,
    otherActiveShowers: activeSummaries.slice(1),
    nextUpcomingShower: nextUpcoming
  };
}
