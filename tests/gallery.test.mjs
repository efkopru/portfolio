import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { siteProjects, collections, browseCollections, additionalProjects } from '../content/site-structure.mjs';
import sourceGroups from '../content/screenshots.json' with { type: 'json' };

test('all recovered images are published and not inside collapsed galleries', async () => {
  const used = new Set(siteProjects.flatMap(p => p.gallery.map(image => image.src)));
  for (const image of Object.values(sourceGroups).flat()) assert.ok(used.has(image.src), `Unmapped screenshot: ${image.src}`);
  for (const project of siteProjects) {
    const html = await readFile(new URL(`../dist/${project.id}/index.html`, import.meta.url), 'utf8');
    for (const details of html.matchAll(/<details\b[^>]*>([\s\S]*?)<\/details>/g)) {
      assert.doesNotMatch(details[1], /class="project-gallery"|data-image-viewer/, `${project.id}: gallery images must stay outside optional technical details`);
    }
    const withoutDetails = html.replace(/<details\b[^>]*>[\s\S]*?<\/details>/g, '');
    assert.ok(!/<a[^>]+href="\.\.\/assets\/screenshots\/[^>]+target="_blank"/.test(html), `${project.id}: full-size viewing must not depend on popups`);
    for (const image of project.gallery) assert.ok(withoutDetails.includes(`src="../${image.preview}"`), `${project.id}: missing visible preview`);
  }
});

test('original galleries have separate pages and retain their complete collections', async () => {
  for (const group of ['spatial-analysis', 'python-and-notebooks', 'qgis', 'sql-and-javascript-and-r', 'modelbuilder-and-arcmap-tool-in-vbnet']) {
    const project = siteProjects.find(p => p.id === group);
    assert.deepEqual(project.gallery.map(i => i.src), sourceGroups[group].map(i => i.src));
    const html = await readFile(new URL(`../dist/${group}/index.html`, import.meta.url), 'utf8');
    assert.ok(!html.includes('data-redirect='));
  }
});

test('home retains the original three collections below selected work without role filters', async () => {
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  assert.ok(html.includes('<h1>Esad Kopru</h1>') && html.includes('Breakdown of the Projects'));
  assert.ok(!/class="filters"|data-role-link/.test(html));
  assert.ok(html.indexOf('id="selected-work"') < html.indexOf('id="projects"'));
  for (const collection of collections) {
    for (const [id] of collection.entries) assert.ok(html.includes(`./${id}/index.html`));
  }
});

test('newer work appears once in the main index and category without duplicate Additional projects listings', async () => {
  const newerIds = ['utility-inspection-etl', 'accessibility-analysis', 'lead-service-line-evidence-workbench', 'lead-service-review-prototype', 'workforce-participation', 'geospatial-processing-tools', 'ground-patrol-analytics', 'parcel-data-integration'];
  const listedIds = browseCollections.flatMap(collection => collection.entries.map(([id]) => id));
  assert.deepEqual(additionalProjects, [], 'All current listed projects belong to a main category');
  for (const project of additionalProjects) {
    assert.ok(!listedIds.includes(project.id), `${project.id}: Additional projects never repeats a main-category project`);
    assert.ok(!project.original && !project.parentProjectId, `${project.id}: original and grouped projects are excluded`);
  }
  for (const collection of browseCollections) {
    const original = collections.find(c => c.id === collection.id);
    assert.deepEqual(collection.entries.slice(0, original.entries.length), original.entries);
  }
  assert.deepEqual(new Set(browseCollections.flatMap(collection => collection.entries.slice(collections.find(original => original.id === collection.id).entries.length).map(([id]) => id))), new Set(newerIds), 'All eight newer projects stay in the main categories');
  const manifest = JSON.parse(await readFile(new URL('../dist/build-manifest.json', import.meta.url), 'utf8'));
  for (const directory of ['', 'dist/']) {
    const home = await readFile(new URL(`../${directory}index.html`, import.meta.url), 'utf8');
    const index = home.match(/<section class="shell project-index"[^]*?<\/main>/)[0];
    const additionalPage = await readFile(new URL(`../${directory}additional-projects/index.html`, import.meta.url), 'utf8');
    const additionalMain = additionalPage.match(/<main\b[^]*?<\/main>/)[0];
    assert.ok(additionalMain.includes('All projects are listed in the main categories.'), `${directory}: preserved Additional URL explains where projects live`);
    for (const collection of collections) assert.ok(additionalMain.includes(`href="../${collection.id}/index.html"`), `${directory}: link to ${collection.id} overview`);
    for (const project of siteProjects) assert.ok(!additionalMain.includes(`${project.id}/index.html`), `${directory}: Additional projects has no duplicate ${project.id} listing`);
    for (const id of newerIds) {
      const project = siteProjects.find(project => project.id === id);
      assert.ok(project, `${id}: preserve the project record`);
      assert.ok(manifest.pages.includes(`${id}/index.html`), `${id}: preserve the direct route`);
      assert.equal(listedIds.filter(listedId => listedId === id).length, 1, id);
      assert.equal(index.split(`href="./${id}/index.html"`).length - 1, 1, `${directory}${id}: homepage index`);
      const category = await readFile(new URL(`../${directory}${project.collection.id}/index.html`, import.meta.url), 'utf8');
      const categoryMain = category.match(/<main\b[^]*?<\/main>/)[0];
      assert.equal(categoryMain.split(`href="../${id}/index.html"`).length - 1, 1, `${directory}${id}: category listing`);
      const detail = await readFile(new URL(`../${directory}${id}/index.html`, import.meta.url), 'utf8');
      assert.ok(detail.match(/<nav class="breadcrumbs"[^]*?<\/nav>/)[0].includes(`href="../${project.collection.id}/index.html"`));
    }
  }
});

test('all unframed galleries preserve original images, dimensions, captions and viewer controls', async () => {
  const esc = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
  const assets = new Set();
  for (const project of siteProjects.filter(project => project.gallery.length)) {
    for (const directory of ['', 'dist/']) {
      const html = await readFile(new URL(`../${directory}${project.id}/index.html`, import.meta.url), 'utf8');
      const galleries = [...html.matchAll(/<section class="gallery-group"[^>]*>([^]*?)<\/section>/g)].map(match => match[1]).join('');
      assert.equal((galleries.match(/<figure\b/g) || []).length, project.gallery.length, `${directory}${project.id}: retain every image without extra frames or duplicates`);
      for (const image of project.gallery) {
        const caption = esc(image.caption);
        assert.ok(galleries.includes(`<a data-image-viewer href="../${esc(image.src)}" data-caption="${caption}" aria-label="Open image: ${caption}">`), `${directory}${project.id}: retain full-size image and accessible caption`);
        assert.ok(galleries.includes(`<img src="../${esc(image.preview)}" width="${image.width}" height="${image.height}" alt="${caption}" loading="lazy" decoding="async">`), `${directory}${project.id}: retain original preview proportions, alt text and loading behavior`);
        assert.ok(galleries.includes(`<figcaption>${caption}</figcaption>`), `${directory}${project.id}: retain visible caption`);
        assets.add(image.src);
        assets.add(image.preview);
      }
      for (const control of ['data-viewer-close', 'data-zoom-in', 'data-zoom-out', 'data-zoom-reset']) assert.ok(html.includes(control), `${directory}${project.id}: retain ${control}`);
    }
  }
  for (const asset of assets) {
    const [original, published] = await Promise.all(['', 'dist/'].map(directory => readFile(new URL(`../${directory}${asset}`, import.meta.url))));
    assert.deepEqual(published, original, `${asset}: publish the source image without cropping or alteration`);
  }
});

test('unframed building extraction images preserve their original assets, captions and full-size controls', async () => {
  const project = siteProjects.find(project => project.id === 'building-footprint-extraction');
  const expected = [
    ['assets/screenshots/building-footprint-extraction-01.png', 'assets/screenshots/building-footprint-extraction-01-preview.webp', 'Building extraction result 1', 1529, 657],
    ['assets/screenshots/building-footprint-extraction-02.png', 'assets/screenshots/building-footprint-extraction-02-preview.webp', 'Building extraction result 2', 1173, 509]
  ];
  assert.deepEqual(project.gallery.map(image => [image.src, image.preview, image.caption, image.width, image.height]), expected, 'Remove the gallery frame without replacing or cropping the images');
  for (const directory of ['', 'dist/']) {
    const html = await readFile(new URL(`../${directory}${project.id}/index.html`, import.meta.url), 'utf8');
    const group = html.match(/<section class="gallery-group" id="gallery-building-footprint-extraction">([^]*?)<\/section>/)?.[1];
    assert.ok(group, `${directory}: the extraction gallery remains independently addressable`);
    assert.equal((group.match(/<figure\b/g) || []).length, 2);
    for (const [src, preview, caption, width, height] of expected) {
      assert.ok(group.includes(`<a data-image-viewer href="../${src}" data-caption="${caption}" aria-label="Open image: ${caption}">`));
      assert.ok(group.includes(`<img src="../${preview}" width="${width}" height="${height}" alt="${caption}" loading="lazy" decoding="async">`));
      assert.ok(group.includes(`<figcaption>${caption}</figcaption>`));
    }
    for (const control of ['data-viewer-close', 'data-zoom-in', 'data-zoom-out', 'data-zoom-reset']) assert.ok(html.includes(control), `${directory}: preserve ${control}`);
  }
});

test('imagery work is grouped under Building Footprint Extraction instead of standalone project listings', async () => {
  const child = siteProjects.find(project => project.id === 'nearmap-imagery-pipeline');
  const parent = siteProjects.find(project => project.id === 'building-footprint-extraction');
  const groupedAnchor = `part-${child.id}`;
  const script = await readFile(new URL('../script.js', import.meta.url), 'utf8');
  const legacyRoutes = [...script.match(/const routes = new Set\(\[([^\]]+)\]\)/)[1].matchAll(/'([^']+)'/g)].map(match => match[1]);
  assert.ok(!siteProjects.some(project => project.id === groupedAnchor), 'The grouped anchor must not match a project ID');
  assert.ok(!legacyRoutes.includes(groupedAnchor), 'The grouped anchor must not trigger legacy hash-route navigation');
  assert.ok(!legacyRoutes.includes('deep-learning-extraction'), 'The extraction anchor must not trigger legacy hash-route navigation');
  assert.equal(child.parentProjectId, parent.id);
  assert.equal(child.collection.id, parent.collection.id);
  assert.equal(child.collection.id, 'ml-optimization');
  assert.ok(!additionalProjects.some(project => project.id === child.id));
  assert.equal(browseCollections.flatMap(collection => collection.entries).filter(([id]) => id === child.id).length, 0);
  assert.equal(browseCollections.find(collection => collection.id === 'ml-optimization').entries.filter(([id]) => id === parent.id).length, 1);

  const manifest = JSON.parse(await readFile(new URL('../dist/build-manifest.json', import.meta.url), 'utf8'));
  assert.ok(manifest.pages.includes(`${child.id}/index.html`), 'Keep the existing imagery page for direct links');
  for (const directory of ['', 'dist/']) {
    for (const page of manifest.pages) {
      const html = await readFile(new URL(`../${directory}${page}`, import.meta.url), 'utf8');
      const nav = html.match(/<nav id="site-nav"[^]*?<\/nav>/)[0];
      assert.ok(!nav.includes(`${child.id}/index.html`), `${directory}${page}: imagery is not a standalone dropdown item`);
    }
    for (const page of ['index.html', 'additional-projects/index.html', 'development-and-etl/index.html', 'ml-optimization/index.html']) {
      const html = await readFile(new URL(`../${directory}${page}`, import.meta.url), 'utf8');
      const main = html.match(/<main\b[^]*?<\/main>/)[0];
      assert.ok(!main.includes(`${child.id}/index.html`), `${directory}${page}: no standalone imagery listing`);
      if (page === 'index.html' || page === 'ml-optimization/index.html') assert.ok(main.includes(`${parent.id}/index.html`), `${directory}${page}: parent remains listed`);
    }
    const childHtml = await readFile(new URL(`../${directory}${child.id}/index.html`, import.meta.url), 'utf8');
    assert.ok(childHtml.includes(`<h1>${child.title}</h1>`), 'Keep the complete original imagery page');
    assert.ok(!childHtml.includes('data-redirect='), 'Existing imagery links must not become an empty redirect page');
    const breadcrumb = childHtml.match(/<nav class="breadcrumbs"[^]*?<\/nav>/)[0];
    assert.ok(breadcrumb.includes(`href="../${parent.id}/index.html#${groupedAnchor}"`), 'The imagery page links directly back to its grouped section');
    assert.ok(breadcrumb.includes('href="../ml-optimization/index.html"'));
    assert.ok(!breadcrumb.includes('href="../development-and-etl/index.html"'));
    const parentHtml = await readFile(new URL(`../${directory}${parent.id}/index.html`, import.meta.url), 'utf8');
    assert.ok(parentHtml.includes(`id="${groupedAnchor}"`), 'The grouped jump link has a matching non-route section anchor');
    assert.ok(!parentHtml.includes(`href="#${child.id}"`), 'The jump link must not navigate to the standalone legacy route');
    const stagesNav = parentHtml.match(/<nav\b[^>]*aria-label="Project stages"[^>]*>([^]*?)<\/nav>/);
    assert.ok(stagesNav, `${directory}: both stages are immediately discoverable`);
    assert.ok(stagesNav[1].includes(`href="#${groupedAnchor}">1. Preprocessing</a>`));
    assert.ok(stagesNav[1].includes('href="#deep-learning-extraction">2. Deep learning</a>'));
    assert.ok(stagesNav.index < parentHtml.indexOf(`id="${groupedAnchor}"`), 'The stage navigation comes before both stages');
    assert.ok(parentHtml.indexOf(`id="${groupedAnchor}"`) < parentHtml.indexOf('id="deep-learning-extraction"'), 'Preprocessing precedes deep learning');
    assert.ok(parentHtml.indexOf('id="deep-learning-extraction"') < parentHtml.indexOf('class="project-gallery"'), 'Extraction results are inside the second stage');
    assert.ok(!parentHtml.includes('Earlier project stages'), 'The imagery workflow is a first-class stage, not a buried earlier-stage footnote');
    assert.equal((parentHtml.match(/class="project-stage"/g) || []).length, 2, `${directory}: exactly two workflow stages`);
    for (const image of parent.gallery) {
      assert.ok(parentHtml.includes(`href="../${image.src}"`), `${directory}: extraction screenshot remains openable`);
      assert.ok(parentHtml.includes(`src="../${image.preview}"`), `${directory}: extraction screenshot preview remains published`);
    }
  }
});

