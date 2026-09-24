import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { projects } from '../content/portfolio.mjs';
import { collections, browseCollections, siteProjects } from '../content/site-structure.mjs';
import { featuredWork, methodDiagrams, companions, companionFiles, evidenceAssets, companionRoute, sourceRoute } from '../content/evidence.mjs';
import { socialCards } from '../scripts/social-cards.mjs';
import { caseSummary, caseDetails, projectEvidence, companionPage, sourcePage, figure } from '../scripts/evidence-pages.mjs';

const source = (path, encoding = 'utf8') => readFile(new URL(`../${path}`, import.meta.url), encoding);
const esc = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const body = html => html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1] || '';
const hash = bytes => createHash('sha256').update(bytes).digest('hex').slice(0, 12);
const getMeta = (html, name) => {
  const attribute = name.startsWith('og:') ? 'property' : 'name';
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const value = html.match(new RegExp(`<meta ${attribute}="${escapedName}" content="([^"]*)">`))?.[1];
  assert.ok(value, `${name} metadata missing`);
  return value;
};

test('three featured projects precede the preserved original collection indexes', async () => {
  const html = body(await source('index.html'));
  assert.deepEqual(featuredWork.map(item => item.id), ['utility-inspection-etl', 'accessibility-analysis', 'interactive-maps-a-custom-js-app']);
  assert.deepEqual(featuredWork.map(item => item.role), ['Data engineering', 'Data science', 'Software engineering']);
  const selected = html.indexOf('id="selected-work"');
  const library = html.indexOf('id="projects"');
  assert.ok(selected >= 0 && library > selected);
  const featured = html.slice(selected, library);
  assert.equal((featured.match(/class="featured-card"/g) || []).length, 3);
  for (const item of featuredWork) {
    const project = projects.find(project => project.id === item.id);
    assert.ok(featured.includes(`href="./${item.id}/index.html"`));
    assert.ok(featured.includes(esc(item.role)));
    assert.ok(featured.includes(esc(project.summary)));
    assert.ok(featured.includes(esc(project.metric)));
  }
  assert.deepEqual(collections.map(item => item.id), ['spatial-and-data-analysis', 'ml-optimization', 'development-and-etl']);
  const originalIds = [
    ['spatial-analysis', 'arcgis-enterprise-and-online', 'qgis', 'code-enforcement-violations', 'crime-analysis'],
    ['income-level-prediction-using-r', 'building-footprint-extraction', 'traveling-salesman', 'water-conservation-routes'],
    ['python-and-notebooks', 'sql-and-javascript-and-r', 'modelbuilder-and-arcmap-tool-in-vbnet', 'interactive-maps-a-custom-js-app', 'interactive-maps-experience-builder']
  ];
  const libraryHtml = html.slice(library);
  for (let i = 0; i < collections.length; i++) {
    assert.deepEqual(collections[i].entries.map(([id]) => id), originalIds[i]);
    assert.ok(libraryHtml.includes(`<h2>${esc(collections[i].heading)}</h2>`));
    let previous = -1;
    for (const [id, title] of browseCollections[i].entries) {
      const position = libraryHtml.indexOf(`href="./${id}/index.html">${esc(title)}</a>`);
      assert.ok(position > previous, `${id} remains present and ordered in its collection`);
      previous = position;
    }
  }
});

test('homepage places exactly five selected skills between the introduction and actions', async () => {
  for (const path of ['index.html', 'dist/index.html']) {
    const html = body(await source(path));
    const intro = html.match(/<section\b[^>]*class="[^"]*\bhome-intro\b[^"]*"[^>]*>([\s\S]*?)<\/section>/)?.[1];
    assert.ok(intro, `${path}: homepage introduction is present`);
    const skillLists = [...intro.matchAll(/<ul\b[^>]*aria-label="Selected skills"[^>]*>([\s\S]*?)<\/ul>/g)];
    assert.equal(skillLists.length, 1, `${path}: one accessible selected-skills list`);
    const [skills] = skillLists;
    const keywords = [...skills[1].matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)].map(match => match[1].replace(/<[^>]+>/g, '').trim());
    assert.deepEqual(keywords, ['Python', 'SQL', 'Machine learning', 'ETL pipelines', 'Spatial Optimization']);
    const paragraphs = [...intro.matchAll(/<p\b[^>]*>[\s\S]*?<\/p>/g)];
    assert.ok(paragraphs.length >= 2, `${path}: specialty and introduction remain visible`);
    const lastParagraph = paragraphs.at(-1);
    assert.ok(lastParagraph.index + lastParagraph[0].length <= skills.index, `${path}: skills follow the introductory text`);
    const actions = intro.search(/<div\b[^>]*class="[^"]*\bhome-actions\b/);
    assert.ok(actions >= skills.index + skills[0].length, `${path}: skills precede homepage actions`);
  }
});

