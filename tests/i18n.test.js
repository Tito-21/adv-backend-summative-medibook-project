const { resolveLocale, getMessages, formatLocalizedDate, SUPPORTED_LOCALES } = require('../src/utils/i18n');
const { renderFeedbackForm, escapeHtml } = require('../src/views/feedbackPage');

describe('resolveLocale', () => {
  test.each([
    ['fr', 'fr'],
    ['en', 'en'],
    ['FR', 'fr'],
    [' fr ', 'fr'],
    ['de', 'en'],
    ['', 'en'],
    [undefined, 'en'],
    [['fr', 'en'], 'en'], // ?lang=fr&lang=en arrives as an array
  ])('lang=%p -> %p', (input, expected) => {
    expect(resolveLocale(input)).toBe(expected);
  });
});

describe('locale files', () => {
  test.each(SUPPORTED_LOCALES)('%s has a title, instructions and exactly 5 questions', (locale) => {
    const messages = getMessages(locale);
    expect(messages.title).toEqual(expect.any(String));
    expect(messages.instructions).toEqual(expect.any(String));
    expect(messages.questions).toHaveLength(5);
  });
});

describe('formatLocalizedDate', () => {
  // 23:30 UTC on 22 Nov is already 23 Nov in the clinic (UTC+02:00).
  const instant = new Date('2026-11-22T23:30:00Z');

  test('formats in English', () => {
    expect(formatLocalizedDate(instant, 'en', '+02:00')).toBe('Monday, 23 November 2026');
  });

  test('formats in French', () => {
    expect(formatLocalizedDate(instant, 'fr', '+02:00')).toBe('lundi 23 novembre 2026');
  });
});

describe('feedback page', () => {
  test('renders 5 textareas with the French questions and lang="fr"', () => {
    const messages = getMessages('fr');
    const html = renderFeedbackForm({ locale: 'fr', messages, today: 'lundi', languages: [] });
    expect(html).toContain('<html lang="fr">');
    expect(html.match(/<textarea/g)).toHaveLength(5);
    expect(html).toContain(escapeHtml(messages.questions[0]));
  });

  test('escapes HTML in translated text', () => {
    expect(escapeHtml('<b>"Q&A"</b>')).toBe('&lt;b&gt;&quot;Q&amp;A&quot;&lt;/b&gt;');
  });
});
