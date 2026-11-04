/**
 * SkyOracle Lightweight Internationalization (i18n) Engine
 * Zero runtime dependencies, 100% offline, type-safe dictionary lookup.
 * Supported locales: en (default), es, pt, de, fr.
 */

export type Locale = 'en' | 'es' | 'pt' | 'de' | 'fr';

export interface LocaleOption {
  code: Locale;
  label: string;
  flag: string;
  name: string;
}

export const SUPPORTED_LOCALES: LocaleOption[] = [
  { code: 'en', label: 'EN', flag: '🇬🇧', name: 'English' },
  { code: 'es', label: 'ES', flag: '🇪🇸', name: 'Español' },
  { code: 'pt', label: 'PT', flag: '🇧🇷', name: 'Português' },
  { code: 'de', label: 'DE', flag: '🇩🇪', name: 'Deutsch' },
  { code: 'fr', label: 'FR', flag: '🇫🇷', name: 'Français' },
];

const STORAGE_KEY = 'skyoracle_locale';

type TranslationDictionary = Record<string, string>;

const en: TranslationDictionary = {
  // App Shell & Navigation
  'app.tagline': 'Stargazing forecast, ephemeris & planet guide',
  'app.offline': 'Offline',
  'app.detecting_location': 'Detecting location...',
  'app.use_gps': 'Use current GPS location',
  'app.install_app': 'Install App',
  'app.tour': 'Tour',
  'app.tour_tooltip': 'Explore SkyOracle features & interactive starfield guide',
  'app.refresh': 'Refresh Forecast',
  'app.calculating': 'Calculating celestial ephemeris & forecast...',
  'app.error_title': 'Could not load observation forecast',
  'app.retry': 'Retry with GPS Location',
  'app.powered_by': 'Offline celestial calculations with Jean Meeus ephemeris & Open-Meteo dark sky window forecast.',

  // Location Search Modal
  'search.title': 'Observing Location',
  'search.placeholder': 'Search city (e.g., Flagstaff, Mauna Kea, Atacama)...',
  'search.recent': 'Recent Locations',
  'search.results': 'Search Results',
  'search.clear': 'Clear',
  'search.searching': 'Searching locations...',
  'search.no_results': 'No matching cities found. Try another search.',
  'search.gps_active': 'Using GPS Geolocation',
  'search.close': 'Close',

  // Hero Verdict Card
  'verdict.tonight': 'Tonight ({date})',
  'verdict.clear': 'Clear — great for observing',
  'verdict.partly_cloudy': 'Partly cloudy — gaps to peek through',
  'verdict.mostly_cloudy': 'Mostly cloudy — limited windows',
  'verdict.overcast': 'Overcast — skywatching unlikely',
  'verdict.observing_score': 'Observing Score',
  'verdict.avg_cloud': 'Avg Cloud Cover',
  'verdict.best_window': 'Best Window',
  'verdict.all_night': 'All night',
  'verdict.peak': 'Peak',
  'verdict.hours': 'hrs',

  // Weather & Atmosphere
  'weather.title': 'Atmospheric Conditions',
  'weather.cloud_track': 'Observing Hours Cloud Cover Track',
  'weather.clarity': '{clarity}% clarity',
  'weather.temp': 'Temperature',
  'weather.feels_like': 'Feels like',
  'weather.humidity': 'Humidity',
  'weather.dew_point': 'Dew Point',
  'weather.wind': 'Wind',
  'weather.dew_low': 'Low (Dry air)',
  'weather.dew_moderate': 'Moderate (Dew shield advised)',
  'weather.dew_high': 'High Dew Risk (Dew heater recommended)',
  'weather.dew_frost': 'High Frost Risk (Heater essential)',

  // Sun & Twilight
  'sun.title': 'Sun & Twilight',
  'sun.sunset': 'Sunset',
  'sun.civil_dusk': 'Civil Dusk',
  'sun.nautical_dusk': 'Nautical Dusk',
  'sun.astro_dusk': 'Astro Dusk',
  'sun.true_night': 'True Night',
  'sun.astro_dawn': 'Astro Dawn',
  'sun.nautical_dawn': 'Nautical Dawn',
  'sun.civil_dawn': 'Civil Dawn',
  'sun.sunrise': 'Sunrise',
  'sun.solar_noon': 'Solar Noon',
  'sun.daylight': 'Daylight',
  'sun.darkness': 'Darkness',
  'sun.hazard_banner': '⚠️ SOLAR HAZARD: Never observe the Sun without certified, front-aperture solar filters.',

  // Moon Ephemeris
  'moon.title': 'Moon Ephemeris',
  'moon.illum': '{pct}% illuminated',
  'moon.lit': '{pct}% lit',
  'moon.waxing': 'Waxing',
  'moon.waning': 'Waning',
  'moon.rises': 'Rises',
  'moon.sets': 'Sets',
  'moon.phase.new_moon': 'New Moon',
  'moon.phase.waxing_crescent': 'Waxing Crescent',
  'moon.phase.first_quarter': 'First Quarter',
  'moon.phase.waxing_gibbous': 'Waxing Gibbous',
  'moon.phase.full_moon': 'Full Moon',
  'moon.phase.waning_gibbous': 'Waning Gibbous',
  'moon.phase.last_quarter': 'Last Quarter',
  'moon.phase.waning_crescent': 'Waning Crescent',
  'moon.next_new': 'Next New Moon',
  'moon.next_full': 'Next Full Moon',

  // Solar System Targets
  'planets.title': 'Solar System Targets',
  'planets.target': 'Target',
  'planets.rise': 'Rise',
  'planets.set': 'Set',
  'planets.status': 'Visibility Status',
  'planets.view_starfield': 'View in 10° Starfield',
  'planets.sun': 'Sun',
  'planets.moon': 'Moon',
  'planets.mercury': 'Mercury',
  'planets.venus': 'Venus',
  'planets.mars': 'Mars',
  'planets.jupiter': 'Jupiter',
  'planets.saturn': 'Saturn',
  'planets.uranus': 'Uranus',
  'planets.neptune': 'Neptune',
  'planets.up_all_night': 'Up all night',
  'planets.evening_sets': 'Evening · sets {time}',
  'planets.morning_rises': 'Morning · rises {time}',
  'planets.sets_at': 'Sets {time}',
  'planets.below_horizon': 'Below horizon',
  'planets.circumpolar': 'Circumpolar',
  'planets.daylight_solar': 'Daylight / Solar',

  // Planet Modal
  'modal.altitude': 'Altitude',
  'modal.azimuth': 'Azimuth',
  'modal.constellation': 'Constellation',
  'modal.magnitude': 'Magnitude',
  'modal.distance': 'Distance',
  'modal.ra': 'Right Ascension',
  'modal.dec': 'Declination',
  'modal.close': 'Close',
  'modal.in_field': 'In Field:',
  'modal.center_on': 'Center on {name}',
  'modal.tap_hint': 'Tap any star to inspect & measure',

  // 10° Starfield Canvas HUD
  'starfield.title': '10° Interactive Starfield',
  'starfield.circular_fov': 'Circular FOV (Eyepiece)',
  'starfield.square_frame': 'Square Sensor Frame',
  'starfield.orient_natural': 'Natural (Zenith Up)',
  'starfield.orient_north_up': 'North-Up (Equatorial)',
  'starfield.orient_south_up': 'South-Up (Inverted)',
  'starfield.zenith_up': 'ZENITH (UP)',
  'starfield.ground_down': 'GROUND (DOWN)',
  'starfield.facing': 'FACING {dir} ({deg}°)',
  'starfield.horizon': 'HORIZON',
  'starfield.earth_surface': '🌍 Earth Surface · Target Alt {alt}°',
  'starfield.solar_hazard': '⚠️ SOLAR HAZARD',
  'starfield.solar_proximity': '⚠️ SOLAR PROXIMITY HAZARD — NO OPTICS',
  'starfield.sep': '{deg}° sep',
  'starfield.stars_count': '{count} stars',
  'starfield.preset_now': 'Now',
  'starfield.preset_dusk': 'Dusk',
  'starfield.preset_dawn': 'Dawn',
  'starfield.preset_rise': 'Rise',
  'starfield.preset_set': 'Set',
  'starfield.time': 'Time',
  'starfield.reset_now': 'Reset to Now',
  'starfield.angular_separation': 'Angular Separation',
  'starfield.bearing': 'Bearing / Position Angle',
  'starfield.lines': 'Lines',
  'starfield.lines_off': 'Lines Off',
  'starfield.names': 'Names',
  'starfield.names_off': 'Names Off',
  'starfield.eyepiece': 'Eyepiece',
  'starfield.sensor': 'Sensor',

  // Onboarding Tour
  'tour.welcome_title': 'Interactive 10° Starfield',
  'tour.welcome_desc': 'Simulate realistic telescope and binocular views with true field rotation, horizon occlusion, companion target tracking, and interactive celestial ruler.',
  'tour.twilight_title': 'Precision Twilight Tracking',
  'tour.twilight_desc': 'Track Civil, Nautical, and Astronomical twilight phases calculated offline with Jean Meeus ephemeris algorithms to plan peak dark-sky observation.',
  'tour.weather_title': 'Hyperlocal Atmosphere & Dew Risk',
  'tour.weather_desc': 'Hourly dark-window cloud tracking with dew point depression monitoring to alert you before moisture forms on your telescope optics.',
  'tour.offline_title': '100% Offline & Private',
  'tour.offline_desc': 'SkyOracle computes all solar system orbits, rise/set times, moon phases, and star positions locally on your device with zero tracking.',
  'tour.next': 'Next →',
  'tour.back': '← Back',
  'tour.get_started': 'Get Started 🚀',
  'tour.skip': 'Skip Tour',
};

