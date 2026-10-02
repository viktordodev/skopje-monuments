# Skopje — Nine Monuments of the Centre

A scroll-driven, surreal three.js journey through nine landmarks of central Skopje, North Macedonia:
Warrior on a Horse, Porta Macedonia, the Stone Bridge, the Clock Tower, Kuršumli An, Kale Fortress,
the Mother Teresa Memorial House, the Old Railway Station (5:17) and the Millennium Cross.

The scene is a stage, not a map (style after mengto.github.io/kage): the monuments line one dream-riverbank,
enlarged and backlit by an endless sunset whose rays fan across the whole sky. The palette drifts from rose-gold
dawn to flag red to violet night as you scroll. Everything is procedural — geometry, sculpted bronze figures
(signed-distance fields meshed with surface nets), textures and sky — so no models or photographs ship.

English (`/`) and Macedonian (`/mk/`), pre-rendered to static HTML so the content is crawlable and readable
without JavaScript or WebGL.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173  (Macedonian at /mk/)
npm run build      # typecheck + production build into dist/
```

Append `?quality=high` or `?quality=low` to force a quality tier while testing.
In development, `__skopje.go(u)` pins the camera to a station (0 = hero, 1–9 chapters, 10 epilogue) and
`__skopje.capture(u, 1600, 900)` renders one frame at that size as an overlay (click to close).

## Deploy to Cloudflare Pages

Connect the repo in the Cloudflare dashboard (Workers & Pages → Create → Pages → Connect to Git):

| Setting | Value |
|---|---|
| Build command | `npm run build` |
| Build output directory | `dist` |
| Environment variable | `SITE_URL` = the live origin. Defaults to `https://skopje-monuments.pages.dev`; set it when a custom domain goes live (feeds canonical, hreflang, sitemap and social tags) |
| Node version | read from `.nvmrc` (22) |

`public/_headers` sets long-lived caching for hashed assets and basic security headers.

### SEO

Both languages are pre-rendered static HTML, so crawlers get the full story without running WebGL.
Each page carries its own title, description, canonical URL, `hreflang` pair (en / mk / x-default),
Open Graph and Twitter tags with `og.jpg`, and JSON-LD (`WebSite` plus an `ItemList` of the nine
landmarks). The build also writes `robots.txt`, `sitemap.xml` (with language alternates) and a
`404.html`, so unknown paths return a real 404 instead of the home page.

After the first deploy, add the site to Google Search Console and submit `/sitemap.xml`.

## Structure

```
src/content/          all copy (en.ts, mk.ts) + monument order (monuments.ts)
build/render.ts       pre-renders the HTML for each language (used by the Vite plugin)
src/core/             App bootstrap, scroll → station mapping, camera rig, post-processing (god rays, bloom, grade)
src/stage/            sky + sun rays, land, river mirror, flora, atmosphere, wordmark, palette, layout
src/stage/monuments/  one module per monument; figures.ts holds the sculpted horse, rider, lions, soldiers
src/ui/               loader, reveals, cursor, menu, rail
```

## Content

Facts were checked against public encyclopaedic sources at the time of writing. Where sources disagree
(for example the size of Kuršumli An) the copy says so or stays general. Re-verify before publishing anything you plan to cite.
