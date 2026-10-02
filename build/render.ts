import { existsSync } from 'node:fs';
import { MONUMENTS, SITES } from '../src/content';
import type { Lang, SiteText, Stat } from '../src/content';

/** Absolute origin for canonical, hreflang, sitemap and social tags; set `SITE_URL` in Cloudflare Pages once a custom domain is live. */
export const SITE_URL = (process.env.SITE_URL ?? 'https://skopje-monuments.pages.dev').replace(/\/$/, '');
const AUTHOR = 'Viktor Dodev';

/** Social preview image: only advertised once `public/og.jpg` (1200×630) exists. */
const HAS_OG = existsSync(new URL('../public/og.jpg', import.meta.url));

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const otherLang = (l: Lang): Lang => (l === 'en' ? 'mk' : 'en');
const pathFor = (l: Lang) => (l === 'en' ? '/' : '/mk/');
const pad = (n: number) => String(n).padStart(2, '0');

/** The 8-ray sun of the flag of North Macedonia, as reusable SVG markup (viewBox -50 -50 100 100). */
export const sunSvgInner = (rayFill = 'currentColor') =>
  Array.from({ length: 8 }, (_, i) =>
    `<polygon points="-2.4,-19 2.4,-19 10.5,-49 -10.5,-49" transform="rotate(${i * 45})" fill="${rayFill}"/>`,
  ).join('') + `<circle r="13.5" fill="${rayFill}"/>`;

/**
 * Paints before any stylesheet or script: a dark page, the loader already in place, and sized icons.
 * Without it the raw HTML flashes white with full-width suns while CSS and JS are still arriving
 * (always in dev, where CSS is injected by JS; briefly in production and on language switches).
 * The inline script decides WebGL support synchronously so the loader, not the plain page, is the first frame;
 * if the app script never arrives, it falls back to the readable page after ten seconds.
 */
const CRITICAL = `<style>
      html{background:#0d0a16;color:#fbf3e8}
      body{margin:0}
      @view-transition{navigation:auto}
      ::view-transition-old(root),::view-transition-new(root){animation-duration:.6s}
      .loader{display:none}
      html.webgl .loader{position:fixed;inset:0;z-index:60;display:grid;place-content:center;justify-items:center;gap:14px;background:radial-gradient(60% 50% at 50% 60%,#2a1630 0%,#0d0a16 70%)}
      html.webgl .loader__sun{width:64px;height:64px;color:#ffd27a}
      html.webgl .loader__label,html.webgl .loader__pct{margin:0;font:500 11px/1.6 system-ui,sans-serif;letter-spacing:.34em;text-transform:uppercase;color:rgba(251,243,232,.6)}
      html.webgl:not(.ready) body>:not(.loader):not(#scene){visibility:hidden}
      html.webgl:not(.ready),html.webgl:not(.ready) body{overflow:hidden}
    </style>
    <script>(function(){var h=document.documentElement;try{var c=document.createElement('canvas');if(c.getContext('webgl2')||c.getContext('webgl'))h.classList.add('webgl')}catch(e){}
      setTimeout(function(){if(!window.__skopjeBoot){h.classList.remove('webgl');h.classList.add('no-webgl')}},10000)})()</script>`;

