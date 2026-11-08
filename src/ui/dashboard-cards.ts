import { formatTime, formatShortDate, MoonInfo, PlanetInfo, SunEvents } from '../core/astronomy.ts';
import { t } from '../core/i18n.ts';
import { MeteorCardData } from '../core/meteors.ts';
import { DraggableCardId } from '../core/storage.ts';
import {
  getLocalizedMoonDirection,
  getLocalizedMoonPhase,
  isPrimePlanetTarget,
  getLocalizedPlanetName,
  formatLocalizedPlanetStatus
} from './i18n-formatters.ts';
import { renderMeteorShowerCard } from './meteor-card.ts';

/**
 * Renders the 6-dot tactile grip handle in the top-left of each draggable dashboard card.
 */
export function renderDragHandle(cardId: DraggableCardId): string {
  return `
    <button
      type="button"
      class="card-drag-handle p-1 -ml-1 rounded-lg text-[#8b949e]/70 hover:text-[#e6edf3] hover:bg-white/[0.06] active:text-amber-300 transition cursor-grab active:cursor-grabbing touch-none select-none shrink-0"
      data-drag-card="${cardId}"
      title="${t('app.drag_to_reorder')}"
      aria-label="${t('app.drag_to_reorder')}"
    >
      <svg class="w-4 h-4 pointer-events-none" viewBox="0 0 16 16" fill="currentColor">
        <circle cx="5" cy="3.5" r="1.3"></circle><circle cx="11" cy="3.5" r="1.3"></circle>
        <circle cx="5" cy="8" r="1.3"></circle><circle cx="11" cy="8" r="1.3"></circle>
        <circle cx="5" cy="12.5" r="1.3"></circle><circle cx="11" cy="12.5" r="1.3"></circle>
      </svg>
    </button>
  `;
}

