import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import { SITES } from './src/content';
import { SITE_URL, langFromPath, renderBody, renderHead } from './build/render';

/** Pre-renders the real content (both languages) into static HTML so it is crawlable and works without JS/WebGL. */
function prerender(): Plugin {
  return {
    name: 'skopje-prerender',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const lang = langFromPath(ctx.path);
        return html
          .replace('%LANG%', SITES[lang].htmlLang)
          .replace('<!--@head-->', renderHead(lang))
          .replace('<!--@body-->', renderBody(lang));
      },
    },
  };
}

/**
 * Crawl files written next to the pages: robots.txt, a sitemap that pairs the two languages with hreflang,
 * and a real 404 page (without one, Cloudflare Pages answers unknown paths with the home page, a soft 404).
 */
function crawlFiles(): Plugin {
  const today = new Date().toISOString().slice(0, 10);
  const alternates = ['en', 'mk']
    .map((l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${SITE_URL}${l === 'en' ? '/' : '/mk/'}"/>`)
    .concat(`<xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}/"/>`)
    .join('');
  const entry = (path: string) =>
    `  <url><loc>${SITE_URL}${path}</loc><lastmod>${today}</lastmod>${alternates}</url>`;
  return {
    name: 'skopje-crawl-files',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n` });
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entry('/')}
${entry('/mk/')}
</urlset>
`,
      });
      this.emitFile({
        type: 'asset',
        fileName: '404.html',
        source: `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<meta name="theme-color" content="#0d0a16" />
<title>Not found — Skopje</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<style>
  html{background:#0d0a16;color:#fbf3e8;font:16px/1.6 system-ui,sans-serif}
  body{margin:0;min-height:100svh;display:grid;place-content:center;text-align:center;padding:0 16px}
  h1{font-weight:300;font-size:clamp(28px,6vw,56px);margin:0 0 12px;letter-spacing:.02em}
  p{margin:0 0 28px;color:rgba(251,243,232,.65)}
  a{color:#ffd27a;text-decoration:none;letter-spacing:.2em;text-transform:uppercase;font-size:12px;font-weight:600}
</style>
</head>
<body>
<h1>Lost in the bazaar.</h1>
<p>This page does not exist. / Оваа страница не постои.</p>
<p><a href="/">Back to Skopje</a> &nbsp;·&nbsp; <a href="/mk/" lang="mk">Назад кон Скопје</a></p>
</body>
</html>
`,
      });
    },
  };
}

export default defineConfig({
  plugins: [prerender(), crawlFiles()],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      input: {
        en: fileURLToPath(new URL('./index.html', import.meta.url)),
        mk: fileURLToPath(new URL('./mk/index.html', import.meta.url)),
      },
    },
  },
});
