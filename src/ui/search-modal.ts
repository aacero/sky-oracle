import { GeocodingResult } from '../core/weather.ts';
import { loadRecents, escapeHtml } from '../core/storage.ts';
import { t } from '../core/i18n.ts';

export function renderSearchResultsList(results: GeocodingResult[]): string {
  if (!results.length) return '';
  return `
    <div class="flex flex-col gap-1 max-h-56 overflow-y-auto">
      <span class="text-[11px] font-bold uppercase tracking-wider text-[#8b949e] px-1">${t('search.results')}</span>
      ${results.map(r => {
        const fullPlace = `${r.name}${r.admin1 ? `, ${r.admin1}` : ''}${r.country ? `, ${r.country}` : ''}`;
        const subLabel = [r.admin1, r.country].filter(Boolean).join(', ');
        return `
        <button
          type="button"
          class="btnSelectCity flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.05] text-left transition cursor-pointer"
          data-place="${escapeHtml(fullPlace)}"
          data-lat="${r.latitude}"
          data-lon="${r.longitude}"
        >
          <div>
            <div class="text-sm font-semibold text-[#e6edf3]">${escapeHtml(r.name)}</div>
            <div class="text-xs text-[#8b949e]">${escapeHtml(subLabel)}</div>
          </div>
          <div class="text-xs font-mono text-[#58a6ff]">${r.latitude.toFixed(2)}°, ${r.longitude.toFixed(2)}°</div>
        </button>
      `;
      }).join('')}
    </div>
  `;
}

export function renderSearchModal(
  searchQuery: string,
  searchLoading: boolean,
  searchResults: GeocodingResult[]
): string {
  const recents = loadRecents();

  return `
    <div id="searchModalOverlay" class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center p-4 pt-20 animate-fade-in">
      <div class="bg-[#161b22] border border-[#30363d] rounded-2xl w-full max-w-lg shadow-2xl p-5 flex flex-col gap-4">
        <div class="flex items-center justify-between pb-3 border-b border-[#30363d]">
          <h3 class="text-base font-bold text-[#e6edf3] flex items-center gap-2">
            <span>📍</span> ${t('search.title')}
          </h3>
          <button id="btnCloseSearch" class="p-1 rounded-lg text-[#8b949e] hover:text-white transition cursor-pointer" aria-label="${t('search.close')}">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <!-- Search Input -->
        <div class="relative">
          <input
            id="inputCitySearch"
            type="text"
            placeholder="${t('search.placeholder')}"
            value="${escapeHtml(searchQuery)}"
            class="w-full px-4 py-2.5 rounded-xl bg-[#0d1117] border border-[#30363d] text-sm text-[#e6edf3] placeholder-[#8b949e] focus:outline-none focus:border-[#58a6ff] transition"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
          />
          <div id="searchLoadingSpinner" class="${searchLoading ? '' : 'hidden'} absolute right-3 top-3 w-4 h-4 border-2 border-[#58a6ff] border-t-transparent rounded-full animate-spin"></div>
        </div>

        <!-- Search Results Container -->
        <div id="searchResultsContainer">
          ${renderSearchResultsList(searchResults)}
        </div>

        <!-- Recents List -->
        <div class="flex flex-col gap-2 pt-2 border-t border-[#30363d]/60">
          <span class="text-[11px] font-bold uppercase tracking-wider text-[#8b949e]">${t('search.recent')}</span>
          <div class="flex flex-wrap gap-2">
            ${recents.map(r => `
              <button
                type="button"
                class="btnSelectCity px-3 py-1.5 rounded-lg bg-[#0d1117] hover:bg-[#21262d] border border-[#30363d] text-xs font-medium text-[#e6edf3] transition cursor-pointer"
                data-place="${escapeHtml(r.place)}"
                data-lat="${r.lat}"
                data-lon="${r.lon}"
              >
                ${escapeHtml(r.place)}
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}