const es: TranslationDictionary = {
  // App Shell & Navigation
  'app.tagline': 'Pronóstico astronómico, efemérides y guía planetaria',
  'app.offline': 'Sin conexión',
  'app.detecting_location': 'Detectando ubicación...',
  'app.use_gps': 'Usar ubicación GPS actual',
  'app.install_app': 'Instalar App',
  'app.tour': 'Guía',
  'app.tour_tooltip': 'Explorar funciones de SkyOracle y guía del campo estelar',
  'app.refresh': 'Actualizar Pronóstico',
  'app.calculating': 'Calculando efemérides celestes y pronóstico...',
  'app.error_title': 'No se pudo cargar el pronóstico de observación',
  'app.retry': 'Reintentar con ubicación GPS',
  'app.powered_by': 'Cálculos celestes sin conexión con efemérides Jean Meeus y pronóstico de ventana oscura Open-Meteo.',

  // Location Search Modal
  'search.title': 'Ubicación de Observación',
  'search.placeholder': 'Buscar ciudad (ej. Madrid, Atacama, Bogotá)...',
  'search.recent': 'Ubicaciones Recientes',
  'search.results': 'Resultados de Búsqueda',
  'search.clear': 'Borrar',
  'search.searching': 'Buscando ubicaciones...',
  'search.no_results': 'No se encontraron ciudades. Intenta otra búsqueda.',
  'search.gps_active': 'Usando Geolocalización GPS',
  'search.close': 'Cerrar',

  // Hero Verdict Card
  'verdict.tonight': 'Esta noche ({date})',
  'verdict.clear': 'Despejado — excelente para observar',
  'verdict.partly_cloudy': 'Parcialmente nublado — claros para observar',
  'verdict.mostly_cloudy': 'Mayormente nublado — ventanas limitadas',
  'verdict.overcast': 'Cubierto — observación poco probable',
  'verdict.observing_score': 'Puntuación de Observación',
  'verdict.avg_cloud': 'Nubosidad Promedio',
  'verdict.best_window': 'Mejor Ventana',
  'verdict.all_night': 'Toda la noche',
  'verdict.peak': 'Pico',
  'verdict.hours': 'h',

  // Weather & Atmosphere
  'weather.title': 'Condiciones Atmosféricas',
  'weather.cloud_track': 'Seguimiento de Nubosidad en Horas de Observación',
  'weather.clarity': '{clarity}% visibilidad',
  'weather.temp': 'Temperatura',
  'weather.feels_like': 'Sensación térmica',
  'weather.humidity': 'Humedad',
  'weather.dew_point': 'Punto de Rocío',
  'weather.wind': 'Viento',
  'weather.dew_low': 'Bajo (Aire seco)',
  'weather.dew_moderate': 'Moderado (Protector de rocío recomendado)',
  'weather.dew_high': 'Alto riesgo de rocío (Calentador recomendado)',
  'weather.dew_frost': 'Alto riesgo de escarcha (Calentador esencial)',

  // Sun & Twilight
  'sun.title': 'Sol y Crepúsculos',
  'sun.sunset': 'Puesta del Sol',
  'sun.civil_dusk': 'Ocaso Civil',
  'sun.nautical_dusk': 'Ocaso Náutico',
  'sun.astro_dusk': 'Ocaso Astronómico',
  'sun.true_night': 'Noche Oscura',
  'sun.astro_dawn': 'Amanecer Astronómico',
  'sun.nautical_dawn': 'Amanecer Náutico',
  'sun.civil_dawn': 'Amanecer Civil',
  'sun.sunrise': 'Salida del Sol',
  'sun.solar_noon': 'Mediodía Solar',
  'sun.daylight': 'Luz Diurna',
  'sun.darkness': 'Oscuridad',
  'sun.hazard_banner': '⚠️ PELIGRO SOLAR: Nunca observe el Sol sin filtros solares certificados de apertura frontal.',

  // Moon Ephemeris
  'moon.title': 'Efemérides Lunares',
  'moon.illum': '{pct}% iluminada',
  'moon.lit': '{pct}% iluminada',
  'moon.waxing': 'Creciente',
  'moon.waning': 'Menguante',
  'moon.rises': 'Salida',
  'moon.sets': 'Puesta',
  'moon.phase.new_moon': 'Luna Nueva',
  'moon.phase.waxing_crescent': 'Luna Creciente',
  'moon.phase.first_quarter': 'Cuarto Creciente',
  'moon.phase.waxing_gibbous': 'Gibosa Creciente',
  'moon.phase.full_moon': 'Luna Llena',
  'moon.phase.waning_gibbous': 'Gibosa Menguante',
  'moon.phase.last_quarter': 'Cuarto Menguante',
  'moon.phase.waning_crescent': 'Luna Menguante',
  'moon.next_new': 'Próxima Luna Nueva',
  'moon.next_full': 'Próxima Luna Llena',

  // Solar System Targets
  'planets.title': 'Objetos del Sistema Solar',
  'planets.target': 'Objeto',
  'planets.rise': 'Salida',
  'planets.set': 'Puesta',
  'planets.status': 'Estado de Visibilidad',
  'planets.view_starfield': 'Ver en Campo Estelar 10°',
  'planets.sun': 'Sol',
  'planets.moon': 'Luna',
  'planets.mercury': 'Mercurio',
  'planets.venus': 'Venus',
  'planets.mars': 'Marte',
  'planets.jupiter': 'Júpiter',
  'planets.saturn': 'Saturno',
  'planets.uranus': 'Urano',
  'planets.neptune': 'Neptuno',
  'planets.up_all_night': 'Toda la noche',
  'planets.evening_sets': 'Vespertino · se oculta a las {time}',
  'planets.morning_rises': 'Matutino · sale a las {time}',
  'planets.sets_at': 'Se oculta a las {time}',
  'planets.below_horizon': 'Bajo el horizonte',
  'planets.circumpolar': 'Circumpolar',
  'planets.daylight_solar': 'Diurno / Solar',

  // Planet Modal
  'modal.altitude': 'Altitud',
  'modal.azimuth': 'Acimut',
  'modal.constellation': 'Constelación',
  'modal.magnitude': 'Magnitud',
  'modal.distance': 'Distancia',
  'modal.ra': 'Ascensión Recta',
  'modal.dec': 'Declinación',
  'modal.close': 'Cerrar',
  'modal.in_field': 'En el campo:',
  'modal.center_on': 'Centrar en {name}',
  'modal.tap_hint': 'Toca cualquier estrella para inspeccionar y medir',

  // 10° Starfield Canvas HUD
  'starfield.title': 'Campo Estelar 10° Interactivo',
  'starfield.circular_fov': 'Campo Circular (Ocular)',
  'starfield.square_frame': 'Marco Sensor Cuadrado',
  'starfield.orient_natural': 'Natural (Cénit Arriba)',
  'starfield.orient_north_up': 'Norte Arriba (Ecuatorial)',
  'starfield.orient_south_up': 'Sur Arriba (Invertido)',
  'starfield.zenith_up': 'CÉNIT (ARRIBA)',
  'starfield.ground_down': 'SUELO (ABAJO)',
  'starfield.facing': 'MIRANDO HACIA {dir} ({deg}°)',
  'starfield.horizon': 'HORIZONTE',
  'starfield.earth_surface': '🌍 Superficie Terrestre · Altitud {alt}°',
  'starfield.solar_hazard': '⚠️ PELIGRO SOLAR',
  'starfield.solar_proximity': '⚠️ PELIGRO PROXIMIDAD SOLAR — SIN ÓPTICA',
  'starfield.sep': '{deg}° sep',
  'starfield.stars_count': '{count} estrellas',
  'starfield.preset_now': 'Ahora',
  'starfield.preset_dusk': 'Ocaso',
  'starfield.preset_dawn': 'Amanecer',
  'starfield.preset_rise': 'Salida',
  'starfield.preset_set': 'Puesta',
  'starfield.time': 'Hora',
  'starfield.reset_now': 'Restablecer a ahora',
  'starfield.angular_separation': 'Separación angular',
  'starfield.bearing': 'Rumbo / Ángulo de posición',
  'starfield.lines': 'Líneas',
  'starfield.lines_off': 'Sin líneas',
  'starfield.names': 'Nombres',
  'starfield.names_off': 'Sin nombres',
  'starfield.eyepiece': 'Ocular',
  'starfield.sensor': 'Sensor',

  // Onboarding Tour
  'tour.welcome_title': 'Campo Estelar 10° Interactivo',
  'tour.welcome_desc': 'Simula vistas realistas de telescopio y prismáticos con rotación de campo real, oclusión del horizonte, seguimiento de objetos y regla celeste interactiva.',
  'tour.twilight_title': 'Seguimiento Preciso de Crepúsculos',
  'tour.twilight_desc': 'Sigue las fases civil, náutica y astronómica calculadas sin conexión con algoritmos de Jean Meeus para planificar la máxima oscuridad.',
  'tour.weather_title': 'Atmósfera y Riesgo de Rocío',
  'tour.weather_desc': 'Seguimiento horario de nubosidad y depresión del punto de rocío para proteger la óptica de tu telescopio antes de que se condense humedad.',
  'tour.offline_title': '100% Sin Conexión y Privado',
  'tour.offline_desc': 'SkyOracle calcula todas las órbitas planetarias, fases lunares y posiciones estelares localmente en tu dispositivo sin rastreo.',
  'tour.next': 'Siguiente →',
  'tour.back': '← Atrás',
  'tour.get_started': 'Comenzar 🚀',
  'tour.skip': 'Omitir Guía',
};

