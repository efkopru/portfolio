import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { projects } from '../content/portfolio.mjs';

const read = (directory, path) => readFile(new URL(`../${directory}/${path}`, import.meta.url), 'utf8');
const manifest = async directory => JSON.parse(await read(directory, 'build-manifest.json'));
const hiddenIds = [
  'lead-service-line-ocr', 's2s-transformer-bias-correction',
  'dask-ensemble-calibration', 'vit-heatwave-calibration', 'transformer-bias-correction'
];
const flagshipIds = ['utility-inspection-etl', 'accessibility-analysis', 'interactive-maps-a-custom-js-app'];

test('preview 404 stays within its review folder over HTTP and supports direct files', async () => {
  const html = await read('dist-preview', '404.html');
  const script = html.match(/<base href="\.\/"><script>(.*?)<\/script>/s)?.[1];
  assert.ok(script, '404 must resolve its relative navigation');
  for (const href of ['http://127.0.0.1:4173/preview/404.html', 'https://preview.example/404.html', 'file:///portfolio/preview/404.html']) {
    const base = { href: './' };
    const location = new URL(href);
    runInNewContext(script, { location, URL, document: { querySelector: selector => selector === 'base' ? base : null } });
    const resolved = new URL('index.html', new URL(base.href, href));
    assert.equal(resolved.href, new URL('./index.html', href).href);
  }
});