test('featured cards retain accessible three-step HTML flows with decorative SVG arrows', async () => {
  const attribute = (tag, name) => tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
  const expectedSteps = [['Records', 'Process', 'Publish'], ['Network', 'Score', 'Compare'], ['GIS data', 'Tools', 'Web map']];
  assert.deepEqual(featuredWork.map(item => item.steps), expectedSteps);
  assert.ok(featuredWork.every(item => !Object.hasOwn(item, 'image')));
  assert.ok(evidenceAssets.every(path => !/\/featured-[^/]+\.svg$/i.test(path)));
  const publishedEvidence = await readdir(new URL('../dist/assets/evidence/', import.meta.url));
  assert.ok(publishedEvidence.every(name => !/^featured-.*\.svg$/i.test(name)), 'Obsolete featured illustrations are absent from published assets');
  assert.equal(await source('index.html'), await source('dist/index.html'));
  for (const path of ['index.html', 'dist/index.html']) {
    const html = body(await source(path));
    assert.doesNotMatch(html, /<img\b/i, `${path}: homepage content has no illustration images`);
    const cards = [...html.matchAll(/<article\b[^>]*class="[^"]*\bfeatured-card\b[^"]*"[^>]*>([\s\S]*?)<\/article>/g)];
    assert.equal(cards.length, featuredWork.length);
    assert.equal((html.match(/<svg\b/g) || []).length, 9, `${path}: six workflow arrows and three case-study arrows`);
    assert.doesNotMatch(cards.reduce((remaining, card) => remaining.replace(card[0], ''), html), /<svg\b/i, `${path}: homepage SVGs are scoped to featured cards`);
    for (const [index, card] of cards.entries()) {
      const item = featuredWork[index];
      const project = projects.find(project => project.id === item.id);
      const icons = [...card[1].matchAll(/(<svg\b[^>]*>)([\s\S]*?)<\/svg>/g)];
      assert.equal(icons.length, 3, `${path}: ${item.id} has exactly three arrow icons`);
      for (const icon of icons) {
        assert.match(attribute(icon[1], 'class'), /^project-arrow(?: flow-arrow)?$/);
        assert.equal(attribute(icon[1], 'viewBox'), '0 0 24 24');
        assert.equal(attribute(icon[1], 'aria-hidden'), 'true');
        assert.equal(attribute(icon[1], 'focusable'), 'false');
        assert.equal(icon[2], '<path d="M4 12h16m-6-6 6 6-6 6"/>');
      }
      assert.doesNotMatch(card[1], /(?:→|&rarr;|&#8594;|&#x2192;)/i, `${path}: arrow rendering does not depend on a font glyph`);
      const flows = [...card[1].matchAll(/(<ol\b[^>]*class="[^"]*\bfeatured-flow\b[^"]*"[^>]*>)([\s\S]*?)<\/ol>/g)];
      assert.equal(flows.length, 1, `${path}: ${item.id} has one semantic workflow list`);
      const [flow] = flows;
      assert.equal(attribute(flow[1], 'aria-label'), `${item.role} workflow`);
      assert.notEqual(attribute(flow[1], 'aria-hidden'), 'true');
      const steps = [...flow[2].matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)];
      assert.equal(steps.length, 3);
      assert.deepEqual(steps.map(step => {
        const labels = [...step[1].matchAll(/<span\b[^>]*class="[^"]*\bflow-step\b[^"]*"[^>]*>([^<]+)<\/span>/g)];
        assert.equal(labels.length, 1, `${item.id}: each list item has one text step`);
        return labels[0][1].trim();
      }), expectedSteps[index]);
      const arrows = [...flow[2].matchAll(/<svg\b[^>]*class="project-arrow flow-arrow"[^>]*>[\s\S]*?<\/svg>/g)];
      assert.equal(arrows.length, 2, `${path}: ${item.id} has only two connecting arrows`);
      assert.deepEqual(steps.map(step => (step[1].match(/<svg\b/g) || []).length), [1, 1, 0], `${path}: connectors follow only the first two workflow steps`);
      const link = card[1].match(/(<a class="text-link"[^>]*>)([\s\S]*?)<\/a>/);
      assert.ok(link, `${path}: ${item.id} keeps its case-study link`);
      assert.equal(attribute(link[1], 'href'), `./${item.id}/index.html`);
      assert.ok(link[2].startsWith(`Read case study<span class="sr-only">: ${esc(project.title)}</span> `), `${path}: case-study label and accessible project name remain unchanged`);
      assert.equal((link[2].match(/<svg\b[^>]*class="project-arrow"[^>]*>/g) || []).length, 1, `${path}: case-study link has one decorative SVG arrow`);
    }
  }
});

test('case studies keep concise ownership and limits visible with technical details after galleries and examples', async () => {
  for (const project of siteProjects) {
    const html = body(await source(`${project.id}/index.html`));
    const hasStages = siteProjects.some(child => child.parentProjectId === project.id);
    const summaryIndex = html.indexOf(hasStages ? 'id="deep-learning-extraction"' : 'class="case-overview"');
    const details = [...html.matchAll(/<details\b([^>]*class="[^"]*\bproject-details\b[^"]*"[^>]*)>([\s\S]*?)<\/details>/g)];
    assert.equal(details.length, 1, `${project.id}: one optional technical-details disclosure`);
    const [technical] = details;
    assert.doesNotMatch(technical[1], /(?:^|\s)open(?:\s|=|$)/, `${project.id}: technical details start closed`);
    assert.ok(technical[2].startsWith('<summary>Technical details</summary>'));
    assert.doesNotMatch(technical[2], /class="project-gallery"|data-image-viewer|class="project-evidence"/, `${project.id}: screenshots and examples are not hidden in details`);
    const galleryIndex = html.indexOf('class="project-gallery"');
    const evidenceIndex = html.indexOf('class="project-evidence"');
    if (galleryIndex >= 0 && evidenceIndex >= 0) assert.ok(galleryIndex < evidenceIndex, `${project.id}: the gallery precedes optional examples`);
    for (const token of ['class="project-gallery"', 'class="embedded-app"', 'class="project-evidence"']) {
      const position = html.indexOf(token);
      assert.ok(position < 0 || position < technical.index, `${project.id}: ${token} precedes technical details`);
    }
    if (project.contribution) {
      assert.ok(summaryIndex >= 0, `${project.id}: concise overview remains present`);
      const summary = html.slice(summaryIndex, hasStages ? html.indexOf('<section class="project-gallery"', summaryIndex) : html.indexOf('</section>', summaryIndex));
      assert.doesNotMatch(summary, /<details\b|\shidden(?:\s|>|=)|class="case-context"|class="case-methods"/);
      for (const heading of ['What I did', 'Tools']) {
        const level = hasStages ? 3 : 2;
        assert.ok(summary.includes(`<h${level}>${heading}</h${level}>`), `${project.id}: ${heading} visible`);
      }
      assert.ok(summary.includes('<strong>Result:</strong>'));
      for (const value of [project.contribution, project.result, project.boundary, ...project.tools]) {
        assert.ok(summary.includes(esc(value)), `${project.id}: ownership, outcome, tools and limits are visible`);
      }
      for (const value of [project.problem, project.context, ...project.approach]) {
        assert.ok(technical[2].includes(esc(value)), `${project.id}: technical context and method remain accessible`);
      }
      for (const token of ['class="project-gallery"', 'class="embedded-app"', 'class="project-evidence"', 'class="project-details']) {
        const position = html.indexOf(token);
        assert.ok(position < 0 || summaryIndex < position, `${project.id}: summary precedes ${token}`);
      }
    } else {
      assert.equal(summaryIndex, -1, `${project.id}: historical gallery page avoids a duplicate overview`);
      assert.ok(technical[2].includes('These screenshots show earlier work. Full source files and datasets are not included.'));
    }
    assert.equal(await source(`${project.id}/index.html`), await source(`dist/${project.id}/index.html`));
  }
});

test('all three companion overviews, source readers and raw assets are published', async () => {
  assert.deepEqual(companions.map(item => item.id), ['spatial-etl', 'lead-pipe-synthetic', 'network-access']);
  const manifest = JSON.parse(await source('dist/build-manifest.json'));
  const published = new Set(manifest.pages);
  for (const companion of companions) {
    const route = `${companionRoute(companion.id)}/index.html`;
    assert.ok(published.has(route));
    const html = await source(route);
    assert.equal(html, await source(`dist/${route}`));
    assert.ok(html.includes(`python examples/${companion.id}/demo.py`));
    assert.ok(html.includes(`python -m unittest discover -s examples/${companion.id} -p test_demo.py -v`));
    assert.ok(html.includes(`href="../examples/${companion.id}/report.json"`));
    if (companion.id === 'spatial-etl') assert.ok(html.includes('href="../examples/spatial-etl/records.json"'));
    for (const name of ['README.md', 'demo.py', 'test_demo.py']) {
      const page = `${sourceRoute(companion.id, name)}/index.html`;
      assert.ok(published.has(page));
      assert.ok(html.includes(`href="../${page}"`));
      const reader = await source(page);
      assert.equal(reader, await source(`dist/${page}`));
      assert.ok(reader.includes(`href="../examples/${companion.id}/${name}"`));
      const displayed = reader.match(/<pre\b[^>]*><code>([\s\S]*?)<\/code><\/pre>/)?.[1];
      assert.equal(displayed, esc(await source(`examples/${companion.id}/${name}`)), `${name} must remain escaped and complete`);
    }
    for (const file of companionFiles(companion)) {
      assert.deepEqual(await source(file, null), await source(`dist/${file}`, null));
    }
    const parent = body(await source(`${companion.project}/index.html`));
    assert.equal(parent.includes(`href="../${route}"`), companion.project !== 'doctoral-research', `${companion.project}: only the doctoral page omits its companion CTA`);
    if (companion.project === 'doctoral-research') {
      assert.doesNotMatch(parent, /class="companion-callout"|class="project-evidence"/);
    } else {
      const callout = parent.match(/<div class="companion-callout">([\s\S]*?)<\/div>/)?.[1];
      assert.ok(callout);
      assert.ok(callout.includes(esc(companion.title)));
      assert.ok(callout.includes(esc(companion.summary)));
      assert.ok(callout.includes('Uses invented data; separate from this project.'));
      assert.ok(callout.includes(`href="../${route}">View example `));
      const heading = methodDiagrams[companion.project] ? 'Workflow and example' : 'Example';
      assert.ok(parent.includes(`<h2 id="evidence-heading">${heading}</h2>`));
    }
  }
  for (const asset of evidenceAssets) assert.deepEqual(await source(asset, null), await source(`dist/${asset}`, null));
});

test('companion disclosures, metrics, tables and limitations exactly reflect generated JSON reports', async () => {
  for (const companion of companions) {
    const report = JSON.parse(await source(`examples/${companion.id}/report.json`));
    const html = body(await source(`${companionRoute(companion.id)}/index.html`));
    assert.ok(report.disclosure.length > 20);
    assert.ok(html.includes(`<p class="evidence-note">${esc(report.disclosure)}</p>`));
    assert.ok(html.includes('not measurements of a client system or field accuracy'));
    assert.equal((html.match(/class="evidence-table"/g) || []).length, report.tables.length);
    for (const metric of report.metrics) {
      assert.ok(html.includes(`<dt>${esc(metric.label)}</dt><dd>${esc(metric.value)}</dd>`));
    }
    for (const table of report.tables) {
      assert.ok(html.includes(`<caption>${esc(table.heading)}</caption>`));
      assert.ok(html.includes(`<thead><tr>${table.headers.map(value => `<th scope="col">${esc(value)}</th>`).join('')}</tr></thead>`));
      assert.ok(html.includes(`<tbody>${table.rows.map(row => `<tr>${row.map(value => `<td>${esc(value)}</td>`).join('')}</tr>`).join('')}</tbody>`));
    }
    for (const note of report.notes) assert.ok(html.includes(`<li>${esc(note)}</li>`));
  }
});

test('evidence renderers escape source text, report values and figure attributes', () => {
  const hostile = '</code><script>alert("unsafe")</script><img src=x onerror=1> & \'quoted\'';
  const ui = { esc, layout: options => options.body, list: values => `<ul>${values.map(value => `<li>${esc(value)}</li>`).join('')}</ul>` };
  const renderedSource = sourcePage(companions[0], 'demo.py', hostile, ui);
  assert.ok(renderedSource.includes(`<code>${esc(hostile)}</code>`));
  assert.doesNotMatch(renderedSource, /<script\b|<img src=x/);
  const report = { title: hostile, disclosure: hostile, metrics: [{ label: hostile, value: hostile }], tables: [{ heading: hostile, headers: [hostile], rows: [[hostile]] }], notes: [hostile] };
  const renderedReport = companionPage(companions[0], report, ui);
  assert.ok(renderedReport.includes(`<td>${esc(hostile)}</td>`));
  assert.ok(renderedReport.includes(`<dt>${esc(hostile)}</dt><dd>${esc(hostile)}</dd>`));
  assert.doesNotMatch(renderedReport, /<script\b|<img src=x/);
  const renderedFigure = figure('assets/evidence/test.svg', hostile, hostile, esc);
  assert.ok(renderedFigure.includes(`alt="${esc(hostile)}"`));
  assert.ok(renderedFigure.includes(`<figcaption>${esc(hostile)}</figcaption>`));
  assert.doesNotMatch(renderedFigure, /<script\b/);
  const project = { contribution: hostile, result: hostile, boundary: hostile, context: hostile, problem: hostile, tools: [hostile], approach: [hostile] };
  const summary = caseSummary(project, { ...ui, chips: values => `<ul>${values.map(value => `<li>${esc(value)}</li>`).join('')}</ul>` });
  const details = caseDetails(project, ui);
  for (const html of [summary, details]) {
    assert.ok(html.includes(esc(hostile)));
    assert.doesNotMatch(html, /<script\b|<img src=x/);
  }
});

test('method and companion diagrams retain local SVG sources, meaningful alt and provenance', async () => {
  for (const [id, diagram] of Object.entries(methodDiagrams)) {
    const html = body(await source(`${id}/index.html`));
    assert.ok(html.includes(`src="../${diagram.src}" alt="${esc(diagram.title)}"`));
    assert.ok(html.includes(`<figcaption>${esc(diagram.caption)}</figcaption>`));
    assert.ok(html.includes(`href="../${diagram.src}"`));
  }
  for (const companion of companions) {
    const report = JSON.parse(await source(`examples/${companion.id}/report.json`));
    const html = body(await source(`${companionRoute(companion.id)}/index.html`));
    assert.ok(html.includes(`src="../${companion.diagram}" alt="${esc(report.title)}"`));
    assert.ok(html.includes(esc(companion.diagramCaption)));
  }
  for (const path of evidenceAssets.filter(path => path.endsWith('.svg'))) {
    const svg = await source(path);
    assert.match(svg, /<svg\b[^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    assert.match(svg, /<title\b[^>]*>[^<]+<\/title>/);
    assert.match(svg, /<desc\b[^>]*>[^<]+<\/desc>/);
    assert.doesNotMatch(svg, /<script\b|<foreignObject\b|\s(?:href|src)="https?:/i);
  }
});

test('method and companion SVGs retain plain styling without decorative effects or external assets', async () => {
  const diagrams = [...new Set([...Object.values(methodDiagrams).map(diagram => diagram.src), ...companions.map(companion => companion.diagram)])];
  for (const path of diagrams) {
    const svg = await source(path);
    assert.match(svg, /<title\b[^>]*>\s*[^<\s][^<]*<\/title>/);
    assert.match(svg, /<desc\b[^>]*>\s*[^<\s][^<]*<\/desc>/);
    assert.doesNotMatch(svg, /<(?:linearGradient|radialGradient|filter|feDropShadow|image|foreignObject|script)\b/i, `${path}: no decorative effects or embedded assets`);
    assert.doesNotMatch(svg, /\b(?:filter|box-shadow|text-shadow)\s*[:=]|@import|(?:linear|radial)-gradient\s*\(/i, `${path}: no CSS effects or imports`);
    for (const reference of svg.matchAll(/\b(?:href|src)\s*=\s*["']([^"']*)["']/gi)) {
      assert.match(reference[1], /^#[^\s]+$/, `${path}: references stay inside the same SVG`);
    }
    for (const reference of svg.matchAll(/\burl\(\s*([^)]*?)\s*\)/gi)) {
      assert.match(reference[1].replace(/^["']|["']$/g, ''), /^#[^\s]+$/, `${path}: URLs only reference internal SVG definitions`);
    }
  }
});

test('doctoral page keeps its own research summary and plain citation without teaching-example sections', async () => {
  const html = body(await source('doctoral-research/index.html'));
  const technical = html.match(/<details\b[^>]*class="[^"]*\bcase-details\b[^"]*"[^>]*>([\s\S]*?)<\/details>/)?.[1];
  assert.ok(technical);
  assert.ok(technical.includes('The University of Texas at Dallas, 2024'));
  assert.ok(technical.includes('Modeling Integer Programming To Multiple Target Access Problem.'));
  assert.doesNotMatch(html, /Why shared access matters|class="research-context"|class="companion-callout"|class="project-evidence"|example-network-access/);
  assert.doesNotMatch(html, /version-pinned public research source|No journal publication, DOI, or dissertation benchmark is claimed here\./);
  assert.doesNotMatch(html, /(?:doi\.org\/|doi:\s*10\.|10\.\d{4,9}\/)/i);
  assert.equal(projectEvidence(siteProjects.find(project => project.id === 'doctoral-research'), { esc }), '');
  const companion = JSON.parse(await source('examples/network-access/report.json'));
  assert.match(companion.disclosure, /(?:synthetic|invented|educational|toy)/i);
});

test('doctoral page omits research resource links while preserving navigation, gallery viewing and other project links', async () => {
  const project = siteProjects.find(project => project.id === 'doctoral-research');
  assert.deepEqual(project.links, []);
  const galleryLinks = new Set(project.gallery.map(image => `../${image.src}`));
  assert.ok(galleryLinks.size > 0, 'Doctoral gallery remains available');
  const navigationLinks = new Set(['../index.html#projects', ...(project.collection ? [`../${project.collection.id}/index.html`] : [])]);
  for (const path of ['doctoral-research/index.html', 'dist/doctoral-research/index.html']) {
    const html = await source(path);
    const content = body(html);
    assert.doesNotMatch(content, /class="project-links"|href="https?:\/\/|href="[^"#]*example-network-access/);
    assert.doesNotMatch(content, /class="companion-callout"|Uses invented data; separate from this project\./, `${path}: doctoral content omits the teaching-example callout`);
    const foundGalleryLinks = new Set();
    for (const anchor of content.matchAll(/<a\b([^>]*)href="([^"]+)"([^>]*)>/g)) {
      if (/\bdata-image-viewer\b/.test(anchor[1] + anchor[3])) {
        assert.ok(galleryLinks.has(anchor[2]), `${path}: image links point only to the existing doctoral gallery`);
        foundGalleryLinks.add(anchor[2]);
      } else {
        assert.ok(navigationLinks.has(anchor[2]), `${path}: non-image links are limited to breadcrumb and back navigation`);
      }
    }
    assert.deepEqual(foundGalleryLinks, galleryLinks, `${path}: all doctoral images remain openable`);
    assert.match(content, /<nav class="breadcrumbs"[^>]*>[\s\S]*?<a href="\.\.\/index\.html#projects">Projects<\/a>/);
    assert.match(content, /<p class="back-link"><a href="\.\.\/index\.html#projects">/);
    assert.match(html, /<nav id="site-nav"[^>]*aria-label="Main navigation"/);
    assert.ok(html.includes('href="../contact/index.html"'));
    assert.ok(html.includes('data-viewer-close'));
    assert.ok(html.includes('data-zoom-in'));
  }
  assert.equal(await source('doctoral-research/index.html'), await source('dist/doctoral-research/index.html'));
  for (const other of siteProjects.filter(other => other.id !== project.id)) {
    const html = body(await source(`${other.id}/index.html`));
    for (const link of other.links || []) {
      assert.ok(html.includes(`href="${esc(link.url)}"`), `${other.id}: unrelated project link remains present`);
    }
  }
});

async function assertSocialMetadata(html, cover, origin) {
  const path = `assets/social/${cover}.png`;
  const bytes = await source(path, null);
  const expected = `${origin}/${path}?v=${hash(bytes)}`;
  assert.equal(getMeta(html, 'og:image'), expected);
  assert.equal(getMeta(html, 'twitter:image'), expected);
  assert.equal(getMeta(html, 'twitter:card'), 'summary_large_image');
  assert.equal(getMeta(html, 'og:image:width'), '1200');
  assert.equal(getMeta(html, 'og:image:height'), '630');
  assert.equal(getMeta(html, 'og:image:type'), 'image/png');
  assert.ok(getMeta(html, 'og:image:alt').length > 10);
  assert.equal(getMeta(html, 'twitter:image:alt'), getMeta(html, 'og:image:alt'));
  assert.equal(new URL(getMeta(html, 'og:image')).origin, origin);
}

test('each site project has its own absolute, hash-versioned sharing image', async () => {
  const { origin } = JSON.parse(await source('dist/build-manifest.json'));
  assert.match(origin, /^https?:\/\//);
  assert.equal(socialCards.length, siteProjects.length + 1);
  assert.equal(new Set(socialCards.map(card => card.Name)).size, socialCards.length);
  for (const project of siteProjects) {
    const html = await source(`${project.id}/index.html`);
    await assertSocialMetadata(html, project.id, origin);
    assert.equal(html, await source(`dist/${project.id}/index.html`));
  }
});

test('non-project pages use the generic card and companions inherit their parent project card', async () => {
  const { origin } = JSON.parse(await source('dist/build-manifest.json'));
  const generic = ['index.html', 'about/index.html', 'resume/index.html', 'contact/index.html', 'privacy/index.html', 'additional-projects/index.html', '404.html', ...browseCollections.map(collection => `${collection.id}/index.html`)];
  for (const path of generic) await assertSocialMetadata(await source(path), 'portfolio', origin);
  for (const companion of companions) {
    for (const route of [companionRoute(companion.id), ...['README.md', 'demo.py', 'test_demo.py'].map(name => sourceRoute(companion.id, name))]) {
      await assertSocialMetadata(await source(`${route}/index.html`), companion.project, origin);
    }
  }
});

test('published social files have a valid PNG signature and 1200 by 630 IHDR dimensions', async () => {
  for (const card of socialCards) {
    const path = `assets/social/${card.Name}.png`;
    const bytes = await source(path, null);
    assert.ok(bytes.length > 1000, `${card.Name} has nonempty visual content`);
    assert.deepEqual(bytes.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    assert.equal(bytes.toString('ascii', 12, 16), 'IHDR');
    assert.equal(bytes.readUInt32BE(16), 1200);
    assert.equal(bytes.readUInt32BE(20), 630);
    assert.deepEqual(bytes, await source(`dist/${path}`, null));
  }
});

test('actual build layout derives sharing URLs from SITE_URL instead of hardcoding a deployment', async () => {
  const build = await source('scripts/build.mjs');
  const originStatement = build.match(/^const origin = new URL\(process\.env\.SITE_URL[^\n]+/m)?.[0];
  assert.ok(originStatement, 'The configured SITE_URL determines the build origin');
  const start = build.indexOf('function layout(');
  const end = build.indexOf('\nfunction gallery(', start);
  assert.ok(start >= 0 && end > start);
  const context = {
    URL, process: { env: { SITE_URL: 'https://preview.example.test/nested?ignored=1' } }, esc,
    socialAssets: ['assets/social/portfolio.png', 'assets/social/doctoral-research.png'],
    socialVersions: { 'assets/social/portfolio.png': '0123456789ab', 'assets/social/doctoral-research.png': 'abcdef012345' },
    assetVersions: { 'theme.js': 'a', 'styles.css': 'b', 'script.js': 'c' },
    browseCollections: [], additionalProjects: [], year: 2026,
    profile: { name: 'Esad Kopru', github: 'https://github.com/efkopru' }, errorPageBaseScript: ''
  };
  runInNewContext(`${originStatement}\n${build.slice(start, end)}\nglobalThis.html = layout({ title: 'Research', description: 'Test', route: 'doctoral-research', body: '' });`, context, { timeout: 1000 });
  assert.equal(getMeta(context.html, 'og:image'), 'https://preview.example.test/assets/social/doctoral-research.png?v=abcdef012345');
  assert.equal(getMeta(context.html, 'og:url'), 'https://preview.example.test/doctoral-research/');
  assert.equal(getMeta(context.html, 'twitter:image'), getMeta(context.html, 'og:image'));
});