const pt: TranslationDictionary = {
  // App Shell & Navigation
  'app.tagline': 'Previsão astronômica, efemérides e guia planetário',
  'app.offline': 'Offline',
  'app.detecting_location': 'Detectando localização...',
  'app.use_gps': 'Usar localização GPS atual',
  'app.install_app': 'Instalar App',
  'app.tour': 'Guia',
  'app.tour_tooltip': 'Explorar recursos do SkyOracle e guia do campo estelar',
  'app.refresh': 'Atualizar Previsão',
  'app.calculating': 'Calculando efemérides celestes e previsão...',
  'app.error_title': 'Não foi possível carregar a previsão de observação',
  'app.retry': 'Tentar novamente com GPS',
  'app.powered_by': 'Cálculos celestes offline com efemérides Jean Meeus e previsão de janela escura Open-Meteo.',

  // Location Search Modal
  'search.title': 'Local de Observação',
  'search.placeholder': 'Buscar cidade (ex. São Paulo, Lisboa, Atacama)...',
  'search.recent': 'Locais Recentes',
  'search.results': 'Resultados da Busca',
  'search.clear': 'Limpar',
  'search.searching': 'Buscando cidades...',
  'search.no_results': 'Nenhuma cidade encontrada. Tente outra busca.',
  'search.gps_active': 'Usando Geolocalização GPS',
  'search.close': 'Fechar',

  // Hero Verdict Card
  'verdict.tonight': 'Hoje à noite ({date})',
  'verdict.clear': 'Céu limpo — excelente para observar',
  'verdict.partly_cloudy': 'Parcialmente nublado — aberturas para observar',
  'verdict.mostly_cloudy': 'Muito nublado — janelas limitadas',
  'verdict.overcast': 'Encoberto — observação improvável',
  'verdict.observing_score': 'Pontuação de Observação',
  'verdict.avg_cloud': 'Média de Nuvens',
  'verdict.best_window': 'Melhor Janela',
  'verdict.all_night': 'A noite toda',
  'verdict.peak': 'Pico',
  'verdict.hours': 'h',

  // Weather & Atmosphere
  'weather.title': 'Condições Atmosféricas',
  'weather.cloud_track': 'Acompanhamento de Nuvens nas Horas de Observação',
  'weather.clarity': '{clarity}% visibilidade',
  'weather.temp': 'Temperatura',
  'weather.feels_like': 'Sensação térmica',
  'weather.humidity': 'Umidade',
  'weather.dew_point': 'Ponto de Orvalho',
  'weather.wind': 'Vento',
  'weather.dew_low': 'Baixo (Ar seco)',
  'weather.dew_moderate': 'Moderado (Protetor de orvalho recomendado)',
  'weather.dew_high': 'Alto risco de orvalho (Aquecedor recomendado)',
  'weather.dew_frost': 'Alto risco de geada (Aquecedor essencial)',

  // Sun & Twilight
  'sun.title': 'Sol e Crepúsculos',
  'sun.sunset': 'Pôr do Sol',
  'sun.civil_dusk': 'Crepúsculo Civil',
  'sun.nautical_dusk': 'Crepúsculo Náutico',
  'sun.astro_dusk': 'Crepúsculo Astronômico',
  'sun.true_night': 'Noite Escura',
  'sun.astro_dawn': 'Alvorecer Astronômico',
  'sun.nautical_dawn': 'Alvorecer Náutico',
  'sun.civil_dawn': 'Alvorecer Civil',
  'sun.sunrise': 'Nascer do Sol',
  'sun.solar_noon': 'Meio-dia Solar',
  'sun.daylight': 'Luz Diurna',
  'sun.darkness': 'Escuridão',
  'sun.hazard_banner': '⚠️ PERIGO SOLAR: Nunca observe o Sol sem filtros solares frontais certificados.',

  // Moon Ephemeris
  'moon.title': 'Efemérides Lunares',
  'moon.illum': '{pct}% iluminada',
  'moon.lit': '{pct}% iluminada',
  'moon.waxing': 'Crescente',
  'moon.waning': 'Minguante',
  'moon.rises': 'Nascer',
  'moon.sets': 'Pôr',
  'moon.phase.new_moon': 'Lua Nova',
  'moon.phase.waxing_crescent': 'Lua Crescente',
  'moon.phase.first_quarter': 'Quarto Crescente',
  'moon.phase.waxing_gibbous': 'Gibosa Crescente',
  'moon.phase.full_moon': 'Lua Cheia',
  'moon.phase.waning_gibbous': 'Gibosa Minguante',
  'moon.phase.last_quarter': 'Quarto Minguante',
  'moon.phase.waning_crescent': 'Lua Minguante',
  'moon.next_new': 'Próxima Lua Nova',
  'moon.next_full': 'Próxima Lua Cheia',

  // Solar System Targets
  'planets.title': 'Alvos do Sistema Solar',
  'planets.target': 'Alvo',
  'planets.rise': 'Nascer',
  'planets.set': 'Pôr',
  'planets.status': 'Visibilidade',
  'planets.view_starfield': 'Ver no Campo Estelar 10°',
  'planets.sun': 'Sol',
  'planets.moon': 'Lua',
  'planets.mercury': 'Mercúrio',
  'planets.venus': 'Vênus',
  'planets.mars': 'Marte',
  'planets.jupiter': 'Júpiter',
  'planets.saturn': 'Saturno',
  'planets.uranus': 'Urano',
  'planets.neptune': 'Netuno',
  'planets.up_all_night': 'A noite toda',
  'planets.evening_sets': 'Entardecer · põe-se às {time}',
  'planets.morning_rises': 'Madrugada · nasce às {time}',
  'planets.sets_at': 'Põe-se às {time}',
  'planets.below_horizon': 'Abaixo do horizonte',
  'planets.circumpolar': 'Circumpolar',
  'planets.daylight_solar': 'Diurno / Solar',

  // Planet Modal
  'modal.altitude': 'Altitude',
  'modal.azimuth': 'Azimute',
  'modal.constellation': 'Constelação',
  'modal.magnitude': 'Magnitude',
  'modal.distance': 'Distância',
  'modal.ra': 'Ascensão Reta',
  'modal.dec': 'Declinação',
  'modal.close': 'Fechar',
  'modal.in_field': 'No campo:',
  'modal.center_on': 'Centralizar em {name}',
  'modal.tap_hint': 'Toque em qualquer estrela para inspecionar e medir',

  // 10° Starfield Canvas HUD
  'starfield.title': 'Campo Estelar 10° Interativo',
  'starfield.circular_fov': 'Campo Circular (Ocular)',
  'starfield.square_frame': 'Sensor Quadrado',
  'starfield.orient_natural': 'Natural (Zênite para Cima)',
  'starfield.orient_north_up': 'Norte para Cima (Equatorial)',
  'starfield.orient_south_up': 'Sul para Cima (Invertido)',
  'starfield.zenith_up': 'ZÊNITE (CIMA)',
  'starfield.ground_down': 'CHÃO (BAIXO)',
  'starfield.facing': 'DIREÇÃO {dir} ({deg}°)',
  'starfield.horizon': 'HORIZONTE',
  'starfield.earth_surface': '🌍 Superfície da Terra · Alt {alt}°',
  'starfield.solar_hazard': '⚠️ PERIGO SOLAR',
  'starfield.solar_proximity': '⚠️ RISCO PROXIMIDADE SOLAR — SEM ÓPTICA',
  'starfield.sep': '{deg}° sep',
  'starfield.stars_count': '{count} estrelas',
  'starfield.preset_now': 'Agora',
  'starfield.preset_dusk': 'Anoitecer',
  'starfield.preset_dawn': 'Amanhecer',
  'starfield.preset_rise': 'Nascer',
  'starfield.preset_set': 'Pôr',
  'starfield.time': 'Hora',
  'starfield.reset_now': 'Restaurar para agora',
  'starfield.angular_separation': 'Separação angular',
  'starfield.bearing': 'Rumo / Ângulo de posição',
  'starfield.lines': 'Linhas',
  'starfield.lines_off': 'Sem linhas',
  'starfield.names': 'Nomes',
  'starfield.names_off': 'Sem nomes',
  'starfield.eyepiece': 'Ocular',
  'starfield.sensor': 'Sensor',

  // Onboarding Tour
  'tour.welcome_title': 'Campo Estelar 10° Interativo',
  'tour.welcome_desc': 'Simule visualizações realistas de telescópios e binóculos com rotação de campo, oclusão do horizonte e régua celeste interativa.',
  'tour.twilight_title': 'Rastreamento Preciso de Crepúsculos',
  'tour.twilight_desc': 'Monitore fases civil, náutica e astronômica calculadas offline com algoritmos Jean Meeus para o céu mais escuro.',
  'tour.weather_title': 'Atmosfera e Risco de Orvalho',
  'tour.weather_desc': 'Acompanhamento horário de nebulosidade e depressão do ponto de orvalho para proteger a óptica do seu telescópio.',
  'tour.offline_title': '100% Offline e Privado',
  'tour.offline_desc': 'SkyOracle calcula todas as órbitas planetárias, fases da lua e posições das estrelas localmente sem rastreamento.',
  'tour.next': 'Próximo →',
  'tour.back': '← Voltar',
  'tour.get_started': 'Começar 🚀',
  'tour.skip': 'Pular Guia',
};

