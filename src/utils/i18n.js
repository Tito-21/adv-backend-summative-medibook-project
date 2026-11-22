// Locale files are loaded once when the module is first required (at startup),
// never inside a request handler.
const LOCALES = {
  en: require('../../locales/en.json'),
  fr: require('../../locales/fr.json'),
};

const DEFAULT_LOCALE = 'en';
const SUPPORTED_LOCALES = Object.keys(LOCALES);

/**
 * Picks the locale for a ?lang= value. Anything unsupported (missing, empty,
 * unknown, or repeated like ?lang=fr&lang=en) falls back to English.
 */
function resolveLocale(lang) {
  if (typeof lang !== 'string') return DEFAULT_LOCALE;
  const code = lang.trim().toLowerCase();
  return SUPPORTED_LOCALES.includes(code) ? code : DEFAULT_LOCALE;
}

function getMessages(locale) {
  return LOCALES[locale];
}

/** Formats a date for the locale, in the clinic's time zone (e.g. '+02:00'). */
function formatLocalizedDate(date, locale, timeZone) {
  return new Intl.DateTimeFormat(LOCALES[locale].intlLocale, { dateStyle: 'full', timeZone }).format(date);
}

module.exports = { SUPPORTED_LOCALES, resolveLocale, getMessages, formatLocalizedDate };
