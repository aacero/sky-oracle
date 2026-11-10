import { formatShortDate } from '../core/astronomy.ts';
import { t } from '../core/i18n.ts';
import { MeteorCardData } from '../core/meteors.ts';
import { renderDragHandle } from './dashboard-cards.ts';

export function renderMeteorShowerCard(m: MeteorCardData | null): string {
  if (!m) return '';

  const primary = m.primaryShower;
  const others = m.otherActiveShowers;
  const next = m.nextUpcomingShower;

  return `
    <section data-card-id="meteors" class="md:col-span-2 rounded-2xl p-5 bg-[#161b22] border border-[#30363d] shadow-lg relative">
      <div class="flex items-center justify-between pb-3 mb-3 border-b border-[#30363d] flex-wrap gap-2">
        <h3 class="text-sm font-bold tracking-wider uppercase text-[#8b949e] flex items-center gap-1.5">
          ${renderDragHandle('meteors')}
          <span>☄️</span> ${t('meteors.title').toUpperCase()}
        </h3>
        <div class="flex items-center gap-2">
          ${primary ? (
            primary.isPeakTonight ? `
              <span class="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-300 bg-amber-400/15 px-2.5 py-0.5 rounded-full border border-amber-400/30 animate-pulse">
                <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                ${t('meteors.peak_tonight')}
              </span>
            ` : `
              <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#58a6ff]/15 text-[#58a6ff] border border-[#58a6ff]/30">
                ${t('meteors.active')}
              </span>
            `
          ) : `
            <span class="text-xs font-medium px-2 py-0.5 rounded-full bg-white/[0.04] text-[#8b949e] border border-[#30363d]/60">
              ${t('meteors.quiet_season')}
            </span>
          `}
          ${primary ? `
            <button
              type="button"
              class="btnMeteorRadiant px-2.5 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 hover:border-sky-500/50 text-[11px] font-bold text-sky-300 hover:text-white transition cursor-pointer flex items-center gap-1.5 shadow-sm"
              data-shower="${primary.shower.id}"
              title="${t('meteors.view_radiant_title')}"
            >
              <span>☄️</span>
              <span>${t('meteors.view_radiant')}</span>
            </button>
          ` : (next ? `
            <button
              type="button"
              class="btnMeteorRadiant px-2 py-0.5 rounded-lg bg-white/5 hover:bg-sky-500/20 border border-[#30363d] hover:border-sky-500/40 text-[11px] font-medium text-[#8b949e] hover:text-sky-300 transition cursor-pointer flex items-center gap-1.5"
              data-shower="${next.shower.id}"
              title="${t('meteors.view_radiant_title')}"
            >
              <span>☄️</span>
              <span>${t('meteors.view_radiant')}</span>
            </button>
          ` : '')}
        </div>
      </div>

      ${primary ? `
        <!-- Shower Details -->
        <div class="cursor-pointer group/details btnMeteorRadiant" data-shower="${primary.shower.id}" title="${t('meteors.view_radiant_title')}">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <h4 class="text-lg font-bold text-[#e6edf3] group-hover/details:text-sky-300 transition-colors flex items-center gap-2">
              <span>${primary.shower.name}</span>
              <span class="px-2 py-0.5 rounded text-[11px] font-bold bg-[#56d4dd]/15 text-[#56d4dd] border border-[#56d4dd]/30">
                ${primary.shower.constellation}
              </span>
            </h4>
            <span class="text-xs font-mono text-[#8b949e]">
              IAU: <strong class="text-white">${primary.shower.iauCode}</strong> · Peak ${formatShortDate(primary.peakDate)}
            </span>
          </div>
          <p class="text-xs text-[#8b949e] mt-1 leading-relaxed">
            ${primary.shower.description}
          </p>
        </div>

        <!-- 4 Stats Tiles (Matches Moon & Sun cards grid layout) -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3 pt-3 border-t border-[#30363d]/60 text-xs">
          <!-- Tonight's Rate -->
          <div class="p-2.5 rounded-xl bg-white/[0.02] border border-[#30363d]/40">
            <span class="text-[#8b949e] block text-[10px] uppercase font-bold">${t('meteors.rate_tonight')}</span>
            <span class="text-sm font-bold text-amber-300">~${primary.estimatedZhrTonight} / hr</span>
            <span class="text-[10px] text-[#8b949e] block mt-0.5">Peak ZHR: ${primary.shower.peakZhr}</span>
          </div>

          <!-- Radiant Peak -->
          <div
            class="btnMeteorRadiant p-2.5 rounded-xl bg-white/[0.02] hover:bg-sky-500/10 border border-[#30363d]/40 hover:border-sky-500/40 transition cursor-pointer group"
            data-shower="${primary.shower.id}"
            title="${t('meteors.view_radiant_title')}"
          >
            <div class="flex items-center justify-between">
              <span class="text-[#8b949e] block text-[10px] uppercase font-bold">${t('meteors.radiant')}</span>
              <span class="text-[10px] text-sky-400 group-hover:text-sky-300 font-semibold flex items-center gap-0.5">🔭 10°</span>
            </div>
            <span class="text-sm font-bold text-[#56d4dd] group-hover:text-white transition-colors">${primary.peakRadiantAltitudeTonight > 0 ? `${primary.peakRadiantAltitudeTonight}° max` : 'Below 0°'}</span>
            <span class="text-[10px] text-[#8b949e] block mt-0.5 leading-snug" title="${primary.bestViewingNote}">${primary.bestViewingNote}</span>
          </div>

          <!-- Moon Interference -->
          <div class="p-2.5 rounded-xl bg-white/[0.02] border border-[#30363d]/40">
            <span class="text-[#8b949e] block text-[10px] uppercase font-bold">${t('meteors.lunar_conditions')}</span>
            <span class="text-sm font-bold ${primary.moonImpact.level === 'minimal' ? 'text-emerald-400' : (primary.moonImpact.level === 'moderate' ? 'text-[#58a6ff]' : 'text-amber-400')}">
              ${primary.moonImpact.level === 'minimal' ? 'Dark Sky' : (primary.moonImpact.level === 'moderate' ? 'Moderate' : 'Washout')}
            </span>
            <span class="text-[10px] text-[#8b949e] block mt-0.5 leading-snug" title="${primary.moonImpact.summary}">${primary.moonImpact.summary}</span>
          </div>

          <!-- Speed & Origin -->
          <div class="p-2.5 rounded-xl bg-white/[0.02] border border-[#30363d]/40">
            <span class="text-[#8b949e] block text-[10px] uppercase font-bold">${t('meteors.velocity')}</span>
            <span class="text-sm font-bold text-white">${primary.shower.velocityKmS} km/s</span>
            <span class="text-[10px] text-[#8b949e] block mt-0.5 leading-snug" title="${primary.shower.parentBody}">${primary.shower.parentBody}</span>
          </div>
        </div>

        <!-- Secondary Showers strip if any -->
        ${others.length > 0 ? `
          <div class="mt-3 pt-2.5 border-t border-[#30363d]/40 flex items-center justify-between text-xs text-[#8b949e] flex-wrap gap-2">
            <span class="text-[11px] font-medium">${t('meteors.also_active')}:</span>
            <div class="flex items-center gap-1.5 flex-wrap">
              ${others.map(os => `
                <button
                  type="button"
                  class="btnMeteorRadiant text-[10.5px] px-2 py-0.5 rounded-md bg-white/[0.03] hover:bg-sky-500/15 border border-[#30363d]/50 hover:border-sky-500/40 text-[#cbd5e1] hover:text-sky-200 transition cursor-pointer flex items-center gap-1"
                  data-shower="${os.shower.id}"
                  title="${t('meteors.view_radiant_title')} (${os.shower.name})"
                >
                  <strong class="text-white">${os.shower.name}</strong> (~${os.estimatedZhrTonight}/h · Peak ${formatShortDate(os.peakDate)})
                  <span class="text-sky-400">🔭</span>
                </button>
              `).join('')}
            </div>
          </div>
        ` : (next ? `
          <div class="btnMeteorRadiant mt-3 pt-2.5 border-t border-[#30363d]/40 flex items-center justify-between text-xs text-[#8b949e] cursor-pointer hover:text-white group" data-shower="${next.shower.id}" title="${t('meteors.view_radiant_title')} (${next.shower.name})">
            <span class="text-[11px]">${t('meteors.next_major')}:</span>
            <span class="text-[11px] text-[#58a6ff] group-hover:text-sky-300 font-medium flex items-center gap-1">
              <span>${next.shower.name} (ZHR ~${next.shower.peakZhr}) in ${next.daysUntilPeak} days (${formatShortDate(next.peakDate)})</span>
              <span>🔭</span>
            </span>
          </div>
        ` : '')}
      ` : `
        <!-- Quiet season fallback -->
        <div class="py-2 text-xs text-[#8b949e]">
          <p class="mb-2 leading-relaxed">${t('meteors.none_active')}</p>
          ${next ? `
            <div
              class="btnMeteorRadiant p-2.5 rounded-xl bg-white/[0.02] hover:bg-sky-500/10 border border-[#30363d]/40 hover:border-sky-500/40 transition cursor-pointer flex items-center justify-between flex-wrap gap-2 group"
              data-shower="${next.shower.id}"
              title="${t('meteors.view_radiant_title')} (${next.shower.name})"
            >
              <span>${t('meteors.next_major')}: <strong class="text-white group-hover:text-sky-300 transition-colors">${next.shower.name}</strong> (~${next.shower.peakZhr}/hr)</span>
              <span class="text-[#58a6ff] font-semibold flex items-center gap-1">
                <span>${next.daysUntilPeak} days away (${formatShortDate(next.peakDate)})</span>
                <span>🔭</span>
              </span>
            </div>
          ` : ''}
        </div>
      `}
    </section>
  `;
}
