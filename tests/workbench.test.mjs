import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, copyFile, writeFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { workbenchDemo, workbenchAssets, evidenceAssets } from '../content/evidence.mjs';
import screenshots from '../content/screenshots.json' with { type: 'json' };

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('public V3 demo retains the reviewed synthetic dataset and avoids inline executable code', async () => {
  for (const path of workbenchAssets) {
    assert.ok(evidenceAssets.includes(path));
    assert.equal(await read(path), await read(`dist/${path}`), `${path}: source and published asset agree`);
  }
  const html = await read(`${workbenchDemo.directory}/index.html`);
  const js = await read(`${workbenchDemo.directory}/review.js`);
  const css = await read(`${workbenchDemo.directory}/review.css`);
  const provenance = JSON.parse(await read(`${workbenchDemo.directory}/provenance.json`));
  const data = JSON.parse(html.match(/<script id="dataset" type="application\/json">([^]*?)<\/script>/)[1]);
  assert.equal(data.records.length, 99);
  assert.equal(provenance.work_plan_records, data.records.length);
  assert.equal(provenance.dataset_id, data.dataset_id);
  assert.match(provenance.source_sha256, /^[a-f0-9]{64}$/);
  assert.match(provenance.source_normalized_sha256, /^[a-f0-9]{64}$/);
  assert.ok(data.records.every(row => /^asset_[a-f0-9]{16}$/.test(row.asset_id) && /^source_[a-f0-9]{16}$/.test(row.source_id)));
  assert.match(html, /Synthetic demonstration/);
  assert.match(html, /Use invented reviewer IDs and notes/);
  assert.match(html, /script-src 'self'; style-src 'self'/);
  assert.match(html, /connect-src 'none'/);
  assert.doesNotMatch(html, /unsafe-inline|<style>|<script>|\sstyle=|\son\w+=/);
  assert.doesNotMatch(js, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage)\b/);
  assert.match(html, /href="\.\.\/\.\.\/\.\.\/lead-service-line-evidence-workbench\/index\.html"/);
  for (const [name, source] of [['review.js', js], ['review.css', css]]) {
    const hash = createHash('sha256').update(source.replace(/\r\n?/g, '\n')).digest('hex').slice(0, 12);
    assert.ok(html.includes(`./${name}?v=${hash}`), `${name}: hash-versioned local dependency`);
  }
});

test('importing LF and CRLF source produces identical public assets and preserves original-byte provenance', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'portfolio-workbench-lf-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(join(directory, 'scripts'));
  const importer = join(directory, 'scripts', 'import-workbench-demo.mjs');
  await copyFile(new URL('../scripts/import-workbench-demo.mjs', import.meta.url), importer);
  const published = await read(`${workbenchDemo.directory}/index.html`);
  const dataset = published.match(/<script id="dataset" type="application\/json">([^]*?)<\/script>/)[1];
  const lf = `<!doctype html>\n<html><head><style>body {\ncolor: black;\n}</style></head><body>Synthetic demonstration\n<script id="dataset" type="application/json">${dataset}</script><script>\nconst example = 'synthetic';\n</script></body></html>\n`;
  const results = [];
  for (const source of [lf, lf.replaceAll('\n', '\r\n')]) {
    const input = join(directory, 'source.html');
    await writeFile(input, source);
    await promisify(execFile)(process.execPath, [importer, input]);
    const files = Object.fromEntries(await Promise.all(['index.html', 'review.css', 'review.js', 'provenance.json'].map(async name => [name, await readFile(join(directory, workbenchDemo.directory, name), 'utf8')])));
    const provenance = JSON.parse(files['provenance.json']);
    assert.equal(provenance.source_sha256, createHash('sha256').update(source).digest('hex'), 'Original bytes remain independently identifiable');
    assert.equal(provenance.source_normalized_sha256, createHash('sha256').update(lf).digest('hex'));
    for (const name of ['index.html', 'review.css', 'review.js']) assert.ok(!files[name].includes('\r'), `${name}: importer emits canonical LF`);
    results.push(files);
  }
  for (const name of ['index.html', 'review.css', 'review.js']) assert.equal(results[0][name], results[1][name], `${name}: input newline style does not change the public artifact`);
});

test('the native V3 case study exposes its live synthetic workbench without private source links', async () => {
  const html = await read(`dist/${workbenchDemo.project}/index.html`);
  assert.ok(html.includes(`href="../${workbenchDemo.directory}/index.html"`));
  assert.match(html, /99 review records/);
  assert.match(html, /480 invented asset-side snapshots/);
  assert.doesNotMatch(html, /https:\/\/github\.com\/efkopru\/lead-service-line-ml-gpt-v3/);
});

test('V3 screenshot encoding and metadata match the actual captured image', async () => {
  const [image] = screenshots[workbenchDemo.project];
  const bytes = await readFile(new URL(`../${image.src}`, import.meta.url));
  const published = await readFile(new URL(`../dist/${image.src}`, import.meta.url));
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(bytes.readUInt32BE(16), image.width);
  assert.equal(bytes.readUInt32BE(20), image.height);
  assert.ok(image.width > image.height && image.width <= 4000, 'An ordinary desktop viewport capture');
  assert.deepEqual(published, bytes);
  assert.match(image.caption, /synthetic/);
});
