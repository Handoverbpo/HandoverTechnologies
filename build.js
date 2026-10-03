#!/usr/bin/env node
/*
 * Handover Technologies — static site builder (zero dependencies).
 *
 *   node build.js           build once into ./dist
 *   node build.js --watch   rebuild whenever something in ./src changes
 *
 * How it works
 *   src/site.json        company details used everywhere ({{site.email}} etc.)
 *   src/partials/*.html  shared chunks, included with {{> name}}
 *   src/pages/**.html    one file per page. Optional front matter at the top:
 *                          ---
 *                          title: Page title shown in Google
 *                          description: Meta description (~150 characters)
 *                          nav: services            (highlights menu items)
 *                          crumb: Short name for breadcrumbs
 *                          ---
 *   src/assets/**        copied to /assets
 *   src/static/**        copied to the site root (favicon, manifest …)
 *
 * URLs are clean: pages/about.html → /about/, pages/services/chatbots.html → /services/chatbots/
 * sitemap.xml and robots.txt are generated automatically.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'dist');

const walk = (dir) =>
  fs.existsSync(dir)
    ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
        d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)])
    : [];

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function parse(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  const meta = {};
  if (m) {
    for (const line of m[1].split(/\r?\n/)) {
      const i = line.indexOf(':');
      if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  }
  return { meta, body: m ? raw.slice(m[0].length) : raw };
}

function urlFor(rel) {
  const p = rel.replace(/\.html$/, '').split(path.sep).join('/');
  if (p === 'index') return '/';
  if (p === '404') return '/404.html';
  if (p.endsWith('/index')) return '/' + p.slice(0, -'index'.length);
  return '/' + p + '/';
}

const outFor = (url) =>
  url.endsWith('.html') ? path.join(OUT, url) : path.join(OUT, url, 'index.html');

const lookup = (obj, key) => key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

function render(tpl, ctx, partials, file, depth = 0) {
  if (depth > 10) throw new Error('Partials nested too deeply');
  tpl = tpl.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, name) => {
    if (!(name in partials)) throw new Error(`${file}: unknown partial {{> ${name}}}`);
    return render(partials[name], ctx, partials, file, depth + 1);
  });
  return tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
    const v = lookup(ctx, key);
    if (v === undefined) throw new Error(`${file}: unknown placeholder {{${key}}}`);
    return v;
  });
}

function build() {
  const t0 = Date.now();
  const site = JSON.parse(fs.readFileSync(path.join(SRC, 'site.json'), 'utf8'));
  const base = site.url.replace(/\/$/, '');
  site.year = String(new Date().getFullYear());
  const socials = Object.entries(site.social || {}).filter(([, v]) => v);
  site.socialLinks = socials
    .map(([k, v]) => `<li><a href="${esc(v)}" rel="noopener" target="_blank">${k[0].toUpperCase() + k.slice(1)}</a></li>`)
    .join('');

  const partials = {};
  for (const f of walk(path.join(SRC, 'partials'))) {
    partials[path.basename(f, '.html')] = fs.readFileSync(f, 'utf8');
  }

  // Cache-busting version from CSS + JS contents
  const hash = crypto.createHash('md5');
  for (const f of walk(path.join(SRC, 'assets'))) hash.update(fs.readFileSync(f));
  const version = hash.digest('hex').slice(0, 8);

  const pagesDir = path.join(SRC, 'pages');
  const pages = walk(pagesDir)
    .filter((f) => f.endsWith('.html'))
    .map((f) => {
      const rel = path.relative(pagesDir, f);
      const { meta, body } = parse(f);
      return { file: f, rel, url: urlFor(rel), meta, body };
    });
  const byUrl = Object.fromEntries(pages.map((p) => [p.url, p]));

  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  const orgId = `${base}/#organization`;
  // Organization + WebSite: tells Google the business and site name is "Handover Technologies"
  const organization = {
    '@type': 'Organization',
    '@id': orgId,
    name: site.name,
    alternateName: site.shortName,
    url: base + '/',
    logo: { '@type': 'ImageObject', url: `${base}/assets/img/logos/handover-logo-square.png`, width: 512, height: 512 },
    image: `${base}/assets/img/og-image.png`,
    email: site.email,
    knowsAbout: site.keywords,
    description: site.description,
    areaServed: { '@type': 'Country', name: 'South Africa' },
    contactPoint: [{
      '@type': 'ContactPoint', contactType: 'sales', url: `${base}/contact/`,
      areaServed: 'ZA', availableLanguage: ['English'],
    }],
    ...(socials.length ? { sameAs: socials.map(([, v]) => v) } : {}),
  };

  const sitemap = [];

  for (const page of pages) {
    const m = page.meta;
    const isHome = page.url === '/';
    const title = m.title
      ? (isHome ? m.title : `${m.title} | ${site.name}`)
      : site.name;
    const canonical = base + page.url;
    const noindex = /noindex/.test(m.robots || '');
    const ogImage = base + (m.ogImage || '/assets/img/og-image.png');

    // Breadcrumbs from the URL path, using each parent page's crumb/title
    const crumbs = [];
    if (!isHome && page.url !== '/404.html') {
      const segs = page.url.split('/').filter(Boolean);
      let acc = '/';
      crumbs.push({ name: 'Home', url: '/' });
      for (const s of segs) {
        acc += s + '/';
        const p = byUrl[acc];
        if (p) crumbs.push({ name: p.meta.crumb || p.meta.title || s, url: acc });
      }
    }
    const breadcrumbHtml = crumbs.length > 1
      ? `<nav class="crumbs" aria-label="Breadcrumb"><ol>${crumbs.map((c, i) =>
          i === crumbs.length - 1
            ? `<li><span aria-current="page">${esc(c.name)}</span></li>`
            : `<li><a href="${c.url}">${esc(c.name)}</a></li>`).join('')}</ol></nav>`
      : '';

    const graph = [
      organization,
      { '@type': 'WebSite', '@id': `${base}/#website`, url: base + '/', name: site.name, alternateName: [site.shortName, site.url.replace(/^https?:\/\/(www\.)?/, '')], publisher: { '@id': orgId }, inLanguage: 'en-ZA' },
      {
        '@type': m.schemaType || 'WebPage', '@id': canonical + '#webpage', url: canonical,
        name: title, description: m.description || site.description,
        isPartOf: { '@id': `${base}/#website` }, about: { '@id': orgId }, inLanguage: 'en-ZA',
        primaryImageOfPage: { '@type': 'ImageObject', url: ogImage },
        ...(m.updated ? { dateModified: m.updated } : {}),
      },
    ];
    if (crumbs.length > 1) {
      graph.push({
        '@type': 'BreadcrumbList',
        itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: base + c.url })),
      });
    }

    const verify = [
      site.googleSiteVerification && `<meta name="google-site-verification" content="${esc(site.googleSiteVerification)}">`,
      site.bingSiteVerification && `<meta name="msvalidate.01" content="${esc(site.bingSiteVerification)}">`,
    ].filter(Boolean).join('\n  ');
    const ctx = {
      site,
      version,
      verify,
      page: {
        title: esc(title),
        description: esc(m.description || site.description),
        canonical,
        robots: noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large',
        ogType: 'website',
        ogImage,
        ogImageAlt: esc(m.ogImageAlt || `${site.name}: ${site.tagline}`),
        bodyClass: m.bodyClass || '',
        breadcrumbs: breadcrumbHtml,
        jsonld: JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c'),
      },
    };

    const body = render(page.body, ctx, partials, page.rel);
    let html = render(partials.layout, { ...ctx, content: body }, partials, page.rel);

    // Highlight active menu items: nav: services chatbots
    for (const key of (m.nav || '').split(/\s+/).filter(Boolean)) {
      html = html.replace(new RegExp(`data-nav="${key}"`, 'g'), `data-nav="${key}" aria-current="page"`);
    }

    const out = outFor(page.url);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, html);

    if (!noindex) {
      // lastmod comes from front matter (updated: YYYY-MM-DD) or site.json "updated", never from
      // file timestamps, which reset on every Vercel deploy and would make Google ignore lastmod.
      const lastmod = m.updated || site.updated;
      const depth = page.url.split('/').filter(Boolean).length;
      const images = [...new Set([...body.matchAll(/<img[^>]+src="(\/assets\/img\/(?!logos\/)[^"]+)"/g)]
        .map((x) => x[1].replace(/-960(\.\w+)$/, '$1')))].map((src) => [src]);
      sitemap.push({ loc: canonical, lastmod, images, priority: isHome ? '1.0' : m.priority || (depth === 1 ? '0.8' : '0.6') });
    }
  }

  fs.cpSync(path.join(SRC, 'assets'), path.join(OUT, 'assets'), { recursive: true });
  if (fs.existsSync(path.join(SRC, 'static'))) fs.cpSync(path.join(SRC, 'static'), OUT, { recursive: true });

  const xmlEsc = (v) => esc(v).replace(/'/g, '&apos;');
  sitemap.sort((x, y) => y.priority - x.priority || x.loc.localeCompare(y.loc));
  fs.writeFileSync(path.join(OUT, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n` +
    sitemap.map((s) => `  <url>\n    <loc>${s.loc}</loc>\n` +
      (s.lastmod ? `    <lastmod>${s.lastmod}</lastmod>\n` : '') +
      `    <priority>${s.priority}</priority>\n` +
      s.images.map(([src]) => `    <image:image><image:loc>${xmlEsc(base + src)}</image:loc></image:image>\n`).join('') +
      `  </url>`).join('\n') +
    `\n</urlset>\n`);
  fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap.xml\n`);

  console.log(`✓ Built ${pages.length} pages into dist/ in ${Date.now() - t0}ms`);
}

try { build(); } catch (e) { console.error('✗ ' + e.message); if (!process.argv.includes('--watch')) process.exit(1); }

if (process.argv.includes('--watch')) {
  let timer;
  fs.watch(SRC, { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(() => { try { build(); } catch (e) { console.error('✗ ' + e.message); } }, 80);
  });
  console.log('Watching src/ for changes…');
}
