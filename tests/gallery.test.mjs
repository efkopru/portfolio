import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
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

test('additional work appears once in the main index and in its category', async () => {
  const home = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const index = home.match(/<section class="shell project-index"[^]*?<\/main>/)[0];
  const additionalPage = await readFile(new URL('../dist/additional-projects/index.html', import.meta.url), 'utf8');
  const additionalMain = additionalPage.match(/<main\b[^]*?<\/main>/)[0];
  assert.deepEqual(new Set(additionalProjects.map(project => project.id)), new Set(['utility-inspection-etl', 'accessibility-analysis', 'lead-service-line-evidence-workbench', 'lead-service-review-prototype', 'workforce-participation', 'geospatial-processing-tools', 'nearmap-imagery-pipeline', 'ground-patrol-analytics', 'parcel-data-integration']), 'Preserve the selected projects and add the three archive-backed cases');
  for (const collection of browseCollections) {
    const original = collections.find(c => c.id === collection.id);
    assert.deepEqual(collection.entries.slice(0, original.entries.length), original.entries);
  }
  for (const project of additionalProjects) {
    assert.equal(browseCollections.flatMap(c => c.entries).filter(([id]) => id === project.id).length, 1, project.id);
    assert.equal(index.split(`href="./${project.id}/index.html"`).length - 1, 1, `${project.id}: homepage index`);
    assert.ok(additionalMain.includes(`href="../${project.id}/index.html"`), `${project.id}: additional collection`);
    const category = await readFile(new URL(`../dist/${project.collection.id}/index.html`, import.meta.url), 'utf8');
    assert.ok(category.match(/<main\b[^]*?<\/main>/)[0].includes(`href="../${project.id}/index.html"`));
    const detail = await readFile(new URL(`../dist/${project.id}/index.html`, import.meta.url), 'utf8');
    assert.ok(detail.match(/<nav class="breadcrumbs"[^]*?<\/nav>/)[0].includes(`href="../${project.collection.id}/index.html"`));
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

test('additional projects has a matching dropdown before Doctoral Research on every page', async () => {
  const manifest = JSON.parse(await readFile(new URL('../dist/build-manifest.json', import.meta.url), 'utf8'));
  for (const page of manifest.pages) {
    const html = await readFile(new URL(`../dist/${page}`, import.meta.url), 'utf8');
    const nav = html.match(/<nav id="site-nav"[^]*?<\/nav>/)[0];
    const prefix = page.includes('/') ? '../' : './';
    const current = page === 'additional-projects/index.html' ? ' aria-current="page"' : '';
    assert.ok(nav.includes(`<div class="nav-heading"><a href="${prefix}additional-projects/index.html"${current}>Additional projects</a><button`), page);
    assert.ok(nav.includes('aria-label="Toggle Additional projects project menu" aria-expanded="false" aria-controls="nav-additional-projects"'), page);
    const dropdown = nav.match(/<div class="dropdown" id="nav-additional-projects">([^]*?)<\/div>/)?.[1];
    assert.ok(dropdown, `${page}: Additional projects dropdown`);
    const hrefs = [...dropdown.matchAll(/href="([^"]+)"/g)].map(match => match[1]);
    assert.deepEqual(hrefs, ['additional-projects', ...additionalProjects.map(project => project.id)].map(id => `${prefix}${id}/index.html`), `${page}: only listed projects appear`);
    assert.ok(dropdown.includes('>Overview</a>'), page);
    assert.ok(nav.indexOf('nav-development-and-etl') < nav.indexOf('nav-additional-projects'), page);
    assert.ok(nav.indexOf('nav-additional-projects') < nav.indexOf(`${prefix}doctoral-research/index.html`), page);
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