test('preview is a separate non-indexable site and leaves the main homepage unchanged', async () => {
  const [original, copiedOriginal, preview, previewManifest] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'), read('dist', 'index.html'),
    read('dist-preview', 'index.html'), manifest('dist-preview')
  ]);
  assert.equal(original, copiedOriginal, 'An alternate build must not overwrite the main index');
  assert.doesNotMatch(original, /\bdata-preview=["']true["']/);
  assert.match(preview, /<body\b[^>]*\bdata-preview=["']true["']/);
  assert.ok(previewManifest.pages.length > 20, 'Preview provides navigable project pages, not only an isolated home mockup');
  for (const path of previewManifest.pages) {
    const html = await read('dist-preview', path);
    assert.match(html, /<meta\b(?=[^>]*\bname=["']robots["'])(?=[^>]*\bcontent=["'][^"']*\bnoindex\b)[^>]*>/i, `${path}: noindex`);
    assert.doesNotMatch(html, /<link\b[^>]*\brel=["']canonical["']/i, `${path}: do not announce a production canonical for the preview`);
    assert.doesNotMatch(html, /<link\b[^>]*\brel=["']sitemap["']/i, `${path}: no sitemap discovery`);
  }
  assert.doesNotMatch(await read('dist-preview', 'robots.txt'), /Sitemap:/i, 'Preview robots does not announce a sitemap');
});

test('preview selected work connects all three career paths to inspectable case studies', async () => {
  const html = await read('dist-preview', 'index.html');
  const selected = html.match(/<section\b[^>]*\bid=["']selected-work["'][^>]*>[\s\S]*?<\/section>/)?.[0];
  assert.ok(selected, 'Give selected work a direct navigable section');
  for (const id of flagshipIds) assert.match(selected, new RegExp(`href=["'](?:\\./)?${id}/index\\.html["']`), id);
  assert.doesNotMatch(selected, /href=["']\/(?!\/)/, 'Selected-work links also work from a local folder');
  for (const id of hiddenIds) assert.ok(!html.includes(`${id}/index.html`), `Do not restore removed project ${id}`);
});

test('preview case studies explain the contribution and result before screenshots or embeds', async () => {
  for (const id of [...flagshipIds, 'lead-service-review-prototype']) {
    const html = await read('dist-preview', `${id}/index.html`);
    const start = html.search(/<section\b[^>]*\bclass=["'][^"']*\bpreview-case-summary\b/);
    assert.ok(start >= 0, `${id}: structured case summary`);
    const summary = html.slice(start).match(/^[\s\S]*?<\/section>/)[0];
    for (const label of ['Problem', 'My contribution', 'Result']) {
      assert.match(summary, new RegExp(`<h[23]\\b[^>]*>${label}</h[23]>`, 'i'), `${id}: ${label}`);
    }
    assert.doesNotMatch(summary, /<details\b/i, `${id}: do not hide the key summary in a disclosure`);
    assert.match(summary, /class=["']preview-tools["']/, `${id}: visible tools and methods`);
    for (const tool of projects.find(project => project.id === id).tools) {
      const escaped = tool.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
      assert.ok(summary.includes(`<li>${escaped}</li>`), `${id}: show ${tool}`);
    }
    const media = html.search(/<iframe\b|<section\b[^>]*\bclass=["'][^"']*\bgallery\b|<div\b[^>]*\bclass=["'][^"']*\bgallery\b/);
    if (media >= 0) assert.ok(start < media, `${id}: explain the work before media`);
  }
  const prototype = await read('dist-preview', 'lead-service-review-prototype/index.html');
  assert.match(prototype, /synthetic/i, 'The prototype must not be mistaken for production work');
});

test('preview keeps all four themes, versioned assets, and the accessible image viewer', async () => {
  const previewManifest = await manifest('dist-preview');
  const versions = new Map();
  for (const asset of ['theme.js', 'script.js', 'styles.css', 'preview.css']) {
    const content = await read('dist-preview', asset);
    versions.set(asset, createHash('sha256').update(content, 'utf8').digest('hex').slice(0, 12));
  }
  for (const path of previewManifest.pages) {
    const html = await read('dist-preview', path);
    assert.match(html, /data-theme-select/);
    for (const theme of ['classic', 'midnight', 'evergreen', 'sandstone']) assert.match(html, new RegExp(`<option\\b[^>]*value=["']${theme}["']`), `${path}: ${theme}`);
    for (const [asset, version] of versions) assert.ok(html.includes(`${asset}?v=${version}`), `${path}: use the actual preview ${asset} hash`);
    assert.match(html, /Skip to content/);
  }
  const script = await read('dist-preview', 'script.js');
  assert.match(script, /zoom/i);
  assert.match(script, /Escape/);
  assert.match(script, /close/i);
  assert.match(await read('dist-preview', 'spatial-analysis/index.html'), /data-image-viewer/);
});

test('candidate publication uses its explicit origin and keeps removed projects out of search discovery', async () => {
  const candidate = await manifest('dist-candidate');
  assert.match(candidate.origin, /^https:\/\//);
  const sitemap = await read('dist-candidate', 'sitemap.xml');
  assert.ok(sitemap.includes(candidate.origin));
  assert.doesNotMatch(sitemap, /\/preview\//, 'Candidate URLs are production routes, not the preview prefix');
  for (const id of hiddenIds) {
    assert.ok(!sitemap.includes(`/${id}/`), `${id}: exclude from sitemap`);
    const html = await read('dist-candidate', `${id}/index.html`);
    assert.match(html, /<meta\b(?=[^>]*\bname=["']robots["'])(?=[^>]*\bcontent=["'][^"']*\bnoindex\b)[^>]*>/i, `${id}: retained direct route is non-indexable`);
  }
  for (const id of flagshipIds) {
    const html = await read('dist-candidate', `${id}/index.html`);
    assert.doesNotMatch(html, /<meta\b(?=[^>]*\bname=["']robots["'])(?=[^>]*\bcontent=["'][^"']*\bnoindex\b)[^>]*>/i, `${id}: publishable case study is indexable`);
    assert.ok(html.includes(`href="${candidate.origin}/${id}/"`), `${id}: canonical uses the explicit origin`);
    assert.match(html, /property=["']og:image["']/);
    assert.match(html, /name=["']twitter:image["']/);
  }
});

test('preview contains no root-relative internal navigation or missing local destinations', async () => {
  const previewManifest = await manifest('dist-preview');
  for (const path of previewManifest.pages) {
    const html = await read('dist-preview', path);
    for (const tag of html.match(/<[^>]+>/g) || []) {
      for (const [, raw] of tag.matchAll(/(?:href|src)=["']([^"']+)["']/g)) {
        if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(raw)) continue;
        assert.ok(!raw.startsWith('/'), `${path}: relative local URL ${raw}`);
        const destination = new URL(raw.replaceAll('&amp;', '&'), `https://preview.local/${path}`);
        const localPath = decodeURIComponent(destination.pathname.slice(1));
        await assert.doesNotReject(access(new URL(`../dist-preview/${localPath.endsWith('/') ? `${localPath}index.html` : localPath}`, import.meta.url)), `${path}: ${raw}`);
      }
    }
  }
});
