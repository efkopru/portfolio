import test from 'node:test';
import assert from 'node:assert/strict';
import { projects, profile } from '../content/portfolio.mjs';

test('professional outcomes retain their evidence qualifications and ownership', () => {
  const utility = projects.find(p => p.id === 'utility-inspection-etl');
  assert.match(utility.context, /Independent consulting/);
  assert.match(utility.result, /automated pipeline completed 30\+ monthly/);
  const lead = projects.find(p => p.id === 'lead-service-line-ocr');
  assert.match(lead.result, /potential lead-pipe-free/);
  assert.match(lead.result, /estimated savings/);
  assert.match(lead.result, /team.*finalist/);
  assert.match(lead.boundary, /synthetic ML prototype.*not evidence/);
});
test('all forecast demos disclose synthetic or simulated evaluation', () => {
  for (const id of ['s2s-transformer-bias-correction', 'dask-ensemble-calibration', 'vit-heatwave-calibration', 'transformer-bias-correction']) {
    const project = projects.find(p => p.id === id);
    assert.match(project.type, /Synthetic/);
    assert.match(project.boundary, /synthetic|simulated/i);
  }
});
test('recruiting paths have relevant substantive work', () => {
  for (const role of profile.roles) assert.ok(projects.filter(p => p.roles.includes(role.id)).length >= 3);
});
