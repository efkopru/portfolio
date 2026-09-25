# Esad Kopru portfolio

A static geospatial portfolio with project case studies, local image galleries, interactive application links, and independent Python teaching examples.

- Live site: [www.ekopru.com](https://www.ekopru.com/)
- Repository: [efkopru/portfolio](https://github.com/efkopru/portfolio)
- Production branch: `main`
- Continuation guide: [HANDOFF.md](HANDOFF.md)

This README describes production, not the historical `codex/portfolio-preview` or `codex/portfolio-evidence` branches. The approved improvements are already on `main`.

## Run locally

Use Node.js 22 or newer. There are no npm dependencies to install. Python 3.10+ with standard-library `sqlite3` is required only for the teaching examples and their tests.

Run these commands from the production checkout:

```powershell
git status --short --branch
npm run build
npm run check
npm test
npm run preview
```

Open [http://127.0.0.1:4173/](http://127.0.0.1:4173/). Preview serves `dist/` and binds to localhost only. To use another free port, set `$env:PORT = '4175'` before starting it. Do not stop unrelated servers to free a port.

`npm run dev` serves the generated pages in the checkout instead. Neither command provides hot reload: rebuild after editing source, then reload the browser. A previously running server can belong to another worktree, so check the directory it serves.

Generated `index.html` files also use relative links for direct file opening. HTTP preview is the supported verification route. External maps, Google Docs, and contact delivery still require internet access.

## Where to edit

| File or directory | Purpose |
| --- | --- |
| `content/portfolio.mjs` | Profile, ownership, results, and base case-study records |
| `content/site-structure.mjs` | Navigation, category membership, grouped projects, galleries, and app targets |
| `content/inspection-cases.mjs` | Utility pipeline and ground-patrol case details |
| `content/nearmap-case.mjs`, `parcel-case.mjs`, `research-update.mjs` | Source-backed case expansions |
| `content/screenshots.json` | Reviewed image paths, dimensions, captions, and provenance |
| `content/evidence.mjs` | Highlighted work, teaching examples, diagrams, and publication allowlist |
| `content/resume.mjs` | Read-only Google Docs resume URL |
| `scripts/build.mjs` | HTML templates, metadata, asset versions, and static build |
| `scripts/case-evidence.mjs`, `scripts/evidence-pages.mjs` | Case sections, diagrams, examples, and source readers |
| `styles.css`, `script.js`, `theme.js` | Layout, navigation, image viewer, contact submission, and themes |
| `assets/`, `examples/`, `tests/` | Reviewed assets, synthetic examples, and regression checks |

Root and page-directory HTML is generated. Edit the source, then rebuild; do not maintain a second hand-edited copy of a page. The builder refreshes both checkout HTML and `dist/`. Commit the changed generated pages along with their source. `dist/` itself is ignored by Git.

## Current site behavior

- The homepage presents **Highlighted work**, followed by the three original project categories. Additional projects are only listed when they are outside those categories; the currently empty Additional projects menu is hidden. Its old URL remains usable.
- The full desktop navigation appears from 1140px (including 1280px laptop windows); narrower windows use the Menu button. `styles.css` and the `desktopNavigation` query in `script.js` must use the same breakpoint, and a layout test checks that the seven items fit there.
- Category overview pages list each project with its existing type label and one-line summary from the project record. The homepage project index remains a plain title list.
- Building Footprint Extraction contains **1. Imagery preprocessing** and **2. Deep-learning extraction**. The imagery pipeline retains its old route but is not a duplicate standalone menu item.
- Classic and Midnight are the only themes. A Dark mode on/off switch replaces the old dropdown. Preference storage is optional; invalid old preferences fall back to Classic.
- Gallery screenshots and evidence containers have no added white frames, borders, or padding. Images retain natural proportions. White pixels inside original screenshots or charts are not automatically removed.
- The image viewer retains Close/Escape, separated zoom and Fit controls, 95%-fit sizing, keyboard controls, and panning.
- Utility inspection has a source-backed four-step diagram near the beginning, update-handling details, and explicit output definitions. Its diagram URL is content-versioned for both the preview image and full-size viewer.
- Crime Analysis retains end-to-end ownership. Its enlarged application area and the custom JavaScript map use the same dimensions.
- The Resume page embeds the original public Google Docs preview, with a small second-page scrolling hint and no separate Open resume, download, or print button. The preview is 75% wide on desktop and full content width below 650px.
- The footer background `assets/gis-background.webp` is only the 1440x720 band visible at `center 65%/cover` (rows 936-1656 of the original 1440x2160 image). Change the image and its CSS position together.
- Gallery thumbnails are 720px-wide WebP previews where available; the viewer always opens the original image.
- The contact form uses FormSubmit AJAX without leaving the page. A successful provider response opens **Message sent** with Close; the form stays locked for that page session. Errors retain the message and permit another attempt. Without JavaScript, a normal POST leaves the page.
- The original project routes and reviewed galleries remain available. Unlisted is not private: preserved direct routes may still appear in the sitemap.

## Build and publish

The existing Hostinger deployment follows `main`. Its verified configuration uses Node.js 24, build command `npm run build`, and output directory `dist`. A push to `main` triggers the configured deployment; it does not configure a new host or change the domain.

```powershell
npm run validate
git diff --check
git status --short --branch
# Review and stage only the intended source, docs, assets, and generated pages.
git commit -m "Describe the verified change"
git push origin main
```

After pushing, confirm the hosting build completed for the pushed commit. Then inspect the changed live pages and assets. Local tests or a successful Git push alone do not prove deployment. There is currently no tracked GitHub Actions workflow in production `main`; do not claim that an old branch's workflow gates Hostinger.

For a manual static deployment, upload only the contents of `dist/`. Never upload the entire workspace, private `docs/`, operational source folders, connection files, or data exports.

Canonical URLs and the sitemap default to `https://www.ekopru.com`. Set `SITE_URL` only when intentionally building for a different approved origin. This project uses individual static pages, not an SPA catch-all route. Configure missing paths to return `404.html` with HTTP 404.

The generated `_headers` file applies only on hosts that support that convention; Hostinger ignores it. For Hostinger's Apache-style server, the build also writes `dist/.htaccess`: `ErrorDocument 404 /404.html`, the AVIF MIME type for the logo, and the nosniff, referrer, frame, and permissions headers from `_headers`. The content security policy stays only in `_headers` until it is verified against the live Google resume, GIS applications, and contact form. Verify actual hosting headers separately after changes.

CSS, JavaScript, sharing images, and opted-in zoomable case diagrams use content hashes in their URLs. Text assets are hashed with LF line endings, so Windows CRLF checkouts generate the same versions as the Linux host build. If a changed image still looks old, compare the deployed HTML, versioned URL, and served asset before changing unrelated code.

The tag `before-improvements-2026-09-25` marks production `main` before the September 25, 2026 navigation, performance, and category-page changes. Each of those changes is a separate commit that can be undone with `git revert`.

## Validate

```powershell
npm run validate
```

This builds the site, checks all local links and the publication allowlist, runs site regressions, and runs the three Python example suites. Individual commands are `build`, `check`, `test`, and `test:examples`.

The example runner tries `python`, `python3`, then `py -3`. If necessary, set `$env:PYTHON` to a full interpreter path, without command-line arguments. A Windows Store alias is not a working interpreter.

Also check the changed page at desktop and mobile widths, in both themes. Test the relevant viewer, navigation, disclosure, or embedded-app interaction. Do not send real contact messages as part of a routine automated test.

FormSubmit acceptance does not prove inbox delivery. Owner confirmation of activation and actual receipt remains a separate verification step. External app availability can also change independently of this repository.

## Teaching examples and publication boundaries

The three examples use invented data and are distinct from employer implementations or dissertation benchmarks:

- [Spatial ETL](examples/spatial-etl/README.md): validation, quarantine, revision-aware SQLite updates, replay, rollback, and recovery.
- [Lead-pipe prediction](examples/lead-pipe-synthetic/README.md): grouped evaluation, baseline comparison, calibration summaries, and error slices on synthetic records.
- [Network access](examples/network-access/README.md): tiny shared-network examples and independent shortest-path comparisons.

Normal website builds use committed reports and figures; they do not require Python or regenerate benchmarks. Follow each example's guide for regeneration, then rebuild and retest the site. Do not transfer a teaching example's guarantees or scores to the historical professional project.

Private source, credentials, real infrastructure locations, employer records, and licensed imagery are not publication material. Local audit notes live outside the tracked release or in ignored `docs/`. Only reviewed assets and explicitly allowlisted teaching-example files enter `dist/`.

The independent lead-service workbench publishes a reviewed synthetic interface, not customer data or private model/source files. Its demo decisions remain in the page until exported; it does not submit them to a service. Any replacement input requires a separate synthetic-data review.

## Sharing images

Every project has a committed 1200 by 630 PNG sharing image. General pages use the portfolio card; companion and source pages inherit their project's card. Metadata uses absolute, content-versioned URLs based on `SITE_URL`.

The optional Windows helper `scripts/create-social-previews.ps1` regenerates these images using System.Drawing. Ordinary builds only copy committed assets. Follow a selected project change with a targeted image update when needed; do not regenerate all media unnecessarily. Sharing-service cache refresh is a separate check.

## Continue in another project or session

Read [HANDOFF.md](HANDOFF.md) before making changes. It records the current release baseline, user decisions, known limits, and verification workflow. Local-only workspace routing and private audit references, when available, are in `docs/LOCAL_HANDOFF.md`; the reusable startup prompt is `docs/NEW_PROJECT_PROMPT.md`. Those files are intentionally absent from a public clone.
