/**
 * Stick figure line segments for the 12 zodiac constellations (+ Ophiuchus)
 * along the ecliptic band. Coordinates match bright anchor stars in ZODIAC_STARS.
 */

export interface ConstellationSegment {
  ra1: number;
  dec1: number;
  ra2: number;
  dec2: number;
  constellation: string;
}

export const ZODIAC_CONSTELLATION_LINES: ConstellationSegment[] = [
  // ── Aries (Ram) ──
  { ra1: 31.79, dec1: 23.46, ra2: 28.66, dec2: 20.81, constellation: 'Aries' }, // Hamal -> Sheratan
  { ra1: 28.66, dec1: 20.81, ra2: 28.38, dec2: 19.29, constellation: 'Aries' }, // Sheratan -> Mesarthim

  // ── Taurus (Bull) ──
  { ra1: 68.98, dec1: 16.51, ra2: 64.95, dec2: 15.63, constellation: 'Taurus' }, // Aldebaran -> Prima Hyadum
  { ra1: 64.95, dec1: 15.63, ra2: 81.57, dec2: 28.61, constellation: 'Taurus' }, // Prima Hyadum -> Elnath (North Horn)
  { ra1: 68.98, dec1: 16.51, ra2: 84.41, dec2: 21.14, constellation: 'Taurus' }, // Aldebaran -> Tianguan (South Horn)

  // ── Gemini (Twins) ──
  { ra1: 113.65, dec1: 31.89, ra2: 116.33, dec2: 28.03, constellation: 'Gemini' }, // Castor -> Pollux (Heads)
  { ra1: 113.65, dec1: 31.89, ra2: 100.98, dec2: 25.13, constellation: 'Gemini' }, // Castor -> Mebsuta
  { ra1: 100.98, dec1: 25.13, ra2: 93.72, dec2: 22.51, constellation: 'Gemini' },  // Mebsuta -> Propus
  { ra1: 116.33, dec1: 28.03, ra2: 110.03, dec2: 21.98, constellation: 'Gemini' }, // Pollux -> Wasat
  { ra1: 110.03, dec1: 21.98, ra2: 99.43, dec2: 16.40, constellation: 'Gemini' },  // Wasat -> Alhena
  { ra1: 100.98, dec1: 25.13, ra2: 110.03, dec2: 21.98, constellation: 'Gemini' }, // Mebsuta -> Wasat (Waist)

  // ── Cancer (Crab) ──
  { ra1: 131.17, dec1: 18.15, ra2: 130.82, dec2: 21.47, constellation: 'Cancer' }, // Asellus Australis -> Asellus Borealis
  { ra1: 131.17, dec1: 18.15, ra2: 134.62, dec2: 11.86, constellation: 'Cancer' }, // Asellus Australis -> Acubens

  // ── Leo (Lion) ──
  { ra1: 152.09, dec1: 11.97, ra2: 154.99, dec2: 19.84, constellation: 'Leo' }, // Regulus -> Algieba
  { ra1: 154.99, dec1: 19.84, ra2: 154.17, dec2: 23.42, constellation: 'Leo' }, // Algieba -> Adhafera
  { ra1: 154.17, dec1: 23.42, ra2: 148.19, dec2: 26.01, constellation: 'Leo' }, // Adhafera -> Rasalas (Sickle head)
  { ra1: 154.99, dec1: 19.84, ra2: 168.53, dec2: 20.52, constellation: 'Leo' }, // Algieba -> Zosma
  { ra1: 168.53, dec1: 20.52, ra2: 177.26, dec2: 14.57, constellation: 'Leo' }, // Zosma -> Denebola (Tail)
  { ra1: 177.26, dec1: 14.57, ra2: 168.56, dec2: 15.43, constellation: 'Leo' }, // Denebola -> Chertan
  { ra1: 168.56, dec1: 15.43, ra2: 168.53, dec2: 20.52, constellation: 'Leo' }, // Chertan -> Zosma
  { ra1: 168.56, dec1: 15.43, ra2: 152.09, dec2: 11.97, constellation: 'Leo' }, // Chertan -> Regulus (Body base)

  // ── Virgo (Maiden) ──
  { ra1: 177.67, dec1: 1.76, ra2: 190.42, dec2: -1.45, constellation: 'Virgo' },  // Zavijava -> Porrima
  { ra1: 190.42, dec1: -1.45, ra2: 195.54, dec2: 10.96, constellation: 'Virgo' }, // Porrima -> Vindemiatrix
  { ra1: 190.42, dec1: -1.45, ra2: 201.30, dec2: -11.16, constellation: 'Virgo' },// Porrima -> Spica
  { ra1: 201.30, dec1: -11.16, ra2: 203.67, dec2: -0.60, constellation: 'Virgo' },// Spica -> Heze
  { ra1: 201.30, dec1: -11.16, ra2: 214.00, dec2: -6.00, constellation: 'Virgo' },// Spica -> Syrma

  // ── Libra (Scales) ──
  { ra1: 222.72, dec1: -16.04, ra2: 229.25, dec2: -9.38, constellation: 'Libra' }, // Zubenelgenubi -> Zubeneschamali
  { ra1: 222.72, dec1: -16.04, ra2: 226.02, dec2: -25.28, constellation: 'Libra' },// Zubenelgenubi -> Brachium
  { ra1: 229.25, dec1: -9.38, ra2: 226.02, dec2: -25.28, constellation: 'Libra' }, // Zubeneschamali -> Brachium

  // ── Scorpius (Scorpion) ──
  { ra1: 241.36, dec1: -19.81, ra2: 240.08, dec2: -22.62, constellation: 'Scorpius' }, // Acrab -> Dschubba
  { ra1: 240.08, dec1: -22.62, ra2: 239.71, dec2: -26.11, constellation: 'Scorpius' }, // Dschubba -> Fang (Pi Sco)
  { ra1: 240.08, dec1: -22.62, ra2: 245.30, dec2: -25.59, constellation: 'Scorpius' }, // Dschubba -> Alniyat
  { ra1: 245.30, dec1: -25.59, ra2: 247.35, dec2: -26.43, constellation: 'Scorpius' }, // Alniyat -> Antares (Heart)
  { ra1: 247.35, dec1: -26.43, ra2: 248.97, dec2: -28.22, constellation: 'Scorpius' }, // Antares -> Paikauhale
  { ra1: 248.97, dec1: -28.22, ra2: 252.54, dec2: -34.29, constellation: 'Scorpius' }, // Paikauhale -> Larawag
  { ra1: 252.54, dec1: -34.29, ra2: 252.97, dec2: -38.05, constellation: 'Scorpius' }, // Larawag -> Xamidimura
  { ra1: 252.97, dec1: -38.05, ra2: 263.40, dec2: -37.10, constellation: 'Scorpius' }, // Xamidimura -> Shaula
  { ra1: 263.40, dec1: -37.10, ra2: 262.69, dec2: -37.30, constellation: 'Scorpius' }, // Shaula -> Lesath (Stinger)

  // ── Ophiuchus (Serpent Bearer) ──
  { ra1: 249.34, dec1: -10.57, ra2: 257.65, dec2: -15.72, constellation: 'Ophiuchus' }, // Han -> Sabik

  // ── Sagittarius (Archer / Teapot) ──
  { ra1: 271.45, dec1: -30.42, ra2: 275.25, dec2: -29.83, constellation: 'Sagittarius' }, // Alnasl -> Kaus Media (Spout)
  { ra1: 271.45, dec1: -30.42, ra2: 276.04, dec2: -34.38, constellation: 'Sagittarius' }, // Alnasl -> Kaus Australis
  { ra1: 275.25, dec1: -29.83, ra2: 276.99, dec2: -25.42, constellation: 'Sagittarius' }, // Kaus Media -> Kaus Borealis (Lid)
  { ra1: 276.99, dec1: -25.42, ra2: 283.82, dec2: -26.30, constellation: 'Sagittarius' }, // Kaus Borealis -> Nunki
  { ra1: 276.04, dec1: -34.38, ra2: 285.65, dec2: -29.88, constellation: 'Sagittarius' }, // Kaus Australis -> Ascella (Base)
  { ra1: 283.82, dec1: -26.30, ra2: 286.74, dec2: -27.67, constellation: 'Sagittarius' }, // Nunki -> τ Sgr (Handle)
  { ra1: 286.74, dec1: -27.67, ra2: 285.65, dec2: -29.88, constellation: 'Sagittarius' }, // τ Sgr -> Ascella
  { ra1: 275.25, dec1: -29.83, ra2: 276.04, dec2: -34.38, constellation: 'Sagittarius' }, // Kaus Media -> Kaus Australis

  // ── Capricornus (Sea-Goat Wedge) ──
  { ra1: 304.51, dec1: -12.54, ra2: 305.25, dec2: -14.78, constellation: 'Capricornus' }, // Algedi -> Dabih (Horns)
  { ra1: 305.25, dec1: -14.78, ra2: 312.96, dec2: -26.92, constellation: 'Capricornus' }, // Dabih -> ω Cap
  { ra1: 312.96, dec1: -26.92, ra2: 321.67, dec2: -22.41, constellation: 'Capricornus' }, // ω Cap -> Yen
  { ra1: 321.67, dec1: -22.41, ra2: 326.76, dec2: -16.13, constellation: 'Capricornus' }, // Yen -> Deneb Algedi
  { ra1: 326.76, dec1: -16.13, ra2: 325.02, dec2: -16.66, constellation: 'Capricornus' }, // Deneb Algedi -> Nashira
  { ra1: 325.02, dec1: -16.66, ra2: 316.49, dec2: -17.23, constellation: 'Capricornus' }, // Nashira -> θ Cap
  { ra1: 316.49, dec1: -17.23, ra2: 305.25, dec2: -14.78, constellation: 'Capricornus' }, // θ Cap -> Dabih

  // ── Aquarius (Water Bearer) ──
  { ra1: 322.89, dec1: -5.57, ra2: 331.45, dec2: -0.32, constellation: 'Aquarius' },  // Sadalsuud -> Sadalmelik
  { ra1: 331.45, dec1: -0.32, ra2: 335.41, dec2: -1.39, constellation: 'Aquarius' },  // Sadalmelik -> Sadachbia
  { ra1: 322.89, dec1: -5.57, ra2: 311.92, dec2: -9.50, constellation: 'Aquarius' },  // Sadalsuud -> Albali
  { ra1: 335.41, dec1: -1.39, ra2: 343.66, dec2: -15.82, constellation: 'Aquarius' }, // Sadachbia -> Skat

  // ── Pisces (Fishes) ──
  { ra1: 30.51, dec1: 2.76, ra2: 22.87, dec2: 15.35, constellation: 'Pisces' },   // Alrescha -> Alpherg (North cord)
  { ra1: 30.51, dec1: 2.76, ra2: 345.97, dec2: 3.82, constellation: 'Pisces' }    // Alrescha -> Fumalsamakah (West cord)
];
