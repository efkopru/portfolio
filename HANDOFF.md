# Portfolio handoff

Updated: 2026-09-25. This is the production continuation guide. Read [README.md](README.md) first. Recheck Git and deployment state rather than treating this snapshot as a live status report.

## Purpose and release baseline

Maintain Esad Kopru's portfolio for geospatial data science, data engineering, spatial analysis, and software work. Preserve the simple original-site structure while making ownership, methods, outputs, and supporting evidence clear.

- Repository: [efkopru/portfolio](https://github.com/efkopru/portfolio).
- Production branch: `main`; live origin: [www.ekopru.com](https://www.ekopru.com/).
- Latest approved improvements, 2026-09-25, one commit each so any can be reverted alone: `e8a2ed8` line-ending-independent asset hashes; `eb378fe` full desktop navigation from 1140px; `aa47147` footer background cropped and re-encoded from 772 KB to 111 KB; `5253107` full-width resume preview on phones; `75b29c0` `dist/.htaccess` for Hostinger 404 page, AVIF type, and baseline headers; `87e8850` WebP previews for the 26 income-prediction slides; `88ca031` type labels and summaries on category overview pages; `5d0ba49` intrinsic sizes for workflow diagrams.
- Rollback point: tag `before-improvements-2026-09-25` (`1622dec`) is production `main` before those changes.
- Earlier relevant commits: `5493068` utility diagram cache-version fix; `a96de74` utility source-backed case update; `4f408af` frameless images across project pages; `aa37e4c` two-stage building-footprint workflow.
- Build baseline: 51 static pages, 24 base project records, 29 project routes including five historical gallery/application pages, and 20 preserved original routes.
- Regression baseline: 120 site tests and 54 Python example tests. Run validation again after changes; counts are not permanent acceptance criteria.
- No tracked GitHub Actions workflow currently exists on production `main`. Hostinger auto-deployment is not gated by a workflow on a historical branch.

The older preview and evidence branches are historical work, not the current editing target. Local workspace routing, including the correct managed worktree, is recorded in ignored `docs/LOCAL_HANDOFF.md` when available.

## Start safely

1. Confirm the checkout path, branch, remote, HEAD, and dirty state. Preserve unrelated edits and other worktrees.
2. Read this file, README, and the source modules for the requested area. Local private notes supplement facts but are not public release assets.
3. Use existing source and tests as the current implementation authority. Do not replay old checklists as new authorization.
4. Edit source, not generated HTML. Rebuild to update checkout pages and `dist/`.
5. Validate, test the affected UI, commit the intended changes, and push `main` under the user's standing instruction. Never force-push or rewrite history without a separate request.
6. Confirm the hosting build matches the pushed commit and verify the live result before saying it is published.

## Preserve these decisions

- Keep the design simple, text compact, and workflow arrows clear. Do not introduce a replacement visual design or restore discarded oversized cards.
- Use **Highlighted work**, not Selected work. Do not restore its removed black button. Preserve the five existing homepage keywords and compact introduction.
- Keep the original three categories and current navigation order/spacing. Additional projects must exclude anything already in a main category. Hide its menu when empty, but retain the direct route. The full desktop navigation starts at 1140px; adding or renaming top-level items requires rechecking that it still fits.
- Category overview pages may only reuse each record's existing `type` and `summary`; do not write new labels for records without a type. The homepage project index stays titles only.
- Only Classic and Midnight remain. Use the accessible Dark mode toggle, not a dropdown or extra themes.
- Keep image containers transparent and frameless, with natural proportions. Do not remove white content from original charts or screenshots, crop evidence, or recolor the original media. Preserve Close/Escape, zoom, Fit, keyboard support, and captions.
- Keep case explanations simple. Preserve established ownership and qualify real outcomes versus synthetic demonstrations.
- Crime Analysis credits end-to-end contribution. The custom JavaScript map and crime dashboard retain equal enlarged application areas; other embeds stay unchanged.
- Preserve the Google Docs resume preview and small second-page hint. Do not restore a separate Open resume link or download controls.
- Contact stays on the same page after AJAX submission. Keep the Message sent dialog, Close button, and same-page-session send lock. Do not add the removed email/GitHub/location sections, privacy-note copy, or refresh-to-send instructions to that popup.
- Do not send test contact messages or alter provider accounts as part of normal validation.

## Case-specific context

### Building Footprint Extraction

The imagery pipeline is the preprocessing stage of this project, followed by extraction with ESRI's pretrained model. Both stages are visible on the parent page. The preprocessing record retains its old direct route and complete source-backed explanation, but is not a separate project listing.

Do not present imagery completeness as model accuracy, claim training from scratch, or recreate a duplicate Additional projects card. The 120,426-tile coverage result is archived evidence with its stated limits.

### Utility inspection data pipeline

The latest page explains the flight-track component with four stages: Collect records, Build flight lines, Match nearby assets, Update GIS. It includes timestamp-based selection, pandas joins, explicit field mappings, local staging, and per-stage logs. The source-backed implementation detail is in `content/inspection-cases.mjs`.

The 350-foot relationship yields candidate coverage, not independently confirmed inspection. Existing 30+ monthly runs, two manual hours saved per run, and 80% refresh-time reduction belong to the established wider project; the source review did not remeasure them.

The original operational source was inspected statically, not run or published. It is not a ready-to-release code package. Private review notes describe unresolved source issues; repairing or releasing that source requires a separate task.

`assets/evidence/utility-data-flow.svg` is an original explanatory diagram, shown once near the beginning. Keep both thumbnail and viewer URLs content-versioned: the live check previously caught an old cached SVG despite fresh page HTML. `scripts/build.mjs` hashes opted-in zoomable case diagrams; `scripts/case-evidence.mjs` applies the same URL to the image and viewer link.

The synthetic spatial ETL companion is separate. Its validation, transactional updates, replay, and rollback behavior must not be attributed to the historical pipeline.

### Other evidence boundaries

- Ground patrol is related preparation, priority logic, and reporting work; do not inherit utility scheduling or savings claims automatically.
- Doctoral Research keeps a simple explanation, archived comparisons, and a plain dissertation citation. Removed research-resource links and teaching-example sections must not return automatically. The standalone synthetic network example still exists.
- Lead pipe prediction prototype and the independent V3 evidence workbench remain distinct synthetic cases. The older municipal OCR page remains unlisted. Do not add duplicate category/Additional listings or private source links.
- Unlisted routes remain directly accessible and may be in the sitemap. This is not access control or a promise of deindexing.

## Working files and verification

Use README's source map. Important additional modules are `content/nearmap-case.mjs`, `content/inspection-cases.mjs`, `content/parcel-case.mjs`, and `content/research-update.mjs`. Public original screenshots are indexed in `content/screenshots.json`; their source files are not design placeholders.

Run `npm run validate` and `git diff --check`. Node 22+ builds the site; Python 3.10+ with sqlite3 runs the teaching-example suites. In a restricted sandbox, Node's test subprocesses may need authorized execution permissions. Do not disable tests to hide a spawn-permission failure.

Check the affected pages at desktop and mobile widths in both themes. Verify applicable menus, links, disclosures, viewer controls, scroll behavior, and absence of horizontal page overflow. Reset temporary viewport/theme overrides and close only agent-created verification tabs.

The full-size viewer fits proportionally, not by cropping. Scrollable diagram containers may intentionally overflow internally on mobile; the page itself must not overflow.

## Release and safety gates

- Hostinger's existing production target builds `main` with Node 24 and publishes `dist/` after `npm run build`.
- Deploy only the allowlisted build. Public README/HANDOFF are repository documentation, not website pages; example guides are explicitly published.
- Never force-add ignored `docs/`, original employer scripts, connection files, credentials, private records, actual infrastructure coordinates, or licensed imagery.
- Preserve synthetic-data disclosures and provenance. Source folder access is not permission to publish everything in it.
- Verify hosting completion for the exact pushed SHA, then inspect fresh live HTML and changed assets. A local screenshot is not live-deployment evidence.
- FormSubmit acceptance and inbox receipt are different. No new owner-confirmed inbox test was performed during the latest source/docs work.
- External GIS layers and Google Docs permissions can change independently. Inspect relevant failures without changing external settings unless requested.

## Remaining work

There is no authorized feature implementation waiting in this handoff. Start the next session by establishing current state and then follow the user's next request. Source-code cleanup, a backend replacement for FormSubmit, indexing changes, or a new design are separate tasks, not implied next steps.

Open questions from the 2026-09-25 review, each awaiting the owner's decision rather than implementation:

- The About page has no internal links but is in the sitemap, and its employer text is written in the present tense. Link it, unlist it, or leave it.
- `ekopru.com` serves the same pages as `www.ekopru.com` without redirecting; canonical tags point to www. A redirect is a Hostinger panel setting.
- The highlighted card "Public web GIS and application modernization" opens the page titled "Interactive Maps - A custom JS App".
- The content security policy in `_headers` is not enforced on Hostinger. Enforcing it through `.htaccess` needs a live check of the resume, GIS embeds, workbench demo, and contact form first.
- Smaller galleries without previews (lead-service prototype, workbench, workforce atlas, and unlisted forecast demonstrations) still load their original PNGs as thumbnails.