test('removed projects are unlisted and the lead prediction prototype is clearly named', async () => {
  const excluded = ['lead-service-line-ocr', 's2s-transformer-bias-correction', 'dask-ensemble-calibration', 'vit-heatwave-calibration', 'transformer-bias-correction'];
  const listedIds = browseCollections.flatMap(c => c.entries.map(([id]) => id));
  for (const id of excluded) {
    assert.ok(!listedIds.includes(id));
    assert.ok(!additionalProjects.some(p => p.id === id));
    assert.ok(siteProjects.some(p => p.id === id), 'Preserve source records and direct pages');
  }
  for (const page of ['index.html', 'spatial-and-data-analysis/index.html', 'ml-optimization/index.html', 'additional-projects/index.html']) {
    const html = await readFile(new URL(`../dist/${page}`, import.meta.url), 'utf8');
    for (const id of excluded) assert.ok(!html.includes(`${id}/index.html`), `${page}: ${id} remains listed`);
    assert.ok(html.includes('Lead pipe prediction prototype'));
    assert.ok(!html.includes('From document evidence to a review queue'));
  }
  const detail = await readFile(new URL('../dist/lead-service-review-prototype/index.html', import.meta.url), 'utf8');
  assert.ok(detail.includes('<h1>Lead pipe prediction prototype</h1>'));
  assert.ok(detail.includes('local synthetic-data prototype, not a deployed utility model'));
});

