import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { caseEvidence, relatedCases } from '../scripts/case-evidence.mjs';
import { projects } from '../content/portfolio.mjs';
import { utilityInspectionUpdate } from '../content/inspection-cases.mjs';
import { caseEvidenceAssets, evidenceAssets, methodDiagrams } from '../content/evidence.mjs';

const esc = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const ui = { esc };

test('structured evidence escapes all text and provides accessible table associations', () => {
  const text = '<img src=x onerror="alert(1)"> & evidence';
  const project = { id: 'fixture', evidenceSections: [{ heading: text, paragraphs: [text], bullets: [text], table: { caption: text, headers: [text, 'Value'], rows: [[text, text]] }, diagram: { src: 'assets/evidence/fixture.svg', title: text, caption: text } }] };
  const html = caseEvidence(project, ui);
  assert.doesNotMatch(html, /<img src=x/);
  assert.ok(html.includes(`<th scope="row">${esc(text)}</th>`));
  assert.ok(html.includes(`<th scope="col">${esc(text)}</th>`));
  assert.ok(html.includes(`<caption>${esc(text)}</caption>`));
  assert.ok(html.includes(`aria-label="${esc(text)}"`));
  assert.match(html, /class="table-scroll" tabindex="0" role="region"/);
  assert.match(html, /class="diagram-scroll" tabindex="0" role="region"/);
  assert.match(html, /<\/div><figcaption>/, 'Diagram captions stay outside the horizontally scrolling image region');
  assert.match(html, /<section[^>]*aria-labelledby="case-evidence-1"><h2 id="case-evidence-1">/);
});

test('evidence rendering rejects unsafe paths, malformed tables and unknown related routes', () => {
  for (const src of ['https://example.com/map.svg', '../private.svg', 'assets/evidence/../../private.svg', 'assets/evidence/map.png']) {
    assert.throws(() => caseEvidence({ id: 'fixture', evidenceSections: [{ heading: 'Method', diagram: { src, title: 'Diagram', caption: 'Caption' } }] }, ui), /local SVG/);
  }
  assert.throws(() => caseEvidence({ id: 'fixture', evidenceSections: [{ heading: 'Results', table: { caption: 'Results', headers: ['A'], rows: [['A', 'B']] } }] }, ui), /consistent columns/);
  assert.throws(() => relatedCases({ id: 'fixture', relatedProjects: ['missing'] }, projects, ui), /unknown related project/);
  assert.equal(caseEvidence({ id: 'fixture' }, ui), '');
  assert.equal(relatedCases({ id: 'fixture' }, projects, ui), '');
});