export function renderHead(lang: Lang): string {
  const t = SITES[lang];
  const alt = SITES[otherLang(lang)];
  const url = SITE_URL + pathFor(lang);
  const list = {
    '@type': 'ItemList',
    name: t.title,
    inLanguage: t.htmlLang,
    itemListElement: MONUMENTS.map((m, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'LandmarksOrHistoricalBuildings',
        '@id': `${url}#${m.id}`,
        name: t.monuments[m.id].name,
        alternateName: t.monuments[m.id].altName,
        description: t.monuments[m.id].tagline,
        url: `${url}#${m.id}`,
        containedInPlace: { '@type': 'City', name: 'Skopje', containedInPlace: { '@type': 'Country', name: 'North Macedonia' } },
      },
    })),
  };
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        name: t.title,
        description: t.description,
        url,
        inLanguage: t.htmlLang,
        author: { '@type': 'Person', name: AUTHOR },
        about: { '@type': 'City', name: 'Skopje', containedInPlace: { '@type': 'Country', name: 'North Macedonia' } },
      },
      list,
    ],
  };
  return `
    <meta name="color-scheme" content="dark" />
    ${CRITICAL}
    <title>${esc(t.title)}</title>
    <meta name="description" content="${esc(t.description)}" />
    <meta name="author" content="${AUTHOR}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <link rel="canonical" href="${url}" />
    <link rel="alternate" hreflang="en" href="${SITE_URL}/" />
    <link rel="alternate" hreflang="mk" href="${SITE_URL}/mk/" />
    <link rel="alternate" hreflang="x-default" href="${SITE_URL}/" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${esc(t.brand)}" />
    <meta property="og:title" content="${esc(t.title)}" />
    <meta property="og:description" content="${esc(t.description)}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:locale" content="${t.ogLocale}" />
    <meta property="og:locale:alternate" content="${alt.ogLocale}" />
    ${HAS_OG ? `<meta property="og:image" content="${SITE_URL}/og.jpg" />\n    <meta property="og:image:width" content="1200" />\n    <meta property="og:image:height" content="630" />\n    <meta property="og:image:alt" content="${esc(t.ogImageAlt)}" />` : ''}
    <meta name="twitter:card" content="${HAS_OG ? 'summary_large_image' : 'summary'}" />
    <meta name="twitter:title" content="${esc(t.title)}" />
    <meta name="twitter:description" content="${esc(t.description)}" />
    <script type="application/ld+json">${JSON.stringify(ld)}</script>`;
}

const stats = (list: Stat[], cls: string) =>
  `<dl class="${cls}">${list
    .map((s, i) => `<div class="stat" style="--i:${i}"><dt>${esc(s.label)}</dt><dd>${esc(s.value)}</dd></div>`)
    .join('')}</dl>`;

/** Headings are split into words so they can rise in one by one; the full text stays in the DOM for readers. */
const words = (line: string) =>
  line
    .split(' ')
    .map((w) => `<span class="w"><span>${esc(w)}</span></span>`)
    .join(' ');

function renderChapter(t: SiteText, i: number): string {
  const m = MONUMENTS[i];
  const c = t.monuments[m.id];
  return `
  <section class="chapter chapter--${m.text}" id="${m.id}" data-station="${i + 1}" aria-labelledby="${m.id}-title">
    <div class="chapter__copy">
      <p class="label"><span class="label__num">${pad(i + 1)}</span><span class="label__dash" aria-hidden="true"></span><span>${esc(c.place)}</span></p>
      <h2 class="split" id="${m.id}-title">${words(c.name)}</h2>
      <p class="tagline">${esc(c.tagline)}</p>
      <div class="prose">${c.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
      ${stats(c.stats, 'stats')}
    </div>
    <p class="vertical" aria-hidden="true">${esc(c.name)}</p>
  </section>`;
}