const de: TranslationDictionary = {
  // App Shell & Navigation
  'app.tagline': 'Astronomische Vorhersage, Ephemeriden & Planetenführer',
  'app.offline': 'Offline',
  'app.detecting_location': 'Standort wird ermittelt...',
  'app.use_gps': 'Aktuellen GPS-Standort verwenden',
  'app.install_app': 'App installieren',
  'app.tour': 'Tour',
  'app.tour_tooltip': 'SkyOracle Funktionen & Sternfeld-Leitfaden erkunden',
  'app.refresh': 'Vorhersage aktualisieren',
  'app.calculating': 'Himmelsdaten und Vorhersage werden berechnet...',
  'app.error_title': 'Beobachtungsvorhersage konnte nicht geladen werden',
  'app.retry': 'Mit GPS-Standort erneut versuchen',
  'app.powered_by': 'Offline-Himmelsberechnungen mit Jean Meeus Ephemeriden & Open-Meteo Dunkelfenster-Vorhersage.',

  // Location Search Modal
  'search.title': 'Beobachtungsstandort',
  'search.placeholder': 'Stadt suchen (z. B. Berlin, München, Wien, Zürich)...',
  'search.recent': 'Letzte Standorte',
  'search.results': 'Suchergebnisse',
  'search.clear': 'Löschen',
  'search.searching': 'Standorte werden gesucht...',
  'search.no_results': 'Keine Städte gefunden. Bitte erneut suchen.',
  'search.gps_active': 'GPS-Standort aktiv',
  'search.close': 'Schließen',

  // Hero Verdict Card
  'verdict.tonight': 'Heute Nacht ({date})',
  'verdict.clear': 'Klar — hervorragend zum Beobachten',
  'verdict.partly_cloudy': 'Teilweise bewölkt — Wolkenlücken nutzen',
  'verdict.mostly_cloudy': 'Überwiegend bewölkt — begrenzte Sicht',
  'verdict.overcast': 'Bedeckt — Beobachtung unwahrscheinlich',
  'verdict.observing_score': 'Beobachtungsindex',
  'verdict.avg_cloud': 'Mittlere Bewölkung',
  'verdict.best_window': 'Bestes Zeitfenster',
  'verdict.all_night': 'Die ganze Nacht',
  'verdict.peak': 'Höhepunkt',
  'verdict.hours': 'Std',

  // Weather & Atmosphere
  'weather.title': 'Atmosphärische Bedingungen',
  'weather.cloud_track': 'Bewölkungsverlauf während der Beobachtungsstunden',
  'weather.clarity': '{clarity}% Sicht',
  'weather.temp': 'Temperatur',
  'weather.feels_like': 'Gefühlt',
  'weather.humidity': 'Luftfeuchtigkeit',
  'weather.dew_point': 'Taupunkt',
  'weather.wind': 'Wind',
  'weather.dew_low': 'Gering (Trockene Luft)',
  'weather.dew_moderate': 'Mäßig (Taukappe empfohlen)',
  'weather.dew_high': 'Hohes Taurisiko (Tauheizung empfohlen)',
  'weather.dew_frost': 'Hohes Frostrisiko (Heizung unerlässlich)',

  // Sun & Twilight
  'sun.title': 'Sonne & Dämmerung',
  'sun.sunset': 'Sonnenuntergang',
  'sun.civil_dusk': 'Bürgerliche Dämmerung',
  'sun.nautical_dusk': 'Nautische Dämmerung',
  'sun.astro_dusk': 'Astronomische Dämmerung',
  'sun.true_night': 'Wahre Nacht',
  'sun.astro_dawn': 'Astronomischer Beginn',
  'sun.nautical_dawn': 'Nautischer Beginn',
  'sun.civil_dawn': 'Bürgerlicher Beginn',
  'sun.sunrise': 'Sonnenaufgang',
  'sun.solar_noon': 'Sonnenhöchststand',
  'sun.daylight': 'Tageslicht',
  'sun.darkness': 'Dunkelheit',
  'sun.hazard_banner': '⚠️ SONNENGEFAHR: Niemals ohne zertifizierte Sonnenfilter in die Sonne blicken.',

  // Moon Ephemeris
  'moon.title': 'Mond-Ephemeriden',
  'moon.illum': '{pct}% beleuchtet',
  'moon.lit': '{pct}% beleuchtet',
  'moon.waxing': 'Zunehmend',
  'moon.waning': 'Abnehmend',
  'moon.rises': 'Aufgang',
  'moon.sets': 'Untergang',
  'moon.phase.new_moon': 'Neumond',
  'moon.phase.waxing_crescent': 'Zunehmende Sichel',
  'moon.phase.first_quarter': 'Erstes Viertel',
  'moon.phase.waxing_gibbous': 'Zunehmender Mond',
  'moon.phase.full_moon': 'Vollmond',
  'moon.phase.waning_gibbous': 'Abnehmender Mond',
  'moon.phase.last_quarter': 'Letztes Viertel',
  'moon.phase.waning_crescent': 'Abnehmende Sichel',
  'moon.next_new': 'Nächster Neumond',
  'moon.next_full': 'Nächster Vollmond',

  // Solar System Targets
  'planets.title': 'Sonnensystem-Objekte',
  'planets.target': 'Objekt',
  'planets.rise': 'Aufgang',
  'planets.set': 'Untergang',
  'planets.status': 'Sichtbarkeitsstatus',
  'planets.view_starfield': 'Im 10°-Sternfeld ansehen',
  'planets.sun': 'Sonne',
  'planets.moon': 'Mond',
  'planets.mercury': 'Merkur',
  'planets.venus': 'Venus',
  'planets.mars': 'Mars',
  'planets.jupiter': 'Jupiter',
  'planets.saturn': 'Saturn',
  'planets.uranus': 'Uranus',
  'planets.neptune': 'Neptun',
  'planets.up_all_night': 'Ganze Nacht sichtbar',
  'planets.evening_sets': 'Abends · geht unter um {time}',
  'planets.morning_rises': 'Morgens · geht auf um {time}',
  'planets.sets_at': 'Geht unter um {time}',
  'planets.below_horizon': 'Unter dem Horizont',
  'planets.circumpolar': 'Zirkumpolar',
  'planets.daylight_solar': 'Taghimmel / Solar',

  // Planet Modal
  'modal.altitude': 'Höhe',
  'modal.azimuth': 'Azimut',
  'modal.constellation': 'Sternbild',
  'modal.magnitude': 'Helligkeit',
  'modal.distance': 'Entfernung',
  'modal.ra': 'Rektaszension',
  'modal.dec': 'Deklination',
  'modal.close': 'Schließen',
  'modal.in_field': 'Im Sichtfeld:',
  'modal.center_on': 'Auf {name} zentrieren',
  'modal.tap_hint': 'Beliebigen Stern zum Messen und Prüfen antippen',

  // 10° Starfield Canvas HUD
  'starfield.title': 'Interaktives 10°-Sternfeld',
  'starfield.circular_fov': 'Kreisfeld (Okular)',
  'starfield.square_frame': 'Quadratischer Sensor',
  'starfield.orient_natural': 'Natürlich (Zenit Oben)',
  'starfield.orient_north_up': 'Norden Oben (Äquatorial)',
  'starfield.orient_south_up': 'Süden Oben (Invertiert)',
  'starfield.zenith_up': 'ZENIT (OBEN)',
  'starfield.ground_down': 'BODEN (UNTEN)',
  'starfield.facing': 'BLICKRICHTUNG {dir} ({deg}°)',
  'starfield.horizon': 'HORIZONT',
  'starfield.earth_surface': '🌍 Erdoberfläche · Höhe {alt}°',
  'starfield.solar_hazard': '⚠️ SONNENGEFAHR',
  'starfield.solar_proximity': '⚠️ SONNENNÄHE-GEFAHR — KEINE OPTIK',
  'starfield.sep': '{deg}° Abstand',
  'starfield.stars_count': '{count} Sterne',
  'starfield.preset_now': 'Jetzt',
  'starfield.preset_dusk': 'Abend',
  'starfield.preset_dawn': 'Morgen',
  'starfield.preset_rise': 'Aufgang',
  'starfield.preset_set': 'Untergang',
  'starfield.time': 'Zeit',
  'starfield.reset_now': 'Auf Jetzt zurücksetzen',
  'starfield.angular_separation': 'Winkelabstand',
  'starfield.bearing': 'Peilung / Positionswinkel',
  'starfield.lines': 'Linien',
  'starfield.lines_off': 'Linien Aus',
  'starfield.names': 'Namen',
  'starfield.names_off': 'Namen Aus',
  'starfield.eyepiece': 'Okular',
  'starfield.sensor': 'Sensor',

  // Onboarding Tour
  'tour.welcome_title': 'Interaktives 10°-Sternfeld',
  'tour.welcome_desc': 'Simuliere realistische Teleskop- und Fernglasansichten mit wahrer Feldrotation, Horizont-Verdeckung und Himmelslineal.',
  'tour.twilight_title': 'Präzise Dämmerungsphasen',
  'tour.twilight_desc': 'Verfolge bürgerliche, nautische und astronomische Dämmerung offline berechnet mit Jean Meeus Algorithmen.',
  'tour.weather_title': 'Hyperlokales Wetter & Taurisiko',
  'tour.weather_desc': 'Stündliche Bewölkungsvorhersage und Taupunktüberwachung zum Schutz Ihrer Teleskop-Optik vor Feuchtigkeit.',
  'tour.offline_title': '100% Offline & Privat',
  'tour.offline_desc': 'SkyOracle berechnet Planetenbahnen, Mondphasen und Sternpositionen vollständig lokal auf Ihrem Gerät ohne Tracking.',
  'tour.next': 'Weiter →',
  'tour.back': '← Zurück',
  'tour.get_started': 'Loslegen 🚀',
  'tour.skip': 'Tour überspringen',
};