test('nested evidence supports accessible h3 headings and distinct safe ID prefixes', () => {
  const project = { id: 'fixture', evidenceSections: [{ heading: 'First section', paragraphs: ['Evidence one.'] }, { heading: 'Second section', paragraphs: ['Evidence two.'] }] };
  const defaultHtml = caseEvidence(project, ui);
  assert.equal(defaultHtml, caseEvidence(project, { ...ui, headingLevel: 2, idPrefix: 'case-evidence' }));
  const nestedHtml = caseEvidence(project, { ...ui, headingLevel: 3, idPrefix: 'nearmap-imagery-pipeline-evidence' });
  for (const [index, section] of project.evidenceSections.entries()) {
    const id = `nearmap-imagery-pipeline-evidence-${index + 1}`;
    assert.ok(nestedHtml.includes(`<section class="case-evidence" aria-labelledby="${id}"><h3 id="${id}">${section.heading}</h3>`));
    assert.ok(nestedHtml.includes(`<p>${section.paragraphs[0]}</p>`));
  }
  assert.doesNotMatch(nestedHtml, /<h2\b|id="case-evidence-/);
  for (const headingLevel of [1, 4, 0, '3', '3 onclick="alert(1)"', null]) {
    assert.throws(() => caseEvidence(project, { ...ui, headingLevel }), `Reject heading level ${headingLevel}`);
  }
  for (const idPrefix of ['', 'has spaces', '../evidence', 'evidence" onclick="alert(1)', null]) {
    assert.throws(() => caseEvidence(project, { ...ui, idPrefix }), `Reject unsafe ID prefix ${idPrefix}`);
  }
});

test('Building Footprint Extraction shows preprocessing before extraction and preserves complete run records', async () => {
  const child = projects.find(project => project.id === 'nearmap-imagery-pipeline');
  const parent = projects.find(project => project.id === 'building-footprint-extraction');
  for (const directory of ['', 'dist/']) {
    const html = await readFile(new URL(`../${directory}${parent.id}/index.html`, import.meta.url), 'utf8');
    const startTag = `<section class="project-stage" id="part-${child.id}" aria-labelledby="preprocessing-heading">`;
    const start = html.indexOf(startTag);
    assert.ok(start >= 0, `${directory}: preprocessing has a named stage inside the parent page`);
    let depth = 0;
    let end = -1;
    for (const match of html.slice(start).matchAll(/<\/?section\b[^>]*>/g)) {
      depth += match[0].startsWith('</') ? -1 : 1;
      if (depth === 0) { end = start + match.index + match[0].length; break; }
    }
    assert.ok(end > start, 'The grouped section is well formed');
    const grouped = html.slice(start, end);
    const visible = grouped.replace(/<details\b[^>]*>[\s\S]*?<\/details>/g, '');
    assert.ok(visible.includes('<h2 id="preprocessing-heading">1. Imagery preprocessing</h2>'));
    assert.match(visible, /<(?:ol|ul)\b[^>]*>[\s\S]*?<li\b/, `${directory}: preprocessing has readable steps`);
    assert.match(visible, /mosaic/i, `${directory}: preprocessing identifies its raster output`);
    assert.match(visible, /deep.learning/i, `${directory}: preprocessing explains its connection to extraction`);
    assert.doesNotMatch(visible, /class="project-gallery"|data-image-viewer/, 'Extraction results do not appear before preprocessing is explained');
    assert.ok(visible.includes('<strong>Output:</strong> Prepared raster imagery for the deep-learning stage.'));
    assert.ok(visible.includes('<strong>Coverage result:</strong> The final archived check accounted for all 120,426 expected tiles, with zero unresolved tiles.'));
    for (const text of [child.boundary, ...child.tools.filter(tool => tool !== 'Deep learning')]) {
      assert.ok(visible.includes(esc(text)), `${directory}: preprocessing overview preserves ${text}`);
    }
    const details = grouped.match(/<details class="project-stage-details">([^]*?)<\/details>/)?.[1];
    assert.ok(details?.includes('<summary>Preprocessing workflow and run records</summary>'));
    for (const text of [child.title, child.summary, child.contribution, child.result, child.context, child.problem, ...child.approach, ...child.tools]) assert.ok(details.includes(esc(text)), `${directory}: complete imagery context and method remain accessible`);
    for (const [index, section] of child.evidenceSections.entries()) {
      const headingId = `${child.id}-evidence-${index + 1}`;
      assert.ok(details.includes(`aria-labelledby="${headingId}"`));
      assert.ok(details.includes(`<h3 id="${headingId}">${esc(section.heading)}</h3>`));
      for (const text of [...(section.paragraphs || []), ...(section.bullets || [])]) assert.ok(details.includes(esc(text)), `${directory}: complete imagery evidence remains accessible`);
      if (section.table) {
        for (const text of [section.table.caption, ...section.table.headers, ...section.table.rows.flat()]) assert.ok(details.includes(esc(text)), `${directory}: complete archived-results table`);
      }
      if (section.diagram) {
        assert.ok(details.includes(`src="../${section.diagram.src}"`));
        assert.ok(details.includes(`alt="${esc(section.diagram.title)}"`));
        assert.ok(details.includes(esc(section.diagram.caption)));
      }
    }
    const extractionStart = html.indexOf('<section class="project-stage" id="deep-learning-extraction"');
    assert.ok(extractionStart >= end, `${directory}: extraction follows preprocessing`);
    assert.ok(html.indexOf('class="project-gallery"') > extractionStart, `${directory}: gallery belongs to the extraction stage`);
    assert.match(html.slice(extractionStart), /<h2\b[^>]*>2\. Deep-learning extraction<\/h2>/);
    assert.ok(html.includes('<h3 id="screenshots-heading">Project gallery</h3>'), 'The extraction gallery has a nested heading');
    assert.ok(html.includes(esc(parent.contribution)), 'Keep the original extraction work');
    assert.ok(html.includes(esc(parent.boundary)), 'Keep the pretrained-model scope limitation');
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(new Set(ids).size, ids.length, `${directory}: grouped evidence IDs are unique`);
  }
});

test('all five case expansions publish visible evidence and only allowlisted local assets', async () => {
  for (const id of ['nearmap-imagery-pipeline', 'ground-patrol-analytics', 'parcel-data-integration', 'utility-inspection-etl', 'doctoral-research']) {
    const project = projects.find(item => item.id === id);
    assert.ok(project.evidenceSections.length >= 2, `${id}: substantial evidence`);
    const html = await readFile(new URL(`../dist/${id}/index.html`, import.meta.url), 'utf8');
    const visible = html.replace(/<details\b[^>]*>[\s\S]*?<\/details>/g, '');
    for (const section of project.evidenceSections) {
      assert.ok(visible.includes(esc(section.heading)), `${id}: evidence headings stay visible`);
      for (const text of section.paragraphs || []) assert.ok(visible.includes(esc(text)), `${id}: evidence scope stays visible`);
      if (section.diagram) assert.ok(evidenceAssets.includes(section.diagram.src));
    }
    for (const target of project.relatedProjects || []) assert.ok(html.includes(`href="../${target}/index.html"`));
  }
  for (const src of caseEvidenceAssets) {
    assert.match(src, /^assets\/evidence\/[a-z0-9-]+\.svg$/);
    const original = await readFile(new URL(`../${src}`, import.meta.url));
    const published = await readFile(new URL(`../dist/${src}`, import.meta.url));
    assert.deepEqual(published, original);
  }
});

test('utility case explains the inspected workflow while preserving its established ownership and results', () => {
  const project = projects.find(item => item.id === 'utility-inspection-etl');
  for (const field of ['contribution', 'result', 'metric', 'metricLabel', 'context']) {
    assert.equal(Object.hasOwn(utilityInspectionUpdate, field), false, `The source audit does not replace established ${field}`);
  }
  assert.equal(project.metric, '80%');
  assert.match(project.metricLabel, /less.*processing time per run/i);
  assert.match(project.result, /30\+ scheduled monthly runs/);
  assert.match(project.result, /two hours of manual work per run/);
  assert.match(project.result, /80% less processing time per run/);
  assert.match(project.contribution, /I built and maintained the pipeline/);
  assert.match(project.context, /Independent consulting/);

  const headings = ['How the flight-track workflow works', 'How updates are handled', 'Outputs and scope'];
  assert.deepEqual(project.evidenceSections.map(section => section.heading), headings);
  const sectionText = section => [
    ...(section.paragraphs || []), ...(section.bullets || []),
    ...(section.table?.headers || []), ...(section.table?.rows.flat() || [])
  ].join(' ');
  const updates = sectionText(project.evidenceSections[1]);
  assert.match(updates, /timestamp|time[- ]based|stored (?:date|time)|last[^.]*?(?:date|time)/i, 'Explain the selection of new flight records');
  assert.match(updates, /local/i, 'Identify the local processing stage');
  assert.match(updates, /enterprise/i, 'Identify the enterprise update stage');
  assert.match(updates, /field[^.]*map|map[^.]*field/i, 'Explain explicit field mapping');
  assert.match(updates, /stag/i, 'Explain staging before enterprise delivery');
  assert.match(updates, /log/i, 'Describe stage-level processing logs');
  const outputs = sectionText(project.evidenceSections[2]);
  for (const concept of [/flight[- ]lines?/i, /candidate|potential/i, /work[- ]orders?/i, /priorit/i, /Portal/]) {
    assert.match(outputs, concept, `Keep output scope explicit: ${concept}`);
  }
  assert.match(project.boundary, /proximity|nearby|coverage/i);
  assert.match(project.boundary, /does not[^.]*?(?:verif|confirm)/i, 'Do not present flight proximity as a confirmed inspection');
});

test('utility workflow diagram appears once near the beginning and before the separate invented-data example', async () => {
  const project = projects.find(item => item.id === 'utility-inspection-etl');
  const diagram = project.evidenceSections[0].diagram;
  assert.equal(diagram.src, 'assets/evidence/utility-data-flow.svg');
  assert.equal(diagram.zoomable, true, 'Keep full-size viewing when promoting the workflow');
  const version = createHash('sha256').update(await readFile(new URL(`../${diagram.src}`, import.meta.url))).digest('hex').slice(0, 12);
  const diagramUrl = `../${diagram.src}?v=${version}`;
  assert.equal(Object.hasOwn(methodDiagrams, project.id), false, 'Do not repeat the workflow in the lower evidence callout');
  assert.ok(caseEvidenceAssets.includes(diagram.src));
  assert.equal(evidenceAssets.filter(path => path === diagram.src).length, 1, 'Only one allowlisted copy of the diagram is published');
  const original = await readFile(new URL(`../${project.id}/index.html`, import.meta.url), 'utf8');
  const published = await readFile(new URL(`../dist/${project.id}/index.html`, import.meta.url), 'utf8');
  assert.equal(original, published, 'File-based preview and deployment have identical content');
  for (const [label, html] of [['root', original], ['dist', published]]) {
    const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1];
    assert.ok(main, `${label}: main content exists`);
    const visible = main.replace(/<details\b[^>]*>[\s\S]*?<\/details>/g, '');
    const image = `src="${diagramUrl}"`;
    assert.equal(visible.split(image).length - 1, 1, `${label}: one visible workflow image`);
    assert.ok(visible.includes(`<a data-image-viewer href="${diagramUrl}"`), `${label}: thumbnail and viewer both use the current content hash`);
    for (const control of ['data-viewer-close', 'data-zoom-in', 'data-zoom-out', 'data-zoom-reset']) assert.ok(html.includes(control));
    const workflow = visible.indexOf(esc(project.evidenceSections[0].heading));
    const imagePosition = visible.indexOf(image);
    const updates = visible.indexOf(esc(project.evidenceSections[1].heading));
    const example = visible.indexOf('class="companion-callout"');
    assert.ok(workflow >= 0 && workflow < imagePosition && imagePosition < updates && updates < example, `${label}: workflow comes before update details and the teaching example`);
    assert.ok(visible.includes(esc(project.result)), `${label}: established results remain visible`);
    assert.ok(visible.includes(esc(project.boundary)), `${label}: coverage limitation remains visible`);
    const callout = visible.match(/<div class="companion-callout">([\s\S]*?)<\/div>/)?.[1];
    assert.ok(callout);
    assert.match(callout, /invented data/i, `${label}: the teaching example remains separate from the client implementation`);
    assert.ok(callout.includes('href="../example-spatial-etl/index.html"'));
    assert.doesNotMatch(main, /(?:[a-z]:\\|file:\/\/|\\\\[^\s<]+\\|_single_source|\.(?:sde|gdb)\b|\b(?:password|api[_-]?key|access[_-]?token)\s*[:=])/i, `${label}: operational paths and credential assignments are not published`);
  }
});