export function renderMoonCard(moon: MoonInfo | null, colSpanClass = 'md:col-span-1'): string {
  return `
    <section data-card-id="moon" class="${colSpanClass} rounded-2xl p-5 bg-[#161b22] border border-[#30363d] shadow-lg flex flex-col justify-between relative">
      <div>
        <div class="flex items-center justify-between pb-3 mb-3 border-b border-[#30363d]">
          <h3 class="text-sm font-bold tracking-wider uppercase text-[#8b949e] flex items-center gap-1.5">
            ${renderDragHandle('moon')}
            <span>🌙</span> ${t('moon.title').toUpperCase()}
          </h3>
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-[#58a6ff]/15 text-[#58a6ff] border border-[#58a6ff]/30">
              ${getLocalizedMoonDirection(moon?.phaseDirection)}
            </span>
            <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-400 border border-amber-400/30">
              ${t('moon.illum', { pct: moon?.illum || 0 })}
            </span>
          </div>
        </div>

        <!-- Top Row: Moon Canvas + Details -->
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <canvas id="moonCanvas" width="180" height="180" class="w-20 h-20 sm:w-24 sm:h-24 shrink-0 drop-shadow-[0_0_14px_rgba(251,191,36,0.3)]"></canvas>
            <div>
              <h4 class="text-lg font-bold text-[#e6edf3]">${getLocalizedMoonPhase(moon?.name)}</h4>
              <p class="text-xs text-[#8b949e] mt-0.5">
                ${t('moon.age_label')}: <span class="text-white font-medium">${moon?.age.toFixed(1) || '0'} ${t('moon.days')}</span> · ${getLocalizedMoonDirection(moon?.phaseDirection)}
              </p>
              <p class="text-xs text-[#8b949e] mt-0.5">
                ${t('moon.altitude_label')}: <span class="${(moon?.isUp ?? false) ? 'text-emerald-400' : 'text-[#8b949e]'} font-medium">
                  ${moon?.altitude !== undefined ? `${moon.altitude > 0 ? '+' : ''}${moon.altitude.toFixed(1)}° (${moon.isUp ? t('moon.above_horizon') : t('moon.below_horizon')})` : '—'}
                </span>
              </p>
              <p class="text-xs text-[#8b949e] mt-0.5">
                ${t('moon.dso_impact')}: <span class="${(moon?.illum || 0) < 30 ? 'text-emerald-400' : 'text-amber-400'} font-medium">${(moon?.illum || 0) < 30 ? t('moon.dso_minimal') : t('moon.dso_moderate')}</span>
              </p>
            </div>
          </div>
        </div>

        <!-- Lunar Cycle Progress Bar -->
        <div class="mt-4 pt-3 border-t border-[#30363d]/60">
          <div class="flex justify-between items-center text-[10px] font-bold text-[#8b949e] tracking-wider uppercase mb-1.5">
            <span>${t('moon.lunar_cycle')}</span>
            <span>${Math.round((moon?.cyclePos || 0) * 100)}%</span>
          </div>
          <div class="w-full h-2 rounded-full bg-[#21262d] overflow-hidden relative">
            <div class="h-full bg-gradient-to-r from-amber-400/80 to-amber-300 rounded-full transition-all duration-500" style="width: ${Math.max(2, Math.min(100, Math.round((moon?.cyclePos || 0) * 100)))}%"></div>
          </div>
          <div class="flex justify-between text-[10px] text-[#8b949e] font-semibold mt-1">
            <span>NEW</span>
            <span>FULL</span>
            <span>NEW</span>
          </div>
        </div>
      </div>

      <!-- Rise / Set / Next Dates Grid -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-3 border-t border-[#30363d]/60 text-xs">
        <div class="p-2.5 rounded-xl bg-white/[0.02] border border-[#30363d]/40">
          <span class="text-[#8b949e] block text-[10px] uppercase font-bold">${t('moon.rises')}</span>
          <span class="text-sm font-bold text-amber-300">${formatTime(moon?.rise || null)}</span>
        </div>
        <div class="p-2.5 rounded-xl bg-white/[0.02] border border-[#30363d]/40">
          <span class="text-[#8b949e] block text-[10px] uppercase font-bold">${t('moon.sets')}</span>
          <span class="text-sm font-bold text-amber-300">${formatTime(moon?.set || null)}</span>
        </div>
        <div class="p-2.5 rounded-xl bg-white/[0.02] border border-[#30363d]/40">
          <span class="text-[#8b949e] block text-[10px] uppercase font-bold">${t('moon.next_new')}</span>
          <span class="text-sm font-bold text-[#58a6ff]">${formatShortDate(moon?.nextNew || null)}</span>
        </div>
        <div class="p-2.5 rounded-xl bg-white/[0.02] border border-[#30363d]/40">
          <span class="text-[#8b949e] block text-[10px] uppercase font-bold">${t('moon.next_full')}</span>
          <span class="text-sm font-bold text-amber-300">${formatShortDate(moon?.nextFull || null)}</span>
        </div>
      </div>
    </section>
  `;
}

