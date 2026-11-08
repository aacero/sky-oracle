/**
 * Local Storage Persistence for User Preferences & Locations
 */

export interface SavedLocation {
  place: string;
  lat: number;
  lon: number;
}

export type DraggableCardId = 'moon' | 'sun' | 'planets' | 'meteors';

export const DEFAULT_CARD_ORDER: DraggableCardId[] = ['moon', 'sun', 'planets', 'meteors'];

const STORAGE_KEY_LOCATION = 'skyoracle_location';
const STORAGE_KEY_RECENTS = 'skyoracle_recents';
const STORAGE_KEY_UNIT = 'skyoracle_temp_unit';
const STORAGE_KEY_CARD_ORDER = 'skyoracle_card_order';

// Legacy storage keys preserved for seamless migration of existing users
const LEGACY_KEY_LOCATION = 'sky_tonight_location';
const LEGACY_KEY_RECENTS = 'sky_tonight_recents';
const LEGACY_KEY_UNIT = 'sky_tonight_temp_unit';

// Default to St. Augustine, FL
export const DEFAULT_LOCATION: SavedLocation = {
  place: 'St. Augustine, FL',
  lat: 29.9012,
  lon: -81.3124
};

/**
 * Escapes HTML special characters in external or user-provided strings
 * before interpolating into template literals or attributes.
 */
export function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function loadTempUnit(): 'F' | 'C' {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_UNIT) || localStorage.getItem(LEGACY_KEY_UNIT);
    if (raw === 'F' || raw === 'C') return raw;
  } catch {}
  if (typeof navigator !== 'undefined' && navigator.language) {
    if (navigator.language.toUpperCase().includes('US')) {
      return 'F';
    }
    return 'C';
  }
  return 'F';
}

export function saveTempUnit(unit: 'F' | 'C'): void {
  try {
    localStorage.setItem(STORAGE_KEY_UNIT, unit);
  } catch {}
}

export function loadLocation(): SavedLocation {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOCATION) || localStorage.getItem(LEGACY_KEY_LOCATION);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.lat === 'number' && typeof parsed.lon === 'number') {
        return parsed;
      }
    }
  } catch {}
  return DEFAULT_LOCATION;
}

export function saveLocation(loc: SavedLocation): void {
  try {
    localStorage.setItem(STORAGE_KEY_LOCATION, JSON.stringify(loc));
    addToRecents(loc);
  } catch {}
}

export function loadRecents(): SavedLocation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RECENTS) || localStorage.getItem(LEGACY_KEY_RECENTS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return [DEFAULT_LOCATION];
}

function addToRecents(loc: SavedLocation): void {
  try {
    const recents = loadRecents().filter(
      r => Math.abs(r.lat - loc.lat) > 0.01 || Math.abs(r.lon - loc.lon) > 0.01
    );
    recents.unshift(loc);
    localStorage.setItem(STORAGE_KEY_RECENTS, JSON.stringify(recents.slice(0, 5)));
  } catch {}
}

export function loadCardOrder(): DraggableCardId[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CARD_ORDER);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        Array.isArray(parsed) &&
        parsed.length === DEFAULT_CARD_ORDER.length &&
        DEFAULT_CARD_ORDER.every(id => parsed.includes(id))
      ) {
        return parsed as DraggableCardId[];
      }
    }
  } catch {}
  return [...DEFAULT_CARD_ORDER];
}

export function saveCardOrder(order: DraggableCardId[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CARD_ORDER, JSON.stringify(order));
  } catch {}
}