test('utility diagram uses four plain stages without a full-canvas background or private operational material', async () => {
  const path = 'assets/evidence/utility-data-flow.svg';
  const original = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');
  assert.equal(original, await readFile(new URL(`../dist/${path}`, import.meta.url), 'utf8'));
  for (const label of ['Collect records', 'Build flight lines', 'Match nearby assets', 'Update GIS']) {
    assert.ok(original.includes(label), `The workflow stage is plainly labeled: ${label}`);
  }
  assert.match(original, /350[- ](?:foot|feet)/i);
  assert.match(original, /candidate|potential/i);
  assert.match(original, /does not[^<.]*?(?:verif|confirm)/i);
  const root = original.match(/<svg\b[^>]*>/)?.[0];
  assert.ok(root);
  const viewBox = root.match(/\bviewBox="([^"]+)"/)?.[1].trim().split(/\s+/).map(Number);
  assert.equal(viewBox?.length, 4);
  const attr = (tag, name) => tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
  for (const rect of original.matchAll(/<rect\b[^>]*>/g)) {
    const x = Number(attr(rect[0], 'x') || 0);
    const y = Number(attr(rect[0], 'y') || 0);
    const width = attr(rect[0], 'width');
    const height = attr(rect[0], 'height');
    const spansCanvas = x === viewBox[0] && y === viewBox[1]
      && (width === '100%' || Number(width) >= viewBox[2])
      && (height === '100%' || Number(height) >= viewBox[3]);
    assert.equal(spansCanvas, false, 'Do not restore a full-canvas white background around the diagram');
  }
  assert.doesNotMatch(original, /<(?:script|foreignObject|image|linearGradient|radialGradient|filter)\b|(?:[a-z]:\\|file:\/\/|_single_source|\.(?:sde|gdb)\b)/i);
});

test('zoomable case diagrams escape viewer attributes and keep existing diagrams unchanged', () => {
  const text = '<label> " &';
  const diagram = { src: 'assets/evidence/fixture.svg', title: text, caption: text };
  const render = value => caseEvidence({ id: 'fixture', evidenceSections: [{ heading: 'Workflow', diagram: value }] }, ui);
  assert.doesNotMatch(render(diagram), /data-image-viewer/);
  const zoomable = render({ ...diagram, zoomable: true });
  assert.ok(zoomable.includes('data-image-viewer href="../assets/evidence/fixture.svg"'));
  assert.ok(zoomable.includes(`data-caption="${esc(text)}"`));
  assert.ok(zoomable.includes(`aria-label="Open diagram: ${esc(text)}"`));
  assert.match(zoomable, /<div class="diagram-scroll"[^>]*><a [^>]+><img [^>]+><\/a><\/div>/);
});
