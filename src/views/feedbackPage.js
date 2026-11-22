// Builds the feedback page HTML. Every visible string comes from the locale
// file and is HTML-escaped before it is inserted.

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);

const STYLES = `
  body { font-family: system-ui, sans-serif; max-width: 760px; margin: 2rem auto; padding: 0 1rem;
         color: #1b2a3a; background: #f6f8fb; line-height: 1.5; }
  header { display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: .5rem; }
  nav a { margin-left: .5rem; }
  nav a[aria-current="true"] { font-weight: bold; text-decoration: none; color: inherit; }
  .date { color: #55657a; }
  ol { padding-left: 1.2rem; }
  li { margin-bottom: 1.25rem; }
  label { display: block; font-weight: 600; margin-bottom: .4rem; }
  textarea { width: 100%; min-height: 6rem; padding: .5rem; font: inherit; box-sizing: border-box;
             border: 1px solid #b8c4d3; border-radius: 6px; }
  button { padding: .6rem 1.4rem; font: inherit; color: #fff; background: #2f6fb2; border: 0;
           border-radius: 6px; cursor: pointer; }
  .notice { padding: 1rem; background: #e3f4e8; border-radius: 6px; }`;

function languageSwitcher(messages, locale, languages) {
  const links = languages
    .map(({ code, name }) => `<a href="/feedback?lang=${code}" hreflang="${code}"${
      code === locale ? ' aria-current="true"' : ''}>${escapeHtml(name)}</a>`)
    .join(' ');
  return `<nav aria-label="${escapeHtml(messages.languageLabel)}">${escapeHtml(messages.languageLabel)} ${links}</nav>`;
}

function layout({ locale, messages, today, languages }, body) {
  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(messages.title)} | MediBook</title>
  <style>${STYLES}</style>
</head>
<body>
  <header>
    <h1>${escapeHtml(messages.title)}</h1>
    ${languageSwitcher(messages, locale, languages)}
  </header>
  <p class="date">${escapeHtml(messages.dateLabel)} <time>${escapeHtml(today)}</time></p>
  ${body}
</body>
</html>`;
}

function renderFeedbackForm(page) {
  const { locale, messages } = page;
  const questions = messages.questions
    .map((question, index) => `
      <li>
        <label for="q${index + 1}">${escapeHtml(question)}</label>
        <textarea id="q${index + 1}" name="q${index + 1}" required></textarea>
      </li>`)
    .join('');

  return layout(page, `
  <p>${escapeHtml(messages.instructions)}</p>
  <form method="post" action="/feedback?lang=${locale}">
    <ol>${questions}
    </ol>
    <button type="submit">${escapeHtml(messages.submit)}</button>
  </form>`);
}

function renderThankYou(page) {
  const { locale, messages } = page;
  return layout(page, `
  <p class="notice">${escapeHtml(messages.thankYou)}</p>
  <p><a href="/feedback?lang=${locale}">${escapeHtml(messages.backLink)}</a></p>`);
}

module.exports = { renderFeedbackForm, renderThankYou, escapeHtml };