const fr: TranslationDictionary = {
  // App Shell & Navigation
  'app.tagline': 'Prévisions astronomiques, éphémérides et guide des planètes',
  'app.offline': 'Hors ligne',
  'app.detecting_location': 'Localisation en cours...',
  'app.use_gps': 'Utiliser la position GPS actuelle',
  'app.install_app': 'Installer l\'App',
  'app.tour': 'Guide',
  'app.tour_tooltip': 'Découvrir les fonctionnalités de SkyOracle et le champ stellaire',
  'app.refresh': 'Actualiser les prévisions',
  'app.calculating': 'Calcul des éphémérides et prévisions...',
  'app.error_title': 'Impossible de charger les prévisions d\'observation',
  'app.retry': 'Réessayer avec la position GPS',
  'app.powered_by': 'Calculs célestes hors ligne avec éphémérides Jean Meeus et prévision de fenêtre nocturne Open-Meteo.',

  // Location Search Modal
  'search.title': 'Lieu d\'observation',
  'search.placeholder': 'Rechercher une ville (ex. Paris, Lyon, Pic du Midi)...',
  'search.recent': 'Lieux récents',
  'search.results': 'Résultats de recherche',
  'search.clear': 'Effacer',
  'search.searching': 'Recherche des lieux...',
  'search.no_results': 'Aucune ville trouvée. Essayez une autre recherche.',
  'search.gps_active': 'Géolocalisation GPS active',
  'search.close': 'Fermer',

  // Hero Verdict Card
  'verdict.tonight': 'Ce soir ({date})',
  'verdict.clear': 'Dégagé — excellent pour observer',
  'verdict.partly_cloudy': 'Partiellement nuageux — éclaircies exploitables',
  'verdict.mostly_cloudy': 'Très nuageux — créneaux limités',
  'verdict.overcast': 'Couvert — observation compromise',
  'verdict.observing_score': 'Indice d\'Observation',
  'verdict.avg_cloud': 'Couverture Nuageuse Moyenne',
  'verdict.best_window': 'Meilleur Créneau',
  'verdict.all_night': 'Toute la nuit',
  'verdict.peak': 'Pic',
  'verdict.hours': 'h',

  // Weather & Atmosphere
  'weather.title': 'Conditions Atmosphériques',
  'weather.cloud_track': 'Évolution Nuageuse Durant les Heures d\'Observation',
  'weather.clarity': '{clarity}% clarté',
  'weather.temp': 'Température',
  'weather.feels_like': 'Ressenti',
  'weather.humidity': 'Humidité',
  'weather.dew_point': 'Point de Rosée',
  'weather.wind': 'Vent',
  'weather.dew_low': 'Faible (Air sec)',
  'weather.dew_moderate': 'Modéré (Pare-buée conseillé)',
  'weather.dew_high': 'Risque élevé de buée (Résistance chauffante recommandée)',
  'weather.dew_frost': 'Risque élevé de gel (Chauffage indispensable)',

  // Sun & Twilight
  'sun.title': 'Soleil & Crépuscules',
  'sun.sunset': 'Coucher du Soleil',
  'sun.civil_dusk': 'Crépuscule Civil',
  'sun.nautical_dusk': 'Crépuscule Nautique',
  'sun.astro_dusk': 'Crépuscule Astronomique',
  'sun.true_night': 'Nuit Noire',
  'sun.astro_dawn': 'Aube Astronomique',
  'sun.nautical_dawn': 'Aube Nautique',
  'sun.civil_dawn': 'Aube Civile',
  'sun.sunrise': 'Lever du Soleil',
  'sun.solar_noon': 'Midi Solaire',
  'sun.daylight': 'Lumière du Jour',
  'sun.darkness': 'Obscurité',
  'sun.hazard_banner': '⚠️ DANGER SOLAIRE : Ne jamais observer le Soleil sans filtres solaires certifiés en entrée d\'ouverture.',

  // Moon Ephemeris
  'moon.title': 'Éphémérides Lunaires',
  'moon.illum': '{pct}% illuminée',
  'moon.lit': '{pct}% éclairée',
  'moon.waxing': 'Croissante',
  'moon.waning': 'Décroissante',
  'moon.rises': 'Lever',
  'moon.sets': 'Coucher',
  'moon.phase.new_moon': 'Nouvelle Lune',
  'moon.phase.waxing_crescent': 'Premier Croissant',
  'moon.phase.first_quarter': 'Premier Quartier',
  'moon.phase.waxing_gibbous': 'Lune Gibbeuse Croissante',
  'moon.phase.full_moon': 'Pleine Lune',
  'moon.phase.waning_gibbous': 'Lune Gibbeuse Décroissante',
  'moon.phase.last_quarter': 'Dernier Quartier',
  'moon.phase.waning_crescent': 'Dernier Croissant',
  'moon.next_new': 'Prochaine Nouvelle Lune',
  'moon.next_full': 'Prochaine Pleine Lune',

  // Solar System Targets
  'planets.title': 'Cibles du Système Solaire',
  'planets.target': 'Cible',
  'planets.rise': 'Lever',
  'planets.set': 'Coucher',
  'planets.status': 'Visibilité',
  'planets.view_starfield': 'Voir dans le Champ 10°',
  'planets.sun': 'Soleil',
  'planets.moon': 'Lune',
  'planets.mercury': 'Mercure',
  'planets.venus': 'Vénus',
  'planets.mars': 'Mars',
  'planets.jupiter': 'Jupiter',
  'planets.saturn': 'Saturne',
  'planets.uranus': 'Uranus',
  'planets.neptune': 'Neptune',
  'planets.up_all_night': 'Visible toute la nuit',
  'planets.evening_sets': 'Soirée · coucher à {time}',
  'planets.morning_rises': 'Matin · lever à {time}',
  'planets.sets_at': 'Coucher à {time}',
  'planets.below_horizon': 'Sous l\'horizon',
  'planets.circumpolar': 'Circumpolaire',
  'planets.daylight_solar': 'Diurne / Solaire',

  // Planet Modal
  'modal.altitude': 'Hauteur',
  'modal.azimuth': 'Azimut',
  'modal.constellation': 'Constellation',
  'modal.magnitude': 'Magnitude',
  'modal.distance': 'Distance',
  'modal.ra': 'Ascension Droite',
  'modal.dec': 'Déclinaison',
  'modal.close': 'Fermer',
  'modal.in_field': 'Dans le champ :',
  'modal.center_on': 'Centrer sur {name}',
  'modal.tap_hint': 'Touchez une étoile pour inspecter et mesurer',

  // 10° Starfield Canvas HUD
  'starfield.title': 'Champ Stellaire 10° Interactif',
  'starfield.circular_fov': 'Champ Circulaire (Oculaire)',
  'starfield.square_frame': 'Capteur Carré',
  'starfield.orient_natural': 'Naturel (Zénith en Haut)',
  'starfield.orient_north_up': 'Nord en Haut (Équatorial)',
  'starfield.orient_south_up': 'Sud en Haut (Inversé)',
  'starfield.zenith_up': 'ZÉNITH (HAUT)',
  'starfield.ground_down': 'SOL (BAS)',
  'starfield.facing': 'DIRECTION {dir} ({deg}°)',
  'starfield.horizon': 'HORIZON',
  'starfield.earth_surface': '🌍 Surface Terrestre · Hauteur {alt}°',
  'starfield.solar_hazard': '⚠️ DANGER SOLAIRE',
  'starfield.solar_proximity': '⚠️ DANGER PROXIMITÉ SOLAIRE — AUCUNE OPTIQUE',
  'starfield.sep': '{deg}° sép',
  'starfield.stars_count': '{count} étoiles',
  'starfield.preset_now': 'Maintenant',
  'starfield.preset_dusk': 'Crépuscule',
  'starfield.preset_dawn': 'Aube',
  'starfield.preset_rise': 'Lever',
  'starfield.preset_set': 'Coucher',
  'starfield.time': 'Heure',
  'starfield.reset_now': 'Revenir à maintenant',
  'starfield.angular_separation': 'Séparation angulaire',
  'starfield.bearing': 'Gisement / Angle de position',
  'starfield.lines': 'Lignes',
  'starfield.lines_off': 'Sans lignes',
  'starfield.names': 'Noms',
  'starfield.names_off': 'Sans noms',
  'starfield.eyepiece': 'Oculaire',
  'starfield.sensor': 'Capteur',

  // Onboarding Tour
  'tour.welcome_title': 'Champ Stellaire 10° Interactif',
  'tour.welcome_desc': 'Simulez des vues réalistes au télescope ou aux jumelles avec rotation de champ réelle, occlusion de l\'horizon et règle céleste.',
  'tour.twilight_title': 'Suivi Précis des Crépuscules',
  'tour.twilight_desc': 'Surveillez les crépuscules civils, nautiques et astronomiques calculés hors ligne avec les algorithmes de Jean Meeus.',
  'tour.weather_title': 'Météo Locale & Risque de Buée',
  'tour.weather_desc': 'Suivi horaire de la nébulosité et de la dépression du point de rosée pour protéger vos optiques avant la condensation.',
  'tour.offline_title': '100% Hors Ligne & Privé',
  'tour.offline_desc': 'SkyOracle calcule toutes les orbites, phases lunaires et positions d\'étoiles localement sur votre appareil sans traçage.',
  'tour.next': 'Suivant →',
  'tour.back': '← Retour',
  'tour.get_started': 'Commencer 🚀',
  'tour.skip': 'Passer le Guide',
};

