import { t } from '../core/i18n.ts';

export interface TourSlide {
  badge: string;
  title: string;
  tagline: string;
  icon: string;
  accentColor: string;
  description: string;
  highlights: { emoji: string; label: string }[];
}

export function getTourSlides(): TourSlide[] {
  return [
    {
      badge: '🔭 1 / 4',
      title: t('tour.welcome_title'),
      tagline: 'High-precision telescopic starfield for Moon, Sun & planets',
      icon: '🔭',
      accentColor: '#38bdf8',
      description: t('tour.welcome_desc'),
      highlights: [
        { emoji: '◯', label: t('starfield.circular_fov') },
        { emoji: '✨', label: t('modal.constellation') },
        { emoji: '🏷️', label: t('modal.altitude') }
      ]
    },
    {
      badge: '🌅 2 / 4',
      title: t('tour.twilight_title'),
      tagline: 'Precision Civil, Nautical, and Astronomical twilight tracking',
      icon: '🌅',
      accentColor: '#10b981',
      description: t('tour.twilight_desc'),
      highlights: [
        { emoji: '━━━', label: t('starfield.horizon') },
        { emoji: '🌌', label: t('sun.astro_dusk') },
        { emoji: '📐', label: t('sun.true_night') }
      ]
    },
    {
      badge: '💧 3 / 4',
      title: t('tour.weather_title'),
      tagline: 'Hyperlocal cloud cover and dew point monitoring',
      icon: '💧',
      accentColor: '#f59e0b',
      description: t('tour.weather_desc'),
      highlights: [
        { emoji: '●', label: t('weather.temp') },
        { emoji: '💧', label: t('weather.dew_point') },
        { emoji: '💨', label: t('weather.wind') }
      ]
    },
    {
      badge: '🔒 4 / 4',
      title: t('tour.offline_title'),
      tagline: '100% offline ephemeris with zero tracking',
      icon: '🔒',
      accentColor: '#a855f7',
      description: t('tour.offline_desc'),
      highlights: [
        { emoji: '⭐', label: t('planets.title') },
        { emoji: '🌙', label: t('moon.title') },
        { emoji: '🛡️', label: t('app.offline') }
      ]
    }
  ];
}

export function renderTourModal(tourSlideIndex: number): string {
  const slides = getTourSlides();
  const slide = slides[tourSlideIndex] || slides[0];

  return `
    <div id="tourModalOverlay" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div class="bg-[#161b22] border border-[#30363d] rounded-2xl max-w-lg w-full shadow-2xl flex flex-col overflow-hidden animate-scale-up">
        <!-- Header -->
        <div class="flex items-center justify-between p-3.5 sm:p-4 border-b border-[#30363d] bg-black/25">
          <div class="flex items-center gap-2">
            <span class="text-xl">💡</span>
            <h3 class="text-base sm:text-lg font-bold text-[#e6edf3]">SkyOracle Feature Tour</h3>
          </div>
          <button id="btnCloseTourModal" class="p-1.5 rounded-lg text-[#8b949e] hover:text-white hover:bg-white/10 transition cursor-pointer" aria-label="Close tour">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <!-- Slide Body -->
        <div class="p-5 sm:p-6 flex flex-col gap-4">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full" style="color: ${slide.accentColor}; background: ${slide.accentColor}20; border: 1px solid ${slide.accentColor}40;">
              ${slide.badge}
            </span>
            <div class="flex items-center gap-1.5">
              ${slides.map((_, i) => `
                <button
                  type="button"
                  class="btnTourDot w-2.5 h-2.5 rounded-full transition cursor-pointer ${i === tourSlideIndex ? 'bg-amber-400 scale-125' : 'bg-white/20 hover:bg-white/40'}"
                  data-slide="${i}"
                  title="Go to slide ${i + 1}"
                ></button>
              `).join('')}
            </div>
          </div>

          <div class="flex items-start gap-4">
            <div class="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0 border" style="background: ${slide.accentColor}15; border-color: ${slide.accentColor}40;">
              ${slide.icon}
            </div>
            <div>
              <h4 class="text-lg font-bold text-[#e6edf3] leading-snug">${slide.title}</h4>
              <p class="text-xs text-sky-300 font-medium mt-0.5">${slide.tagline}</p>
            </div>
          </div>

          <p class="text-sm text-[#cbd5e1] leading-relaxed">
            ${slide.description}
          </p>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-[#30363d]/60">
            ${slide.highlights.map(h => `
              <div class="p-2 rounded-xl bg-white/[0.03] border border-[#30363d]/40 flex items-center gap-2 text-xs">
                <span class="text-base">${h.emoji}</span>
                <span class="text-white font-medium">${h.label}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Footer Controls -->
        <div class="p-3.5 sm:p-4 border-t border-[#30363d] bg-black/25 flex items-center justify-between">
          <button
            id="btnTourPrev"
            type="button"
            class="px-3 py-1.5 rounded-xl border border-[#30363d] text-xs font-semibold text-[#8b949e] hover:text-white hover:bg-white/5 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            ${tourSlideIndex === 0 ? 'disabled' : ''}
          >
            ${t('tour.back')}
          </button>

          <span class="text-xs text-[#8b949e] font-mono">
            ${tourSlideIndex + 1} of ${slides.length}
          </span>

          ${tourSlideIndex < slides.length - 1 ? `
            <button
              id="btnTourNext"
              type="button"
              class="px-4 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/35 border border-sky-500/40 text-xs font-semibold text-sky-200 transition cursor-pointer"
            >
              ${t('tour.next')}
            </button>
          ` : `
            <button
              id="btnTourFinish"
              type="button"
              class="px-4 py-1.5 rounded-xl bg-amber-500/25 hover:bg-amber-500/35 border border-amber-500/50 text-xs font-bold text-amber-200 transition cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.3)]"
            >
              ${t('tour.get_started')}
            </button>
          `}
        </div>
      </div>
    </div>
  `;
}
