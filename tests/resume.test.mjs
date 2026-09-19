import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resumeDocument } from '../content/resume.mjs';

const source = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const previewUrl = 'https://docs.google.com/document/d/19waV_6Qamkq_gO7rYNVEN7W9C8VLUpUc/preview';
const attributes = tag => Object.fromEntries([...tag.matchAll(/\s([\w-]+)="([^"]*)"/g)].map(match => [match[1], match[2]]));
const mainContent = html => {
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1];
  assert.ok(main, 'The Resume page retains its main content region');
  return main;
};

test('resume uses the original Google document preview without an editing endpoint', () => {
  assert.equal(resumeDocument.previewUrl, previewUrl);
  assert.equal(resumeDocument.openUrl, undefined);
  for (const url of [resumeDocument.previewUrl]) {
    const parsed = new URL(url);
    assert.equal(parsed.origin, 'https://docs.google.com');
    assert.ok(parsed.pathname.endsWith('/preview'));
    assert.equal(parsed.search, '');
    assert.equal(parsed.hash, '');
    assert.doesNotMatch(url, /\/(?:edit|copy)(?:[/?#]|$)|(?:[?&])(?:usp|authuser|role)=/);
  }
});

test('generated resume pages retain their route, navigation, and a single accessible Google preview', async () => {
  const [rootHtml, builtHtml, manifestText] = await Promise.all([
    source('resume/index.html'), source('dist/resume/index.html'), source('dist/build-manifest.json')
  ]);
  const manifest = JSON.parse(manifestText);
  assert.equal(rootHtml, builtHtml, 'Local-file and built Resume pages remain identical');
  assert.ok(manifest.pages.includes('resume/index.html'));
  for (const html of [rootHtml, builtHtml]) {
    assert.ok(html.includes(`<link rel="canonical" href="${manifest.origin}/resume/">`));
    assert.match(html, /<title>Resume \| Esad Kopru<\/title>/);
    const nav = html.match(/<nav\b[^>]*id="site-nav"[^>]*>[\s\S]*?<\/nav>/)?.[0];
    assert.ok(nav);
    assert.match(nav, /<a\b(?=[^>]*href="\.\.\/resume\/index\.html")(?=[^>]*aria-current="page")[^>]*>Resume<\/a>/);
    const main = mainContent(html);
    assert.match(main, /class="[^"]*\bresume-page\b[^"]*"/);
    assert.match(main, /<h1\b[^>]*>Resume<\/h1>/);
    const frames = [...main.matchAll(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/g)];
    assert.equal(frames.length, 1, 'Exactly one document preview replaces the maintained HTML resume');
    const frame = attributes(frames[0][0].match(/^<iframe\b[^>]*>/)[0]);
    assert.equal(frame.src, previewUrl);
    assert.equal(frame.title, 'Esad Kopru resume');
    assert.equal(frame.referrerpolicy, 'no-referrer');
    assert.match(frame.class, /(?:^|\s)resume-frame(?:\s|$)/);
    assert.equal(frame.srcdoc, undefined);
    assert.doesNotMatch(main, /<h[1-6]\b[^>]*>\s*(?:Profile|Technical skills|Professional experience|Education|Certifications(?: &amp; recognition)?)\s*<\/h[1-6]>/i,
      'The page must not keep a second, separately maintained resume');
  }
});

test('resume loads the preview directly without an Open resume or external link', async () => {
  for (const path of ['resume/index.html', 'dist/resume/index.html']) {
    const main = mainContent(await source(path));
    assert.doesNotMatch(main, /Open resume/i, `${path}: the separate Open resume control is removed`);
    const links = [...main.matchAll(/<a\b[^>]*>/g)].map(match => attributes(match[0]));
    assert.ok(links.every(link => !/^(?:https?:)?\/\//i.test(link.href ?? '')),
      `${path}: the resume content has no external anchor`);
    assert.match(main, /<iframe\b[^>]*\ssrc="https:\/\/docs\.google\.com\/document\/d\/19waV_6Qamkq_gO7rYNVEN7W9C8VLUpUc\/preview"/);
    assert.doesNotMatch(main, /<details\b|data-load-embed|data-embed-src|<script\b/i,
      `${path}: the document does not depend on an expansion or script`);
  }
});

test('resume frame has scoped responsive sizing in both CSS outputs', async () => {
  const css = await source('styles.css');
  assert.equal(css, await source('dist/styles.css'));
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(rule => rule[1].includes('.resume-frame'));
  assert.ok(rules.length > 0, 'The resume frame has its own style rule');
  for (const rule of rules) {
    assert.ok(rule[1].trim().split(',').every(selector => selector.trim().includes('.resume-frame')),
      'Resume frame changes do not resize unrelated embedded maps');
  }
  const base = rules.find(rule => rule[1].trim() === '.resume-frame')?.[2];
  assert.ok(base);
  assert.match(base, /(?:^|;)\s*width:\s*75%\s*(?:;|$)/);
  assert.match(base, /(?:^|;)\s*margin-inline:\s*auto\s*(?:;|$)/);
  assert.match(base, /(?:^|;)\s*display:\s*block\s*(?:;|$)/,
    'Auto inline margins center the reduced-width frame');
  const height = base.match(/(?:^|;)\s*height:\s*clamp\((\d+(?:\.\d+)?)rem,\s*(\d+(?:\.\d+)?)vh,\s*(\d+(?:\.\d+)?)rem\)\s*(?:;|$)/);
  assert.ok(height, 'The frame retains responsive minimum, viewport, and maximum heights');
  const dimensions = height.slice(1).map(Number);
  const previousDimensions = [24, 58.5, 52.5];
  const withinTolerance = (actual, expected, message) =>
    assert.ok(Math.abs(actual - expected) < 1e-9, `${message}: expected ${expected}, received ${actual}`);
  dimensions.forEach((value, index) => withinTolerance(value, previousDimensions[index] * 1.2,
    'Every height constraint is increased by 20%'));
  const clampHeight = ([minimum, viewport, maximum], viewportHeight) =>
    Math.max(minimum * 16, Math.min(viewport * viewportHeight / 100, maximum * 16));
  for (const viewportHeight of [400, 1000, 2000]) {
    withinTolerance(clampHeight(dimensions, viewportHeight), clampHeight(previousDimensions, viewportHeight) * 1.2,
      `The computed frame height remains 20% taller at a ${viewportHeight}px viewport height`);
  }
  const header = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find(rule => rule[1].trim() === '.resume-header')?.[2];
  assert.ok(header, 'The resume heading retains its scoped layout rule');
  assert.match(header, /(?:^|;)\s*width:\s*75%\s*(?:;|$)/);
  assert.match(header, /(?:^|;)\s*margin-inline:\s*auto\s*(?:;|$)/,
    'The resume heading aligns with the centered, reduced-width frame');
  assert.match(base, /(?:^|;)\s*border:\s*[^;]+/);
  assert.doesNotMatch(base, /(?:^|;)\s*min-width:\s*\d+(?:px|rem)/);
});

test('published security policy permits only the specific Google frame origin and existing maps', async () => {
  const rootHeaders = await source('_headers');
  assert.equal(rootHeaders, await source('dist/_headers'));
  const policy = rootHeaders.match(/Content-Security-Policy:\s*([^\r\n]+)/)?.[1];
  assert.ok(policy);
  const directives = policy.split(';').map(value => value.trim()).filter(Boolean);
  const frameDirectives = directives.filter(value => value.startsWith('frame-src '));
  assert.equal(frameDirectives.length, 1);
  const allowed = frameDirectives[0].split(/\s+/).slice(1);
  assert.deepEqual(allowed.toSorted(), [
    'https://maps.cityoflewisville.com',
    'https://experience.arcgis.com',
    'https://lewisville.maps.arcgis.com',
    'https://www.arcgis.com',
    'https://docs.google.com'
  ].toSorted(), 'Google Docs adds one exact origin without wildcard or scheme-wide permissions');
  assert.ok(directives.includes("default-src 'self'"));
  assert.ok(directives.includes("object-src 'none'"));
  assert.ok(directives.includes("frame-ancestors 'none'"));
  assert.ok(directives.includes('connect-src https://formsubmit.co'));
});

test('direct privacy page discloses the automatically loaded Google resume separately from click-to-load maps', async () => {
  for (const path of ['privacy/index.html', 'dist/privacy/index.html']) {
    const main = mainContent(await source(path));
    assert.match(main, /Resume page embeds Google Docs and connects to Google when you open the page/);
    assert.match(main, /Other external services load only when you follow a link, submit the contact form, or select Load interactive application/);
  }
});