export function renderSunCard(sunEvents: SunEvents | null, colSpanClass = 'md:col-span-1'): string {
  return `
    <section data-card-id="sun" class="${colSpanClass} rounded-2xl p-5 bg-[#161b22] border border-[#30363d] shadow-lg flex flex-col justify-between relative">
      <div>
        <div class="flex items-center justify-between pb-3 mb-3 border-b border-[#30363d]">
          <h3 class="text-sm font-bold tracking-wider uppercase text-[#8b949e] flex items-center gap-1.5">
            ${renderDragHandle('sun')}
            <span>☀️</span> ${t('sun.title').toUpperCase()}
          </h3>
          <span class="text-xs text-[#8b949e]">${t('sun.local_solar_times')}</span>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
          <div class="p-2.5 rounded-xl bg-white/[0.02] border border-[#30363d]/40">
            <span class="text-[#8b949e] block text-[10px] uppercase font-bold">${t('sun.sunset')} (-0.8°)</span>
            <span class="text-sm font-bold text-amber-300">${formatTime(sunEvents?.sunset || null)}</span>
          </div>
          <div class="p-2.5 rounded-xl bg-white/[0.02] border border-[#30363d]/40">
            <span class="text-[#8b949e] block text-[10px] uppercase font-bold">${t('sun.civil_dusk')} (-6°)</span>
            <span class="text-sm font-bold text-sky-300">${formatTime(sunEvents?.civilDusk || null)}</span>
          </div>
          <div class="p-2.5 rounded-xl bg-white/[0.02] border border-[#30363d]/40">
            <span class="text-[#8b949e] block text-[10px] uppercase font-bold">${t('sun.nautical_dusk')} (-12°)</span>
            <span class="text-sm font-bold text-indigo-300">${formatTime(sunEvents?.nauticalDusk || null)}</span>
          </div>
          <div class="p-2.5 rounded-xl bg-[#58a6ff]/10 border border-[#58a6ff]/40">
            <span class="text-[#58a6ff] block text-[10px] uppercase font-bold">🌌 ${t('sun.astro_dusk')} (-18°)</span>
            <span class="text-sm font-bold text-[#58a6ff]">${formatTime(sunEvents?.astroDusk || null)}</span>
          </div>
          <div class="p-2.5 rounded-xl bg-[#58a6ff]/10 border border-[#58a6ff]/40">
            <span class="text-[#58a6ff] block text-[10px] uppercase font-bold">🌅 ${t('sun.astro_dawn')} (-18°)</span>
            <span class="text-sm font-bold text-[#58a6ff]">${formatTime(sunEvents?.astroDawn || null)}</span>
          </div>
          <div class="p-2.5 rounded-xl bg-white/[0.02] border border-[#30363d]/40">
            <span class="text-[#8b949e] block text-[10px] uppercase font-bold">${t('sun.sunrise')} (-0.8°)</span>
            <span class="text-sm font-bold text-amber-300">${formatTime(sunEvents?.sunrise || null)}</span>
          </div>
        </div>
      </div>
    </section>
  `;
}

