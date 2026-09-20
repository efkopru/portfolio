import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { projects, profile } from '../content/portfolio.mjs';

const esc = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const visibleContent = async id => {
  const html = await readFile(new URL(`../dist/${id}/index.html`, import.meta.url), 'utf8');
  return (html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1] || '').replace(/<details\b[^>]*>[\s\S]*?<\/details>/g, '');
};

test('professional outcomes retain their evidence qualifications and ownership', async () => {
  const utility = projects.find(p => p.id === 'utility-inspection-etl');
  assert.match(utility.context, /Independent consulting/);
  assert.match(utility.result, /automated pipeline completed 30\+ scheduled monthly runs/);
  assert.doesNotMatch(utility.result, /30\+ (?:times|runs) per month/, 'Scheduled monthly runs must not be inflated to 30 runs each month');
  assert.match(utility.result, /80% less processing time per run/);
  const lead = projects.find(p => p.id === 'lead-service-line-ocr');
  assert.match(lead.result, /potential lead-pipe-free/);
  assert.match(lead.result, /estimated savings/);
  assert.match(lead.result, /team.*finalist/);
  assert.match(lead.result, /broader City effort/);
  assert.match(lead.boundary, /synthetic ML prototype does not show historical accuracy or realized savings/);
  const accessibility = projects.find(p => p.id === 'accessibility-analysis');
  assert.match(accessibility.result, /supported a \$750K federal award/);
  assert.match(accessibility.metricLabel, /federal award supported by the analysis/);
  const enterprise = projects.find(p => p.id === 'arcgis-enterprise-and-online');
  assert.match(enterprise.boundary, /\$100K figure is not an annual savings claim/);
  const footprints = projects.find(p => p.id === 'building-footprint-extraction');
  assert.match(footprints.contribution, /ESRI.*pretrained model/);
  assert.match(footprints.boundary, /uses a pretrained model/);
  assert.match(footprints.boundary, /does not measure accuracy across a wider dataset/);
  for (const project of [utility, lead, accessibility, enterprise, footprints]) {
    const visible = await visibleContent(project.id);
    assert.ok(visible.includes(esc(project.result)), `${project.id}: qualified results remain visible without opening technical details`);
    assert.ok(visible.includes(esc(project.boundary)), `${project.id}: limits are not hidden in technical details`);
  }
});
test('all forecast demos visibly disclose synthetic or simulated evaluation and its limits', async () => {
  for (const id of ['s2s-transformer-bias-correction', 'dask-ensemble-calibration', 'vit-heatwave-calibration', 'transformer-bias-correction']) {
    const project = projects.find(p => p.id === id);
    assert.match(project.type, /Synthetic/);
    assert.match(project.summary + project.result, /synthetic|simulated/i);
    assert.match(project.boundary, /(?:not|do not)/i);
    const visible = await visibleContent(id);
    assert.match(visible, /synthetic|simulated/i);
    assert.ok(visible.includes(esc(project.boundary)), `${id}: evaluation limits stay visible`);
  }
});
test('lead prediction prototype remains separate from a deployed utility model and historical savings', async () => {
  const project = projects.find(p => p.id === 'lead-service-review-prototype');
  assert.match(project.boundary, /local synthetic-data prototype, not a deployed utility model/);
  assert.match(project.boundary, /historical \$1M\+ estimated savings came from separate work/);
  assert.match(project.approach.join(' '), /Match records and prepare data snapshots separately from the training command/);
  assert.ok((await visibleContent(project.id)).includes(esc(project.boundary)));
});
test('recruiting paths have relevant substantive work', () => {
  for (const role of profile.roles) assert.ok(projects.filter(p => p.roles.includes(role.id)).length >= 3);
});

test('V3 workbench keeps synthetic scope and review boundaries visible without transferring historical outcomes', async () => {
  const project = projects.find(p => p.id === 'lead-service-line-evidence-workbench');
  assert.match(project.type, /Synthetic/);
  assert.match(project.context, /Version 3/);
  const visible = await visibleContent(project.id);
  assert.ok(visible.includes(esc(project.boundary)));
  assert.match(visible, /published data and demonstration are synthetic/i);
  assert.match(visible, /not a deployed utility system/);
  assert.doesNotMatch(visible, /\$\d|TCEQ|1,000\+|1M\+/);
  assert.doesNotMatch(visible, /href="https:\/\/github\.com\/efkopru\/lead-service-line-ml-gpt-v3/);
  assert.ok(projects.some(p => p.id === 'lead-service-review-prototype'), 'The earlier prototype remains distinct');
});
