/**
 * Local Storage Persistence for User Preferences & Locations
 */

export interface SavedLocation {
  place: string;
  lat: number;
  lon: number;
}

const STORAGE_KEY_LOCATION = 'sky_tonight_location';
const STORAGE_KEY_RECENTS = 'sky_tonight_recents';

// Default to St. Augustine, FL
export const DEFAULT_LOCATION: SavedLocation = {
  place: 'St. Augustine, FL',
  lat: 29.9012,
  lon: -81.3124
};

export function loadLocation(): SavedLocation {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOCATION);
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
    const raw = localStorage.getItem(STORAGE_KEY_RECENTS);
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
