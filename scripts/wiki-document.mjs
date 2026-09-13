import fs from 'node:fs';

const stylesheet = () => fs.readFileSync(new URL('../docs/wiki.css', import.meta.url), 'utf8');
const esc = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
const plain = (value) =>
  value
    .replace(/<[^>]*>/g, '')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&');
const a = (href, title) => `<a href="${esc(href)}">${esc(title)}</a>`;

// Build navigation from real headings. Existing body IDs and links are never renamed.
export function numberWikiSections(body) {
  if (!/<h2\b/i.test(body)) body = `<section><h2>본문</h2>${body}</section>`;
  const ids = new Set([...body.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
  const headings = [];
  let section = 0,
    subsection = 0;
  const content = body.replace(/<h([23])([^>]*)>([\s\S]*?)<\/h\1>/g, (_, level, attrs, title) => {
    if (level === '2') {
      section++;
      subsection = 0;
    } else {
      subsection++;
    }
    const number = level === '2' ? `${section}.` : `${section}.${subsection}.`;
    let id = attrs.match(/\bid="([^"]+)"/)?.[1];
    if (!id) {
      id = `doc-section-${headings.length + 1}`;
      while (ids.has(id)) id += '-heading';
      ids.add(id);
      attrs += ` id="${id}"`;
    }
    headings.push({ id, title: plain(title), number, level });
    return `<h${level}${attrs}><a class="wiki-section-number" href="#${esc(id)}">${number}</a> ${title}</h${level}>`;
  });
  return { content, headings };
}

export function renderWikiDocument({
  title,
  subtitle = '',
  category = '프로젝트 문서',
  body,
  repoHref = '../../',
  cssHref = null,
  nav = null,
  sourceHref = null,
  meta = '',
  footer = '',
  extraHead = '',
}) {
  const { content, headings } = numberWikiSections(body);
  const productHref = `${repoHref}PRODUCT_GOAL.html`;
  const navigation = nav ?? [
    [productHref, 'Product Goal'],
    [`${repoHref}docs/art-handoff/index.html`, '그래픽 제작 문서'],
    [`${repoHref}ARCHITECTURE.md`, 'Architecture'],
    [`${repoHref}INBOX.md`, 'Feedback Inbox'],
  ];
  const links = navigation.map(([href, label]) => a(href, label)).join('');
  const tocLinks = headings
    .map((h) => `<li class="toc-level-${h.level}">${a('#' + h.id, `${h.number} ${h.title}`)}</li>`)
    .join('');
  const style = cssHref
    ? `<link rel="stylesheet" href="${esc(cssHref)}">`
    : `<style data-wiki-style>${stylesheet()}</style>`;
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)} · Polygon RPG 문서</title>${extraHead}${style}</head>
<body id="top" class="wiki-document"><header class="wiki-global-header masthead"><div class="wiki-global-inner">
<a class="wiki-brand" href="${esc(productHref)}"><span class="wiki-brand-mark" aria-hidden="true">▲</span><span>POLYGON RPG</span></a>
<nav class="wiki-global-nav" aria-label="위키 전역 메뉴">${links}</nav><a class="wiki-search-link" href="#wiki-toc">⌕ 문서 목차</a></div></header>
<div class="wiki-shell"><aside class="wiki-left-sidebar" aria-label="주요 문서 탐색"><nav><strong>관련 문서</strong>${links}</nav></aside>
<div class="page"><nav class="wiki-breadcrumb" aria-label="문서 위치">${a(productHref, 'Polygon RPG')}<span>›</span><span>${esc(category)}</span></nav>
<main><header class="hero page-title"><div class="wiki-document-heading"><div><p class="kicker">${esc(category)}</p><h1>${esc(title)}</h1><p class="wiki-document-subtitle">${esc(subtitle)}</p></div><nav class="wiki-document-actions" aria-label="문서 도구">${a('#wiki-toc', '목차')}${sourceHref ? a(sourceHref, '원문') : ''}${a(`${repoHref}INBOX.md`, '피드백')}</nav></div>
${meta ? `<p class="wiki-document-meta">${esc(meta)}</p>` : ''}<div class="wiki-category-box"><strong>분류:</strong>${esc(category)}</div></header>
<nav class="wiki-toc" id="wiki-toc" aria-label="문서 목차"><details open><summary>목차</summary><ol>${tocLinks || '<li>본문</li>'}</ol></details></nav>
${content}</main>${footer ? `<footer>${footer}</footer>` : ''}</div>
<aside class="wiki-right-sidebar" aria-label="문서 내 탐색"><strong>이 문서의 내용</strong><nav>${headings.map((h) => a('#' + h.id, `${h.number} ${h.title}`)).join('') || a('#top', '본문')}</nav></aside></div></body></html>\n`;
}

// Old report body, controls, inline scripts and captured images are retained verbatim.
// Shared CSS is embedded so downloaded/file:// reports need no stylesheet server.
export function wrapWikiReport(html, options = {}) {
  if (html.includes('class="wiki-document"')) {
    return html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, (block) =>
      block.includes('data-wiki-style') || block.includes('Wiki document skin:')
        ? `<style data-wiki-style>${stylesheet()}</style>`
        : block,
    );
  }
  const title =
    options.title ??
    plain(
      html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ??
        html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ??
        '검증 보고서',
    );
  const extraHead = [...html.matchAll(/<style[^>]*>[\s\S]*?<\/style>/gi)].map((m) => m[0]).join('');
  let body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html;
  body = body
    .replace(/<!doctype[^>]*>/gi, '')
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<title[^>]*>[\s\S]*?<\/title>/gi, '')
    .replace(/<meta\b[^>]*>/gi, '')
    .replace(/<h1[^>]*>[\s\S]*?<\/h1>/i, '')
    .replace(/<\/?html[^>]*>/gi, '');
  return renderWikiDocument({ title, category: '검증 보고서', body, extraHead, ...options });
}
