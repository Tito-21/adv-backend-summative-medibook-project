const config = require('../config/env');
const auditLog = require('../utils/auditLogger');
const { SUPPORTED_LOCALES, resolveLocale, getMessages, formatLocalizedDate } = require('../utils/i18n');
const { renderFeedbackForm, renderThankYou } = require('../views/feedbackPage');

function buildPage(req) {
  const locale = resolveLocale(req.query.lang);
  const messages = getMessages(locale);
  return {
    locale,
    messages,
    today: formatLocalizedDate(new Date(), locale, config.db.timezone),
    languages: SUPPORTED_LOCALES.map((code) => ({ code, name: getMessages(code).languageName })),
  };
}

function showFeedbackForm(req, res) {
  res.type('html').send(renderFeedbackForm(buildPage(req)));
}

function submitFeedback(req, res) {
  const page = buildPage(req);
  const answers = page.messages.questions.map((_, index) => String(req.body?.[`q${index + 1}`] ?? '').trim());

  auditLog.logEvent('FEEDBACK_RECEIVED', { locale: page.locale, answers });
  res.type('html').send(renderThankYou(page));
}

module.exports = { showFeedbackForm, submitFeedback };
