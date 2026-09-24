import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { caseEvidence, relatedCases } from '../scripts/case-evidence.mjs';
import { projects } from '../content/portfolio.mjs';
import { caseEvidenceAssets, evidenceAssets } from '../content/evidence.mjs';

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

test('Building Footprint Extraction preserves the full imagery workflow, evidence and scope', async () => {
  const child = projects.find(project => project.id === 'nearmap-imagery-pipeline');
  const parent = projects.find(project => project.id === 'building-footprint-extraction');
  for (const directory of ['', 'dist/']) {
    const html = await readFile(new URL(`../${directory}${parent.id}/index.html`, import.meta.url), 'utf8');
    const startTag = `<section class="project-part" id="part-${child.id}" aria-labelledby="${child.id}-heading">`;
    const start = html.indexOf(startTag);
    assert.ok(start >= 0, `${directory}: the imagery case has a named section inside the parent page`);
    let depth = 0;
    let end = -1;
    for (const match of html.slice(start).matchAll(/<\/?section\b[^>]*>/g)) {
      depth += match[0].startsWith('</') ? -1 : 1;
      if (depth === 0) { end = start + match.index + match[0].length; break; }
    }
    assert.ok(end > start, 'The grouped section is well formed');
    const grouped = html.slice(start, end);
    const visible = grouped.replace(/<details\b[^>]*>[\s\S]*?<\/details>/g, '');
    assert.ok(visible.includes(`<h2 id="${child.id}-heading">${esc(child.title)}</h2>`));
    for (const text of [child.summary, child.contribution, child.result, child.boundary, ...child.tools]) {
      assert.ok(visible.includes(esc(text)), `${directory}: grouped overview preserves ${text}`);
    }
    for (const [index, section] of child.evidenceSections.entries()) {
      const headingId = `${child.id}-evidence-${index + 1}`;
      assert.ok(visible.includes(`aria-labelledby="${headingId}"`));
      assert.ok(visible.includes(`<h3 id="${headingId}">${esc(section.heading)}</h3>`));
      for (const text of [...(section.paragraphs || []), ...(section.bullets || [])]) assert.ok(visible.includes(esc(text)), `${directory}: complete visible imagery evidence`);
      if (section.table) {
        for (const text of [section.table.caption, ...section.table.headers, ...section.table.rows.flat()]) assert.ok(visible.includes(esc(text)), `${directory}: complete archived-results table`);
      }
      if (section.diagram) {
        assert.ok(visible.includes(`src="../${section.diagram.src}"`));
        assert.ok(visible.includes(`alt="${esc(section.diagram.title)}"`));
        assert.ok(visible.includes(esc(section.diagram.caption)));
      }
    }
    const details = grouped.match(/<details class="project-part-details">([^]*?)<\/details>/)?.[1];
    assert.ok(details?.includes('<summary>Imagery workflow details</summary>'));
    for (const text of [child.context, child.problem, ...child.approach]) assert.ok(details.includes(esc(text)), `${directory}: complete imagery technical details`);
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
