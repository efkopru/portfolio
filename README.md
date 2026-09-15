# Esad Kopru portfolio

Static portfolio using the original ekopru.com navigation, three-category project index, and separate gallery pages. Updated factual content and newer projects remain available without the replacement role-filter/card interface. No framework or account system is required. The contact form uses FormSubmit for email delivery. External GIS applications load only after an explicit click.

## Work locally

Requires Node.js 22 or newer. There are no dependencies to install.

```powershell
npm run validate
npm run dev
```

Open `http://127.0.0.1:4173/`. The development server binds only to this computer. Rebuild and reload after editing; it is intentionally not an HMR server.

## Alternate design for review

The `codex/portfolio-preview` branch adds a separate site at `preview/index.html`. It does not replace the current root homepage, project pages, Contact form, navigation, themes, or image controls. Nothing is deployed by creating this branch or building locally.

```powershell
npm run build:preview
npm run check:preview
npm run dev
```

Open `http://127.0.0.1:4173/preview/index.html`, or open `preview/index.html` directly from the project folder. The preview has its own relative links, pages, and copied assets. Its banner links back to the current homepage. All preview HTML is marked `noindex`; its sitemap is empty. This is an indexing preference, not access protection.

The alternate design adds:

- Three flagship projects, while retaining the original project collections.
- Visible problem, contribution, result, tools, and project status before images.
- Three opening gallery images, with the remaining images in an expandable section.
- Clearly labeled explanatory ETL/accessibility diagrams and a newly authored, synthetic-only Python companion. These are not recovered employer artifacts or measured field results.
- Four checked-in 1200×630 PNG sharing covers. Regeneration is optional through `scripts/create-social-previews.ps1` on Windows; normal builds need only Node.

Edit the alternative templates in `scripts/preview-pages.mjs`, its isolated styles in `preview.css`, and evidence descriptors in `content/preview-evidence.mjs`. Source facts remain in `content/portfolio.mjs`. Generated `preview/`, `dist-preview/`, and `dist-candidate/` are ignored by Git and excluded from the current site's `dist/`.

`npm run validate` builds and checks the unchanged site, the preview, and a non-deployed candidate using a reserved example origin, then runs the Node regression suite. The synthetic example has its own standard-library tests:

```powershell
py -3 examples/lead-pipe-synthetic/demo.py
py -3 -m unittest discover -s examples/lead-pipe-synthetic -p test_demo.py -v
```

`npm run check:external` is an explicit, read-only network check of public project URLs. It never submits forms. It reports authentication, anti-bot, timeout, and uncertain responses as needing manual review, and exits nonzero for unresolved results. An HTTP response does not prove that an external map's layers or tools work.

The GitHub validation workflow does not deploy. It checks both designs, the Python companion, and desktop/mobile browser smoke tests when this branch is pushed. Hostinger's existing automatic deployment is **not** gated by that workflow merely because the workflow exists. Connecting deployment to successful checks remains part of a later approved promotion.

### After the alternative is approved

Do not copy only `preview/index.html` over the homepage: the revised project pages and assets belong together. A production candidate is generated separately, with an explicitly selected origin:

```powershell
$env:SITE_URL = 'https://www.ekopru.com'
npm run build:candidate
npm run check:candidate
```

This creates `dist-candidate/` only; it does not change the root site or publish anything. Unlike the review preview, the candidate removes the review banner, enables canonical URLs on indexable pages, and excludes the five intentionally unlisted projects from its sitemap while retaining their routes with `noindex`. Use the actual approved production origin for `SITE_URL`. The default `npm run build` still produces the original design in `dist/` until a separate promotion changes that choice.

## Where to edit

- `content/portfolio.mjs`: profile, employment, skills, and 20 project case studies.
- `content/site-structure.mjs`: original navigation order, separate page galleries, additional projects, and public application links.
- `content/screenshots.json`: local screenshot paths, dimensions, captions, and original source URLs.
- `scripts/build.mjs`: page templates, metadata, sitemap, publication output.
- `styles.css`: responsive design, focus states, and print layout.
- `script.js`: same-page contact submission, theme selection, dropdown/mobile navigation, the accessible image viewer, click-to-load applications, and legacy hash navigation.
- `theme.js`: restores an allowlisted saved theme before the page styles load.

The HTML at the project root and in page directories is generated. Edit the source above and rebuild. Internal evidence notes, local backups, agent settings, and one-time image recovery tools are excluded from Git and website publication. All assets needed for routine builds are included in this repository.

You can also open the root `index.html` directly from File Explorer. Navigation, styles, image galleries, and the viewer use relative local files without fetching a content manifest. Embedded public applications still need an internet connection. Automated `file://` browser QA is unavailable under the browser tool's security policy; the equivalent HTTP preview is tested.

## Themes

