# Esad Kopru portfolio

Static portfolio preserving the original ekopru.com navigation, three-category project index, and separate gallery pages. Three selected projects introduce the portfolio before the complete original collections. Case studies present the problem, contribution, tools, methods, results, and limits before their galleries. No framework or account system is required. The contact form uses FormSubmit for email delivery. External GIS applications load only after an explicit click.

## Evidence branch

`codex/portfolio-evidence` is an independent review branch based on production `main`. It is not the older alternate-homepage branch. Its homepage is the root `index.html` in this checkout. Nothing in the build merges, pushes, or deploys this branch. Keep Hostinger's production branch on `main` until this version is approved.

The additions are three featured projects, visible case-study summaries, three runnable synthetic companions, a cited doctoral research explanation, and project-specific sharing images. Original routes, galleries, Classic/Midnight switch, and the existing Contact form are retained.

## Work locally

Requires Node.js 22 or newer. There are no dependencies to install.

```powershell
npm run build
npm run check
npm test
npm run dev
```

Open `http://127.0.0.1:4173/`. The development server binds only to this computer. Rebuild and reload after editing; it is intentionally not an HMR server.

## Where to edit

- `content/portfolio.mjs`: profile, employment, skills, and 20 project case studies.
- `content/site-structure.mjs`: original navigation order, separate page galleries, additional projects, and public application links.
- `content/screenshots.json`: local screenshot paths, dimensions, captions, and original source URLs.
- `content/evidence.mjs`: featured projects, educational companions, diagrams, and the explicit public-source file allowlist.
- `examples/`: three self-contained Python teaching examples with guides, tests, and actual-run JSON reports.
- `scripts/evidence-pages.mjs`: case-study summaries, evaluation tables, run instructions, and escaped source viewers.
- `scripts/social-cards.mjs`: project-specific sharing-card metadata.
- `scripts/build.mjs`: page templates, metadata, sitemap, publication output.
- `styles.css`: responsive design, focus states, and print layout.
- `script.js`: same-page contact submission, theme selection, dropdown/mobile navigation, the accessible image viewer, click-to-load applications, and legacy hash navigation.
- `theme.js`: restores an allowlisted saved theme before the page styles load.

The HTML at the project root and in page directories is generated. Edit the source above and rebuild. Internal evidence notes, local backups, agent settings, and one-time image recovery tools are excluded from Git and website publication. All assets needed for routine builds are included in this repository.

You can also open the root `index.html` directly from File Explorer. Navigation, styles, image galleries, and the viewer use relative local files without fetching a content manifest. Embedded public applications still need an internet connection. Automated `file://` browser QA is unavailable under the browser tool's security policy; the equivalent HTTP preview is tested.

## Themes

The compact Dark mode switch below the header turns Midnight (dark navy and cyan) on or returns to Classic (the original palette) when off. Classic remains the default. Previously saved themes that are no longer available fall back to Classic. The switch has a stable accessible name, announces its on/off state, supports mouse, touch, Enter, and Space, and retains a 44px minimum target on all screen sizes. Its short animation respects reduced-motion preferences. Themes preserve the same navigation, typography, galleries, and image-viewer controls. Only the selected theme name is saved locally under `ekopru-theme`; contact messages are never saved in browser storage. If storage is unavailable, switching still works for the current page. Persistence across directly opened `file://` pages depends on the browser; use the HTTP preview for consistent cross-page behavior. Without JavaScript the original Classic theme remains usable and the switch stays hidden. Printed pages remain white with dark text.

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

`npm run check` verifies page structure, source-data completeness, all local links and anchors, preservation of old routes, metadata, and the publication file allowlist. `npm test` protects the important factual distinctions between consultant work, automated execution, historical program outcomes, and synthetic experiments.

## Reproduce the educational examples

These are newly authored teaching companions using invented data, not recovered employer code or reproductions of original research experiments. Each page labels that distinction and exposes its guide, source, tests, report, settings, and limitations. The code and reports are explicitly allowlisted for static publication; caches, databases, and other workspace files are not.

Python 3.10+ with the standard-library `sqlite3` module is needed only to run these examples and their tests. Website builds on Hostinger need Node.js only and use the checked-in reports and images.

```powershell
npm run test:examples
npm run validate
```

The runner tries `python`, `python3`, and `py -3`. If needed, set `$env:PYTHON` to the full executable path, without arguments. Each test suite runs in its own interpreter. `validate` builds the site, checks publication output, runs website regressions, then runs all example tests.

From the repository root, regenerate each report independently:

```powershell
python examples/spatial-etl/demo.py --report examples/spatial-etl/report.json
python examples/lead-pipe-synthetic/demo.py --report examples/lead-pipe-synthetic/report.json --chart assets/evidence/lead-pipe-evaluation.svg
python examples/network-access/demo.py --report examples/network-access/report.json
npm run build
```

The ETL example validates invented local-grid observations and demonstrates quarantine, transactional revision-aware updates, idempotent replay, rollback, and recovery in SQLite. It does not claim PostGIS or real coordinate transformations. The ML example compares a grouped-split logistic model with a training-prevalence baseline and reports losses, confusion counts, reliability bins, and error slices. Its scores are not field accuracy. The network example contrasts independent shortest-path edges with an exhaustively optimized shared network on tiny graphs; timings are actual local measurements that vary between runs, not dissertation benchmarks.

The research page cites the [UT Dallas doctoral record](https://graduate.utdallas.edu/fsa/doctoral-degrees-awarded/2023-2024-doctoral-degrees-awarded/) and [version-pinned public R source](https://github.com/efkopru/gemini-shortest-path/tree/bc917f2a679f0ef624b15d2e6b4a3dc5fc8db388). It does not claim a journal paper or DOI. Each example guide documents its exact constraints.

## Sharing images

Every project has a local 1200 by 630 PNG cover. General pages use `assets/social/portfolio.png`; companion and source pages inherit their parent project's cover. Open Graph and Twitter metadata use absolute, content-versioned image URLs based on `SITE_URL`. Existing reviewed project imagery is used where available. No remote image downloads occur during builds.

To regenerate the committed images on Windows after changing project titles or summaries:

```powershell
powershell -NoProfile -File scripts/create-social-previews.ps1
npm run build
npm run check
npm test
```

PNG generation uses Windows System.Drawing; ordinary website builds on other systems only copy the committed PNGs. Sharing services need the final public HTTPS URLs to fetch these images. Local metadata tests do not prove that a sharing service has refreshed its cached preview.

Image captions, dimensions, and available public source URLs are recorded in `content/screenshots.json`. Internal audit and publication-planning notes remain outside the public repository.