test('every page omits an empty Additional projects menu and lists each categorized project once', async () => {
  const manifest = JSON.parse(await readFile(new URL('../dist/build-manifest.json', import.meta.url), 'utf8'));
  for (const directory of ['', 'dist/']) {
    for (const page of manifest.pages) {
      const html = await readFile(new URL(`../${directory}${page}`, import.meta.url), 'utf8');
      const nav = html.match(/<nav id="site-nav"[^]*?<\/nav>/)[0];
      const prefix = page.includes('/') ? '../' : './';
      assert.doesNotMatch(nav, /additional-projects|Additional projects/, `${directory}${page}: no empty menu or dropdown`);
      assert.equal((nav.match(/class="nav-group"/g) || []).length, 3, `${directory}${page}: only the three main categories have dropdowns`);
      for (const collection of browseCollections) {
        const dropdown = nav.match(new RegExp(`<div class="dropdown" id="nav-${collection.id}">([^]*?)<\\/div>`))?.[1];
        assert.ok(dropdown, `${directory}${page}: ${collection.id} dropdown`);
        assert.deepEqual([...dropdown.matchAll(/href="([^"]+)"/g)].map(match => match[1]), [collection.id, ...collection.entries.map(([id]) => id)].map(id => `${prefix}${id}/index.html`));
        for (const [id] of collection.entries) assert.equal(nav.split(`href="${prefix}${id}/index.html"`).length - 1, 1, `${directory}${page}: ${id} appears once in navigation`);
      }
      assert.ok(nav.indexOf('nav-development-and-etl') < nav.indexOf(`${prefix}doctoral-research/index.html`), `${directory}${page}: Doctoral Research remains after the categories`);
    }
  }
});

test('the layout retains an Additional projects dropdown for future uncategorized work only', async () => {
  const build = await readFile(new URL('../scripts/build.mjs', import.meta.url), 'utf8');
  const start = build.indexOf('function layout(');
  const end = build.indexOf('\nfunction gallery(', start);
  assert.ok(start >= 0 && end > start);
  const esc = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
  for (const extra of [[], [{ id: 'uncategorized-project', title: 'Uncategorized project' }]]) {
    const context = {
      esc, origin: 'https://portfolio.example.test', socialAssets: ['assets/social/portfolio.png'],
      socialVersions: { 'assets/social/portfolio.png': 'abc' }, assetVersions: { 'theme.js': 'a', 'styles.css': 'b', 'script.js': 'c' },
      browseCollections, additionalProjects: extra, year: 2026,
      profile: { name: 'Esad Kopru', github: 'https://github.com/efkopru' }, errorPageBaseScript: ''
    };
    runInNewContext(`${build.slice(start, end)}\nglobalThis.html = layout({ title: 'Additional projects', description: 'Test', route: 'additional-projects', body: '' });`, context, { timeout: 1000 });
    const nav = context.html.match(/<nav id="site-nav"[^]*?<\/nav>/)[0];
    if (!extra.length) {
      assert.doesNotMatch(nav, /additional-projects|Additional projects/);
      assert.match(nav, /class="site-nav site-nav--main-only"/);
    } else {
      assert.doesNotMatch(nav, /site-nav--main-only/);
      const dropdown = nav.match(/<div class="dropdown" id="nav-additional-projects">([^]*?)<\/div>/)?.[1];
      assert.ok(dropdown, 'Future uncategorized work is discoverable');
      assert.deepEqual([...dropdown.matchAll(/href="([^"]+)"/g)].map(match => match[1]), ['../additional-projects/index.html', '../uncategorized-project/index.html']);
      assert.ok(nav.includes('aria-controls="nav-additional-projects"'));
      assert.ok(nav.indexOf('nav-development-and-etl') < nav.indexOf('nav-additional-projects'));
      assert.ok(nav.indexOf('nav-additional-projects') < nav.indexOf('../doctoral-research/index.html'));
    }
  }
});

test('category labels link directly to overviews with separate dropdown controls', async () => {
  const manifest = JSON.parse(await readFile(new URL('../dist/build-manifest.json', import.meta.url), 'utf8'));
  const escape = text => text.replaceAll('&', '&amp;');
  for (const page of manifest.pages) {
    const html = await readFile(new URL(`../dist/${page}`, import.meta.url), 'utf8');
    const nav = html.match(/<nav id="site-nav"[^]*?<\/nav>/)[0];
    const prefix = page.includes('/') ? '../' : './';
    for (const collection of collections) {
      const current = page === `${collection.id}/index.html` ? ' aria-current="page"' : '';
      const heading = `<div class="nav-heading"><a href="${prefix}${collection.id}/index.html"${current}>${escape(collection.title)}</a><button`;
      assert.ok(nav.includes(heading), `${page}: ${collection.id} overview link`);
      assert.ok(nav.includes(`aria-label="Toggle ${escape(collection.title)} project menu" aria-expanded="false" aria-controls="nav-${collection.id}"`));
      assert.ok(nav.includes(`<div class="dropdown" id="nav-${collection.id}">`));
    }
  }
});

test('every gallery page includes accessible in-page image controls and fallback links', async () => {
  for (const project of siteProjects.filter(p => p.gallery.length)) {
    const html = await readFile(new URL(`../dist/${project.id}/index.html`, import.meta.url), 'utf8');
    assert.ok(html.includes('<dialog class="image-viewer" aria-labelledby="viewer-title"'));
    for (const control of ['data-viewer-close', 'data-zoom-in', 'data-zoom-out', 'data-zoom-reset']) assert.ok(html.includes(control));
    const zoomGroup = html.match(/<div class="viewer-zoom-controls"[^]*?<\/div>/)[0];
    assert.ok(zoomGroup.includes('data-zoom-out') && zoomGroup.includes('data-zoom-in'));
    assert.ok(!zoomGroup.includes('data-zoom-reset'), 'Fit must remain separate from incremental zoom controls');
    assert.match(html, /<div class="viewer-fit-controls"><button type="button" data-zoom-reset>/);
    for (const image of project.gallery) assert.ok(html.includes(`data-image-viewer href="../${image.src}"`));
  }
});

test('all project and original collection hash routes remain available', async () => {
  const script = await readFile(new URL('../script.js', import.meta.url), 'utf8');
  const routes = script.match(/const routes = new Set\(\[([^\]]+)\]\)/)[1];
  for (const page of [...siteProjects, ...collections]) assert.ok(routes.includes(`'${page.id}'`), `Missing hash route ${page.id}`);
});

test('404 resolves HTTP-root paths while retaining local-file relative paths', async () => {
  const html = await readFile(new URL('../dist/404.html', import.meta.url), 'utf8');
  const headers = await readFile(new URL('../dist/_headers', import.meta.url), 'utf8');
  assert.ok(html.includes('<base href="./">'));
  const baseScript = html.match(/<script>([^<]+)<\/script>/)[1];
  assert.ok(baseScript.includes("location.protocol!=='file:'"));
  const hash = createHash('sha256').update(baseScript).digest('base64');
  assert.ok(headers.includes(`'sha256-${hash}'`));
  assert.ok(html.includes('href="./index.html#projects"'));
});
