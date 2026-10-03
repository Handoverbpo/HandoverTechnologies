# Handover Technologies: Website

A fast, SEO-ready static website. There are no frameworks or dependencies to install; you only need [Node.js](https://nodejs.org) 18 or newer.

## Quick start

```bash
npm run dev      # build + preview at http://localhost:4180
npm run watch    # rebuild automatically while you edit (run alongside `npm run serve`)
npm run build    # produce the final site in ./dist
```

## Deploying (GitHub → Vercel)

The live site (www.handoverbpo.com) is hosted on Vercel and deploys from GitHub.

1. Replace **everything** in the GitHub repository with the contents of this folder (`build.js`, `vercel.json`, `package.json`, `src/`, `tools/`, `README.md`, `.gitignore`). Do **not** commit `dist/`; Vercel builds it.
2. Push. Vercel reads `vercel.json`, runs `node build.js` and serves `dist/`. No Vercel settings need changing.
3. In Vercel → Project → Settings → Domains, make **www.handoverbpo.com** the primary domain. `vercel.json` already redirects `handoverbpo.com` → `www.handoverbpo.com`; don't also add a www → apex redirect, or the two would loop.

`vercel.json` also permanently redirects the old URLs Google has indexed (`/depottrack`, `/hitchpoint`, `/privacy`, `/terms`, `/popia`, `/cookies` and their `.html` versions) to the new pages, so existing rankings carry over.

## Getting found on Google (one-time, after the first deploy)

1. **Google Search Console** is already verified with the file `src/static/google30b620fcdbda21e5.html`. **Never delete that file**, or you lose access. (Alternatively add a code to `googleSiteVerification` in `src/site.json`.)
2. In Search Console → **Sitemaps**, submit `https://www.handoverbpo.com/sitemap.xml`.
3. Use **URL Inspection → Request indexing** for the home page, `/products/depottrack/` and `/products/hitchpoint/`.
4. Optional: **Bing Webmaster Tools** (import from Search Console, or put its code in `bingSiteVerification`).
5. Create a **Google Business Profile** for Handover Technologies (service-area business, South Africa) and link it to the website.
6. Test a product page with Google's **Rich Results Test** (search.google.com/test/rich-results).

When you edit a page, update its `updated:` date in the front matter (or `updated` in `site.json` for site-wide changes). That date becomes `lastmod` in the sitemap.

## Where things live

| To change…                                   | Edit                                         |
|----------------------------------------------|----------------------------------------------|
| Company name, legal email, Formspree form endpoints | `src/site.json` (used on every page) |
| Main menu / mega menu                         | `src/partials/header.html`                   |
| Footer links                                  | `src/partials/footer.html`                   |
| "Ready to hand it over?" call-to-action band  | `src/partials/cta.html`                      |
| A page's text                                 | `src/pages/…` (one file per page)            |
| Colours, fonts, spacing                       | Tokens at the top of `src/assets/css/style.css` |
| Icons                                         | `src/partials/icons.html` (use with `<svg><use href="#i-chat"/></svg>`) |

### Adding a page

Create `src/pages/your-page.html` and it becomes `/your-page/`. Start it with front matter:

```html
---
title: Page title (under ~40 characters; the company name is added automatically)
description: The snippet Google shows. Aim for 120–155 characters.
nav: about            # optional: highlights this item in the menu
crumb: Short name     # optional: used in breadcrumbs
---
<section class="page-hero">…</section>
```

The build automatically adds the canonical URL, Open Graph/Twitter tags, structured data (Organization, WebSite, WebPage, BreadcrumbList), and updates `sitemap.xml` and `robots.txt`.

Placeholders: `{{site.email}}`, `{{site.phone}}`, `{{site.waLink}}` and so on. Partials: `{{> cta}}`. A typo in a placeholder stops the build with a clear error rather than publishing a broken page.

## SEO features

- Unique title and meta description per page; canonical URLs; clean URLs
- JSON-LD: ProfessionalService organisation, breadcrumbs, `Service` + `FAQPage` on each service page, FAQ on pricing
- Auto-generated `sitemap.xml` (with product screenshots as image entries) and `robots.txt`; `llms.txt` for AI search engines
- Google site-name signals (`WebSite` + `Organization` schema) so results show **Handover Technologies**
- Product pages: `SoftwareApplication` schema with prices, features and screenshots, their own share images, and the product name in the `<h1>`
- Per-page share image via `ogImage:` front matter; optional Search Console / Bing verification codes in `site.json`
- `vercel.json`: 301 redirects from old URLs, www canonicalisation, security and caching headers
- Semantic HTML (one `<h1>` per page), `lang="en-ZA"`, accessible navigation, skip link and reduced-motion support
- No render-blocking JS, no images to slow the page (UI mock-ups are pure HTML/CSS), cache-busted assets
- All content is in the HTML, so it can be crawled without JavaScript

## ⚠️ Before going live: replace the placeholders

All of these are in `src/site.json` unless noted:

- [ ] `url`: your real domain (currently `https://www.handoverbpo.com`, taken from the product pages; confirm `hello@` and `privacy@` mailboxes exist)
- [x] Contact: everything goes through the website forms (no phone, WhatsApp or address shown). `email` in `site.json` is only used inside the legal documents.
- [ ] Once the company is registered, add registration/VAT details back where required (footer, `/legal/`, PAIA Manual).
- [ ] `social`: add LinkedIn/Facebook/Instagram URLs (links appear in the footer automatically)
- [x] Forms: Formspree endpoints live in `site.json` → `forms` (default, depottrack, hitchpoint). A page picks one with `form: depottrack` in its front matter; enquiries about a product are routed to that product's form automatically.
- [x] **Pricing** (`src/pages/pricing.html`): official Handover price list (setup + monthly retainer, incl. VAT). Product pricing lives on the DepotTrack and HitchPoint pages.
- [ ] **Products** (`src/pages/products.html`): names and statuses (Inbox, Flow, Lens, Hub) are placeholders for the products being built.
- [x] **Legal pages**: Privacy Policy, Terms & Conditions, POPIA Compliance and Cookie Policy are the official Handover documents (`src/pages/legal/`). The PAIA Manual and the ECT Act company-information table on `/legal/` still use placeholders from `site.json`.
- [ ] Re-render the social share image if the tagline changes (instructions in `tools/og-image.html`).
- [ ] After launch, submit `https://your-domain/sitemap.xml` in Google Search Console and set up a Google Business Profile.
