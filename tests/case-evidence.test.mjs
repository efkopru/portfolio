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