export function renderPlanetsCard(targets: PlanetInfo[], moon: MoonInfo | null): string {
  return `
    <section data-card-id="planets" class="md:col-span-2 rounded-2xl p-5 sm:p-6 bg-[#161b22] border border-[#30363d] shadow-lg relative">
      <div class="flex items-center justify-between pb-3 mb-3 border-b border-[#30363d] flex-wrap gap-2">
        <h3 class="text-sm font-bold tracking-wider uppercase text-[#8b949e] flex items-center gap-1.5">
          ${renderDragHandle('planets')}
          <span>🪐</span> ${t('planets.title').toUpperCase()}
        </h3>
        <div class="flex items-center gap-2">
          <span class="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20" title="${t('planets.amber_badge')}">
            <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            ${t('planets.amber_badge')}
          </span>
        </div>
      </div>

      <!-- Discovery Callout Banner -->
      <div class="flex items-center justify-between p-2.5 mb-3 rounded-xl bg-gradient-to-r from-amber-500/10 via-sky-500/10 to-transparent border border-amber-500/25 text-xs text-[#cbd5e1]">
        <div class="flex items-center gap-2">
          <span class="text-base">💡</span>
          <span>${t('planets.discovery_prompt')}</span>
        </div>
        <button id="btnOpenTourFromList" class="shrink-0 text-[11px] font-bold text-amber-300 hover:text-white hover:underline transition ml-2 cursor-pointer">
          ${t('app.tour')} ➔
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        ${targets.map(p => {
          const isPrime = isPrimePlanetTarget(p, moon);
          const localizedName = getLocalizedPlanetName(p.key, p.name);
          return `
            <div
              role="button"
              tabindex="0"
              data-planet="${p.key}"
              class="btnPlanetCard flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-[#30363d]/50 hover:border-amber-400/40 transition cursor-pointer group"
              title="${t('planets.view_starfield')} (${localizedName})"
            >
              <div class="flex items-center gap-3">
                <span class="text-xl ${isPrime ? 'text-amber-400' : 'text-[#e6edf3]'} font-bold w-6 text-center group-hover:scale-110 transition-transform">${p.symbol}</span>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-sm text-[#e6edf3] group-hover:text-amber-300 transition-colors">${localizedName}</span>
                    <!-- Plain-text Constellation badge -->
                    <span class="px-2 py-0.5 rounded text-[11px] font-bold bg-[#56d4dd]/15 text-[#56d4dd] border border-[#56d4dd]/30">
                      ${p.constellation}
                    </span>
                  </div>
                  <span class="text-xs font-medium ${isPrime ? 'text-amber-400' : 'text-[#8b949e]'}">
                    ${formatLocalizedPlanetStatus(p, moon)}
                  </span>
                </div>
              </div>

              <div class="flex items-center gap-3">
                <div class="text-right text-xs text-[#8b949e]">
                  ${p.set ? `<div>${t('planets.set')} ${formatTime(p.set)}</div>` : ''}
                  ${p.rise ? `<div>${t('planets.rise')} ${formatTime(p.rise)}</div>` : ''}
                </div>
                <div class="flex items-center gap-1 text-[#8b949e] group-hover:text-amber-400 transition-colors pl-1">
                  <span class="text-[11px] font-bold hidden sm:inline opacity-70 group-hover:opacity-100 transition-opacity">10° Field</span>
                  <span class="text-sm">🔭</span>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </section>
  `;
}

/**
 * Renders the 4 independently draggable cards ('moon', 'sun', 'planets', 'meteors')
 * in the user's saved order. When 'moon' and 'sun' are adjacent in the order, they
 * sit side-by-side in a 2-column row on md+ screens; when separated by a full-width
 * card ('planets' or 'meteors'), they automatically expand to full width (md:col-span-2).
 */
export function renderDraggableDashboardCards(
  cardOrder: DraggableCardId[],
  moon: MoonInfo | null,
  sunEvents: SunEvents | null,
  targets: PlanetInfo[],
  meteors: MeteorCardData | null
): string {
  const moonIdx = cardOrder.indexOf('moon');
  const sunIdx = cardOrder.indexOf('sun');
  const areMoonAndSunAdjacent = Math.abs(moonIdx - sunIdx) === 1;
  const ephemerisSpan = areMoonAndSunAdjacent ? 'md:col-span-1' : 'md:col-span-2';

  return cardOrder
    .map(cardId => {
      switch (cardId) {
        case 'moon':
          return renderMoonCard(moon, ephemerisSpan);
        case 'sun':
          return renderSunCard(sunEvents, ephemerisSpan);
        case 'planets':
          return renderPlanetsCard(targets, moon);
        case 'meteors':
          return renderMeteorShowerCard(meteors);
      }
    })
    .join('\n');
}

/**
 * Attaches unified desktop mouse + mobile touch PointerEvent drag handlers and
 * keyboard arrow-key reordering to all `.card-drag-handle` buttons.
 */
export function attachCardDragHandlers(
  getCardOrder: () => DraggableCardId[],
  onReorder: (newOrder: DraggableCardId[]) => void
): void {
  const handles = document.querySelectorAll<HTMLElement>('.card-drag-handle');

  handles.forEach(handle => {
    const draggedId = handle.getAttribute('data-drag-card') as DraggableCardId | null;
    if (!draggedId) return;

    // Keyboard accessibility: ArrowUp/ArrowLeft moves card earlier; ArrowDown/ArrowRight moves card later
    handle.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowLeft' && e.key !== 'ArrowDown' && e.key !== 'ArrowRight') {
        return;
      }
      e.preventDefault();
      const currentOrder = [...getCardOrder()];
      const idx = currentOrder.indexOf(draggedId);
      if (idx === -1) return;

      const delta = e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 1;
      const targetIdx = idx + delta;
      if (targetIdx < 0 || targetIdx >= currentOrder.length) return;

      currentOrder.splice(idx, 1);
      currentOrder.splice(targetIdx, 0, draggedId);
      onReorder(currentOrder);
    });

    handle.addEventListener('pointerdown', (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const draggedSection = handle.closest<HTMLElement>('section[data-card-id]');
      if (!draggedSection) return;

      e.preventDefault();
      e.stopPropagation();
      try {
        handle.setPointerCapture(e.pointerId);
      } catch {}

      const startX = e.clientX;
      const startY = e.clientY;
      let hoveredId: DraggableCardId | null = null;

      const allCardSections = Array.from(
        document.querySelectorAll<HTMLElement>('main section[data-card-id]')
      );

      draggedSection.style.zIndex = '40';
      draggedSection.style.opacity = '0.92';
      draggedSection.style.boxShadow = '0 20px 45px rgba(0, 0, 0, 0.75)';
      draggedSection.style.borderColor = '#58a6ff';
      draggedSection.style.transition = 'none';

      const onPointerMove = (moveEvt: PointerEvent) => {
        const dx = moveEvt.clientX - startX;
        const dy = moveEvt.clientY - startY;
        draggedSection.style.transform = `translate(${dx}px, ${dy}px) scale(1.01)`;

        // Gentle viewport edge auto-scroll when dragging near top or bottom of screen
        if (moveEvt.clientY < 70) {
          window.scrollBy(0, -10);
        } else if (moveEvt.clientY > window.innerHeight - 70) {
          window.scrollBy(0, 10);
        }

        let foundTarget: DraggableCardId | null = null;
        for (const sec of allCardSections) {
          const secId = sec.getAttribute('data-card-id') as DraggableCardId | null;
          if (!secId || secId === draggedId) {
            sec.style.outline = '';
            sec.style.outlineOffset = '';
            continue;
          }
          const rect = sec.getBoundingClientRect();
          const inside =
            moveEvt.clientX >= rect.left &&
            moveEvt.clientX <= rect.right &&
            moveEvt.clientY >= rect.top &&
            moveEvt.clientY <= rect.bottom;
          if (inside) {
            foundTarget = secId;
            sec.style.outline = '2px dashed #58a6ff';
            sec.style.outlineOffset = '3px';
          } else {
            sec.style.outline = '';
            sec.style.outlineOffset = '';
          }
        }
        hoveredId = foundTarget;
      };

      const finishDrag = () => {
        handle.removeEventListener('pointermove', onPointerMove);
        handle.removeEventListener('pointerup', finishDrag);
        handle.removeEventListener('pointercancel', finishDrag);

        draggedSection.style.zIndex = '';
        draggedSection.style.opacity = '';
        draggedSection.style.boxShadow = '';
        draggedSection.style.borderColor = '';
        draggedSection.style.transition = '';
        draggedSection.style.transform = '';

        for (const sec of allCardSections) {
          sec.style.outline = '';
          sec.style.outlineOffset = '';
        }

        if (hoveredId && hoveredId !== draggedId) {
          const currentOrder = [...getCardOrder()];
          const fromIdx = currentOrder.indexOf(draggedId);
          const toIdx = currentOrder.indexOf(hoveredId);
          if (fromIdx !== -1 && toIdx !== -1) {
            currentOrder.splice(fromIdx, 1);
            currentOrder.splice(toIdx, 0, draggedId);
            onReorder(currentOrder);
          }
        }
      };

      handle.addEventListener('pointermove', onPointerMove);
      handle.addEventListener('pointerup', finishDrag);
      handle.addEventListener('pointercancel', finishDrag);
    });
  });
}