const DICTIONARIES: Record<Locale, TranslationDictionary> = {
  en,
  es,
  pt,
  de,
  fr,
};

let currentLocale: Locale = detectInitialLocale();
const listeners = new Set<(locale: Locale) => void>();

function detectInitialLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && isSupportedLocale(saved)) {
      return saved as Locale;
    }
    if (typeof navigator !== 'undefined' && navigator.language) {
      const code = navigator.language.split('-')[0].toLowerCase();
      if (isSupportedLocale(code)) {
        return code as Locale;
      }
    }
  } catch {
    // LocalStorage or navigator not accessible
  }
  return 'en';
}

function isSupportedLocale(code: string): code is Locale {
  return SUPPORTED_LOCALES.some(l => l.code === code);
}

export function getLocale(): Locale {
  return currentLocale;
}

export function setLocale(locale: Locale): void {
  if (!isSupportedLocale(locale) || locale === currentLocale) return;
  currentLocale = locale;
  try {
    localStorage.setItem(STORAGE_KEY, locale);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }
  } catch {
    // Ignore storage issues in private modes
  }
  listeners.forEach(fn => fn(currentLocale));
}

export function onLocaleChange(listener: (locale: Locale) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Translate a semantic key with optional interpolated parameters {param}
 */
export function t(key: string, params?: Record<string, string | number>): string {
  const dict = DICTIONARIES[currentLocale] || DICTIONARIES.en;
  let text = dict[key] || DICTIONARIES.en[key] || key;

  if (params) {
    for (const [paramKey, val] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(val));
    }
  }

  return text;
}

/**
 * Format a Date using the active locale
 */
export function formatLocalizedDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
  const lang = currentLocale === 'en' ? 'en-US' : currentLocale;
  return new Intl.DateTimeFormat(lang, options ?? { weekday: 'short', month: 'short', day: 'numeric' }).format(date);
}

/**
 * Format hours & minutes in the active locale's natural conventions
 */
export function formatLocalizedTime(date: Date): string {
  const lang = currentLocale === 'en' ? 'en-US' : currentLocale;
  return new Intl.DateTimeFormat(lang, { hour: 'numeric', minute: '2-digit' }).format(date);
}