The compact Theme selector below the header offers Classic (the original palette), Midnight (dark navy and cyan), Evergreen (light green and forest), and Sandstone (warm cream and brown). The selector is 32px high on desktop and retains a 44px minimum touch target on narrow screens and touch-first devices. Themes preserve the same navigation, typography, galleries, and image-viewer controls. Only the selected theme name is saved locally under `ekopru-theme`; contact messages are never saved in browser storage. If storage is unavailable, switching still works for the current page. Persistence across directly opened `file://` pages depends on the browser; use the HTTP preview for consistent cross-page behavior. Without JavaScript the original Classic theme remains usable and the selector stays hidden. Printed pages remain white with dark text.

## Publish

This GitHub repository contains the editable source, tests, image assets, and generated pages. Pushing the repository does not configure website hosting or change the live domain.

Generated pages use content-versioned CSS and JavaScript URLs so deployments do not reuse outdated browser-cached theme styles or controls.

Upload only the contents of `dist/` to a static host that serves directory `index.html` files. Do not upload the workspace root, `content/`, `docs/`, `tests/`, or `work/`.

The build defaults canonical URLs and the sitemap to `https://www.ekopru.com`. To deploy under a different origin, set `SITE_URL` before building. When staging privately, use the host's access controls; `robots.txt` is not authentication.

```powershell
$env:SITE_URL = 'https://www.ekopru.com'
npm run build
npm run check
npm run preview
```

`_headers` supplies security headers for hosts that support this convention. Other hosts need equivalent settings in their own configuration. Configure the host to return `404.html` with HTTP 404 for missing paths. No SPA catch-all rewrite is needed. All 20 old page slugs remain available as their original distinct pages; old hash URLs are redirected by a fixed allowlist. A small hash-authorized 404 script resolves its links against the server root without breaking direct local-file paths.

The contact page submits the visitor's reply email, subject, and message directly to FormSubmit for delivery to the email configured in `content/portfolio.mjs`. With JavaScript, it uses the documented [FormSubmit AJAX endpoint](https://formsubmit.co/ajax-documentation) and keeps visitors on the Contact page. A live status announces progress and the result. Only an HTTP-success response with an explicit positive provider result clears the form; failures and the 20-second timeout retain its contents. Duplicate sends are blocked while a request is pending, and uncertain requests are never retried automatically. A confirmation means FormSubmit accepted the submission, not that inbox delivery was verified. Submissions are never saved in browser storage. The honeypot remains; no CAPTCHA-disabling option is set. Without JavaScript, the normal HTTPS POST still opens FormSubmit's confirmation/spam-check flow, as the page explains. The Contact page contains only the form and its submission feedback; the direct-email, public-work, and location sections are omitted.

After a successful submission, a themed **Message sent** dialog opens with a Close button and native Escape/focus handling. The form stays locked after the dialog closes: its inputs are read-only, Send is disabled, and the submission handler rejects repeat attempts. Refreshing the page starts a new attempt; no lock is saved in browser storage. Browsers without dialog support retain the same lock and show the inline confirmation instead. Failed requests remain retryable. This prevents accidental repeat sends in the current page, not automated abuse or submissions from another tab; provider-side protections still apply.

Before relying on delivery, submit one test message, open FormSubmit's activation email in the recipient inbox (check spam), and activate the form. Then submit a second test and verify its receipt and Reply-To address. Repeat activation if FormSubmit requests it after an address or site change. Inbox activation and actual delivery must be verified by the owner; a successful local build is not proof of email delivery.

The hidden `_url` uses the configured `SITE_URL` contact-page URL, following the [FormSubmit FAQ](https://formsubmit.co/help) for missing referrers and direct-file opening. It never sends a local filesystem path. Sending requires an internet connection. The localhost preview is the supported automated test route; direct `file://` browser QA remains unavailable. Configure both `connect-src https://formsubmit.co` and `form-action https://formsubmit.co` when applying CSP headers on the host. See [FormSubmit setup](https://formsubmit.co/) for activation and field documentation.

The resume is HTML, with no download or print button. A print stylesheet remains for visitors using their browser's own print command.

Project galleries use local images recovered from the original portfolio, public repositories, the historical income-classification presentation, and reviewed synthetic-prototype documentation. All images are visible by default. QGIS, SQL/JavaScript/R, and ModelBuilder have separate pages again. Select an image to open the in-page viewer: Close or Escape dismisses it; Zoom in/out changes its size; images open centered and scaled to 95% of the available width or height, preserving their proportions and enlarging small originals; Fit to screen restores that sizing; scroll to pan enlarged images. Keyboard +, -, and 0 are supported. Browser Ctrl/Cmd zoom shortcuts remain available. Without JavaScript the link opens the original local image file. Routine builds do not depend on external image hosts.

## Validation

`npm run check` verifies page structure, source-data completeness, all local links and anchors, preservation of old routes, metadata, and the publication file allowlist. `npm run validate` builds all outputs required by `npm test`. The tests protect factual distinctions between consultant work, automated execution, historical program outcomes, and synthetic experiments, plus preview isolation and indexing rules.

Image captions, dimensions, and available public source URLs are recorded in `content/screenshots.json`. Internal audit and publication-planning notes remain outside the public repository.