export function renderBody(lang: Lang): string {
  const t = SITES[lang];
  const other = SITES[otherLang(lang)];
  const n = MONUMENTS.length;
  const sun = (cls: string) =>
    `<svg class="${cls}" viewBox="-50 -50 100 100" width="${cls === 'loader__sun' ? 64 : 30}" height="${cls === 'loader__sun' ? 64 : 30}" aria-hidden="true" focusable="false">${sunSvgInner('currentColor')}</svg>`;

  const menuItems = MONUMENTS.map((m, i) => {
    const c = t.monuments[m.id];
    return `<li style="--i:${i}"><a href="#${m.id}" data-index="${i + 1}"><span class="menu__num">${pad(i + 1)}</span><span class="menu__name">${esc(c.name)}</span><span class="menu__place">${esc(c.place)}</span></a></li>`;
  }).join('');

  const rail = MONUMENTS.map((m, i) => {
    const c = t.monuments[m.id];
    return `<li><a href="#${m.id}" data-index="${i + 1}" aria-label="${pad(i + 1)} · ${esc(c.name)}"><span class="rail__num">${pad(i + 1)}</span><span class="rail__tick" aria-hidden="true"></span></a></li>`;
  }).join('');

  return `
  <a class="skip" href="#story">${esc(t.skipLink)}</a>
  <canvas id="scene" aria-hidden="true"></canvas>
  <div class="scrim" aria-hidden="true"></div>
  <div class="grain" aria-hidden="true"></div>
  <div class="cursor" aria-hidden="true"><i class="cursor__ring"></i><i class="cursor__dot"></i></div>

  <div class="loader" id="loader" aria-hidden="true">
    ${sun('loader__sun')}
    <p class="loader__label">${esc(t.loading)}</p>
    <p class="loader__pct"><span>0</span>%</p>
  </div>

  <header class="nav">
    <a class="brand" href="#top" aria-label="${esc(t.brand)}">
      ${sun('brand__sun')}
      <span class="brand__text"><span class="brand__name">${esc(t.brand)}</span><span class="brand__sub">${esc(t.brandSub)}</span></span>
    </a>
    <div class="nav__right">
      <a class="lang" href="${pathFor(otherLang(lang))}" hreflang="${other.htmlLang}" lang="${other.htmlLang}" aria-label="${esc(t.switchLabel)}">${esc(t.switchName)}</a>
      <button class="burger" type="button" aria-expanded="false" aria-controls="menu" data-open="${esc(t.menu.open)}" data-close="${esc(t.menu.close)}" aria-label="${esc(t.menu.open)}"><i></i><i></i></button>
    </div>
  </header>

  <nav class="menu" id="menu" aria-label="${esc(t.menu.title)}" data-lenis-prevent>
    <p class="menu__title">${esc(t.menu.title)}</p>
    <ol>${menuItems}</ol>
  </nav>

  <nav class="rail" aria-label="${esc(t.railLabel)}"><ol>${rail}</ol><div class="rail__bar" aria-hidden="true"><i></i></div></nav>

  <main id="story">
    <section class="hero" id="top" data-station="0">
      <div class="hero__copy">
        <p class="label"><i class="label__dot" aria-hidden="true"></i><span>${esc(t.hero.chapter)}</span></p>
        <h1 class="split hero__title"><span class="sr-only">${esc(t.brand)}: </span>${t.hero.lines.map((l) => `<span class="line">${words(l)}</span>`).join(' ')}</h1>
        <p class="hero__lead">${esc(t.hero.lead)}</p>
        <a class="cta" href="#${MONUMENTS[0].id}"><span>${esc(t.hero.cta)}</span><i aria-hidden="true">↘</i></a>
        <p class="hero__note">${esc(t.hero.note)}</p>
      </div>
      <p class="vertical vertical--hero" aria-hidden="true">${esc(t.hero.vertical)}</p>
      ${stats(t.hero.stats, 'stats stats--hero')}
    </section>
    ${MONUMENTS.map((_, i) => renderChapter(t, i)).join('')}
    <section class="outro" id="end" data-station="${n + 1}">
      <div class="outro__copy">
        <p class="label"><i class="label__dot" aria-hidden="true"></i><span>${esc(t.outro.chapter)}</span></p>
        <h2 class="split">${t.outro.lines.map((l) => `<span class="line">${words(l)}</span>`).join(' ')}</h2>
        <p>${esc(t.outro.body)}</p>
        <p class="outro__note">${esc(t.outro.note)}</p>
        <a class="cta" href="#top"><span>${esc(t.outro.top)}</span><i aria-hidden="true">↑</i></a>
      </div>
      <footer class="footer">
        <p>${esc(t.footer)}</p>
        <a href="${pathFor(otherLang(lang))}" hreflang="${other.htmlLang}" lang="${other.htmlLang}">${lang === 'en' ? 'Македонски' : 'English'}</a>
      </footer>
    </section>
  </main>

  <p class="nowebgl" role="status">${esc(t.noWebgl)}</p>`;
}

export function langFromPath(path: string | undefined): Lang {
  return path && path.startsWith('/mk') ? 'mk' : 'en';
}
